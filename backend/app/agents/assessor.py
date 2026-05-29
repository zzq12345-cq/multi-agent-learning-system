"""评估师 Agent — 学习效果评估"""

import json
from langchain_core.messages import AIMessage, SystemMessage
from app.agents import AgentState, get_llm, END
from app.deps import LLMConfig
from app.services.learning_engine import complete_node
from app.services.memory import build_context_summary, get_conversation_window

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
  "feedback": "总体反馈",
  "weak_points": ["薄弱知识点"],
  "suggestions": ["学习建议"]
}}
```

学生画像：{profile}
当前知识点：{node}"""


async def assessor_node(state: AgentState) -> dict:
    """评估师节点：生成测试或评判答案"""
    config = LLMConfig(**state.get("llm_config", {}))
    llm = get_llm(config, temperature=0.5)

    profile = state.get("user_profile", {})
    current_node = state.get("current_node", {})

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
        formatted = _format_quiz(result)
    else:
        formatted = content

    # 更新节点状态
    node_states = state.get("node_states", {})
    current = state.get("current_node", {})
    learning_path = state.get("learning_path", {})

    if result and "score" in result and current and current.get("id"):
        score = result.get("score", 0)
        if score >= 60:  # 60 分及格，标记完成
            node_states = complete_node(current["id"], score, learning_path, node_states)

    return {
        "messages": [AIMessage(content=formatted, name="assessor")],
        "node_states": node_states,
        "next_agent": END,
        "agent_outputs": {
            **state.get("agent_outputs", {}),
            "assessor": "评估完成",
        },
        "metadata": {
            **state.get("metadata", {}),
            "last_assessment": result,
        },
    }


def _try_parse_json(content: str) -> dict | None:
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
