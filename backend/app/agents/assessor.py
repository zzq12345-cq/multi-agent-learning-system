"""评估师 Agent — 学习效果评估"""

import json
import os
from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from loguru import logger
from app.agents import AgentState, get_llm, END
from app.deps import LLMConfig
from app.services.learning_engine import complete_node, find_node_by_name, select_current_node
from app.services.mastery import record_assessment
from app.services.memory import build_context_summary, get_conversation_window
from app.services.reflection import parse_review_verdict, review_quiz_rules

ASSESSOR_PROMPT = """你是一个学习评估专家（Assessor Agent）。
你的职责是评估学生的学习效果，生成测试题，并给出反馈。

评估模式：
1. **快速测试**：3-5 道选择题/填空题，快速检验理解
2. **深度评估**：包含分析题、编程题，全面评估掌握程度
3. **答案评判**：对学生提交的答案进行评分和反馈

生成题目时，输出 JSON 格式：
```json
{{
  "quiz_type": "quick",
  "questions": [
    {{
      "id": "q1",
      "type": "choice",
      "question": "题目内容",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "A",
      "explanation": "解析",
      "difficulty": 1,
      "knowledge_point": "考察的知识点"
    }}
  ]
}}
```

评判答案时，输出：
```json
{{
  "score": 80,
  "correct_count": 4,
  "total_count": 5,
  "knowledge_point": "本次评估对应的知识点名称（与学习路径节点名一致）",
  "feedback": "总体反馈",
  "weak_points": ["薄弱知识点"],
  "suggestions": ["学习建议"]
}}
```

学生画像：{profile}
当前知识点：{node}"""

REVIEWER_PROMPT = """你是一位资深导师（Peer Reviewer），正在对评估师刚出的题目进行同行审查。
学生水平：{level}

请逐题检查：
1. 答案正确性：标注的 answer 是否确实正确
2. 难度匹配：难度是否与学生水平匹配
3. 表述清晰：题干与选项是否清晰、无歧义

只输出 JSON（不要其他内容）：
{{"verdict": "pass", "issues": []}}
或
{{"verdict": "revise", "issues": ["具体问题描述"]}}"""


async def assessor_node(state: AgentState) -> dict:
    """评估师节点：生成测试或评判答案"""
    config = LLMConfig(**state.get("llm_config", {}))
    llm = get_llm(config, temperature=0.5)

    profile = state.get("user_profile", {})
    learning_path = state.get("learning_path", {})
    node_states = state.get("node_states", {})
    mastery_data = state.get("mastery_data", {})
    current_node = state.get("current_node", {})

    # 用户消息中显式提到某个知识点时，切换当前节点（locked 节点除外）
    user_query = state["messages"][-1].content if state["messages"] else ""
    matched = find_node_by_name(user_query, learning_path, node_states)
    if matched:
        current_node = matched

    context_summary = build_context_summary(state)
    system_msg = SystemMessage(content=ASSESSOR_PROMPT.format(
        profile=_format_profile(profile),
        node=current_node.get("name", "综合") if current_node else "综合",
    ) + f"\n\n--- 当前上下文 ---\n{context_summary}")

    recent_messages = get_conversation_window(state["messages"])
    response = await llm.ainvoke([system_msg] + list(recent_messages))
    content = response.content

    result = _try_parse_json(content)

    if result and "score" in result:
        formatted = _format_score_result(result)
    elif result and "questions" in result:
        # 出题互审：L0 规则质检 → L1 LLM 审题 →（不过则退回重出一次）
        if _peer_review_enabled():
            content, result = await _run_peer_review(
                llm,
                base_messages=[system_msg] + list(recent_messages),
                content=content, result=result, profile=profile,
            )
        formatted = _format_quiz(result)
    else:
        # 兜底：如果 JSON 解析失败但内容明显是题目格式，尝试宽松解析
        if '"questions"' in content and '"options"' in content:
            logger.warning("评估师输出 JSON 解析失败，尝试宽松提取")
            formatted = _fallback_format_quiz(content)
        else:
            formatted = content

    # 评分后更新掌握度与节点状态
    metadata = {**state.get("metadata", {}), "last_assessment": result}
    if result and "score" in result:
        if not current_node.get("id"):
            current_node = _resolve_assessment_node(result, learning_path, node_states)
        if current_node.get("id"):
            score = result.get("score", 0)
            mastery_data = record_assessment(mastery_data, current_node["id"], score)
            if score >= 60:  # 60 分及格，标记完成并解锁后续节点
                node_states = complete_node(current_node["id"], score, learning_path, node_states)
                # 推进到下一个可学节点
                current_node = select_current_node(learning_path, node_states)

            # 自适应触发：得分低于 60 且存在薄弱点，通知规划师插入补强节点
            weak_points = result.get("weak_points", [])
            if score < 60 and weak_points and learning_path.get("nodes"):
                metadata["adaptation_trigger"] = {
                    "reason": "assessment_low_score",
                    "score": score,
                    "node_id": current_node.get("id", ""),
                    "node_name": current_node.get("name", ""),
                    "weak_points": weak_points,
                    "suggestions": result.get("suggestions", []),
                }
                logger.info(f"自适应触发：{current_node.get('name')} 得分 {score}，薄弱点: {weak_points}")

    return {
        "messages": [AIMessage(content=formatted, name="assessor")],
        "node_states": node_states,
        "mastery_data": mastery_data,
        "current_node": current_node,
        "next_agent": END,
        "agent_outputs": {
            **state.get("agent_outputs", {}),
            "assessor": "评估完成",
        },
        "metadata": metadata,
    }


def _peer_review_enabled() -> bool:
    """PEER_REVIEW 环境开关：默认开启，off/0/false 时跳过审查（演示降级保险）"""
    return os.environ.get("PEER_REVIEW", "on").lower() not in ("off", "0", "false")


async def _dispatch_review_event(verdict: str, issues: list, round_num: int) -> None:
    """派发互审 WS 自定义事件；无 runnable 上下文（如单测直调）时静默跳过"""
    try:
        await adispatch_custom_event(
            "review_verdict",
            {"verdict": verdict, "issues": issues, "round": round_num},
        )
    except RuntimeError:
        pass


async def _llm_review(llm, result: dict, profile: dict) -> dict:
    """L1 轻量 LLM 审题（导师视角），调用失败时默认放行不阻塞出题"""
    level = (profile or {}).get("knowledge_level", "intermediate")
    messages = [
        SystemMessage(content=REVIEWER_PROMPT.format(level=level)),
        HumanMessage(content=json.dumps(result, ensure_ascii=False)),
    ]
    try:
        response = await llm.ainvoke(messages)
    except Exception as e:
        logger.warning(f"L1 审题调用失败，默认放行: {e}")
        return {"verdict": "pass", "issues": []}
    return parse_review_verdict(response.content)


async def _regenerate_quiz(llm, *, base_messages, content, issues) -> tuple[str, dict | None]:
    """按审查意见退回重出一次（重出后不再复审，直接放行）"""
    feedback = HumanMessage(content=(
        "你刚出的题目未通过同行审查，问题如下：\n- " + "\n- ".join(issues)
        + "\n请修正以上问题，重新输出完整的题目 JSON（保持原格式，不要输出其他内容）。"
    ))
    response = await llm.ainvoke(base_messages + [AIMessage(content=content), feedback])
    return response.content, _try_parse_json(response.content)


async def _run_peer_review(llm, *, base_messages, content, result, profile) -> tuple[str, dict]:
    """出题互审子流程：L0 规则质检 → L1 LLM 审题 →（不过则退回重出，≤1 轮封顶）"""
    l0 = review_quiz_rules(result)
    if l0["pass"]:
        l1 = await _llm_review(llm, result, profile)
        verdict, issues = l1["verdict"], l1["issues"]
    else:
        verdict, issues = "revise", l0["issues"]

    if verdict == "pass":
        await _dispatch_review_event("pass", [], 1)
        return content, result

    await _dispatch_review_event("revise", issues, 1)
    logger.info(f"出题互审未通过，退回重出: {issues}")
    new_content, new_result = await _regenerate_quiz(
        llm, base_messages=base_messages, content=content, issues=issues,
    )
    # 先校验重出结果再宣告通过，避免解析失败沿用原题时前端误显示「已重新出题」
    if new_result and "questions" in new_result:
        await _dispatch_review_event("pass", [], 2)
        return new_content, new_result
    await _dispatch_review_event("pass", ["重出解析失败，沿用原题放行"], 2)
    return content, result  # 重出解析失败时保底沿用原题


def _resolve_assessment_node(result: dict, learning_path: dict, node_states: dict) -> dict:
    """评分兜底归因：优先按 knowledge_point 名称匹配（排除 locked 节点）

    名称无法匹配任何节点时，仅当首个可学节点确为 in_progress 才归因到它，
    避免把综合测评分数错误记到尚未开始的节点并连带其完成与级联解锁。
    """
    matched = find_node_by_name(result.get("knowledge_point", ""), learning_path, node_states)
    if matched.get("id"):
        return matched
    candidate = select_current_node(learning_path, node_states)
    cid = candidate.get("id")
    if cid and node_states.get(cid, {}).get("status") == "in_progress":
        return candidate
    return {}


def _try_parse_json(content: str) -> dict | None:
    """从 LLM 回复中提取 JSON（兼容 markdown 代码块包裹）"""
    # 先尝试去掉 ```json ... ``` 包裹
    cleaned = content
    if "```" in content:
        import re
        match = re.search(r'```(?:json)?\s*\n?(.*?)\n?\s*```', content, re.DOTALL)
        if match:
            cleaned = match.group(1)
    try:
        start = cleaned.find("{")
        end = cleaned.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(cleaned[start:end])
    except (json.JSONDecodeError, ValueError):
        pass
    # 原始内容再试一次（没有代码块的情况）
    if cleaned is not content:
        try:
            start = content.find("{")
            end = content.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(content[start:end])
        except (json.JSONDecodeError, ValueError):
            pass
    return None


def _format_quiz(quiz: dict) -> str:
    questions = quiz.get("questions", [])
    lines = ["📝 **学习检测**\n"]
    for i, q in enumerate(questions, 1):
        lines.append(f"**第 {i} 题** ({q.get('type', '选择')})")
        lines.append(q.get("question", ""))
        if q.get("options"):
            for opt in q["options"]:
                lines.append(f"  {opt}")
        lines.append("")
    lines.append("请回答以上问题，我会为你评分并给出反馈。")
    return "\n".join(lines)


def _fallback_format_quiz(content: str) -> str:
    """JSON 解析失败时的宽松提取：用正则逐题提取 question + options"""
    import re
    questions = re.findall(r'"question"\s*:\s*"([^"]+)"', content)
    options_blocks = re.findall(r'"options"\s*:\s*\[(.*?)\]', content, re.DOTALL)

    if not questions:
        return "📝 正在生成测试题，请稍候再试..."

    lines = ["📝 **学习检测**\n"]
    for i, q in enumerate(questions):
        lines.append(f"**第 {i + 1} 题**")
        lines.append(q)
        if i < len(options_blocks):
            opts = re.findall(r'"([^"]+)"', options_blocks[i])
            for opt in opts:
                lines.append(f"  {opt}")
        lines.append("")
    lines.append("请回答以上问题，我会为你评分并给出反馈。")
    return "\n".join(lines)


def _format_score_result(result: dict) -> str:
    score = result.get("score", 0)
    emoji = "🎉" if score >= 80 else "💪" if score >= 60 else "📚"
    return (
        f"{emoji} **评估结果：{score} 分**\n\n"
        f"正确率：{result.get('correct_count', '?')}/{result.get('total_count', '?')}\n\n"
        f"**反馈**：{result.get('feedback', '')}\n\n"
        f"**薄弱点**：{', '.join(result.get('weak_points', ['无']))}\n\n"
        f"**建议**：{'; '.join(result.get('suggestions', ['继续加油']))}"
    )


def _format_profile(profile: dict) -> str:
    if not profile:
        return "未建立"
    level = profile.get("knowledge_level", "intermediate")
    style = profile.get("learning_style", "balanced")
    return f"水平: {level}, 风格: {style}"
