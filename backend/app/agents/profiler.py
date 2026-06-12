"""画像师 Agent — 评估学生能力和学习风格（含入学摸底测）"""

import json
import re

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from loguru import logger
from app.agents import AgentState, get_llm, END
from app.deps import LLMConfig
from app.services.memory import build_context_summary, get_conversation_window

PROFILER_PROMPT = """你是一个学习能力评估专家（Profiler Agent）。
你的职责是通过摸底测验与对话了解学生的：
1. 当前知识水平（beginner/intermediate/advanced）
2. 学习风格偏好（visual 视觉型/practical 实践型/theoretical 理论型/balanced 均衡型）
3. 学习目标
4. 已有知识基础

当前已知信息：{profile}

评估策略：
- 若对话中已有「学习检测」摸底测验且用户刚提交了作答（如"第1题我选 A"）：
  逐题对照正确答案判分，立即输出 ASSESSMENT 评估结果，不要再追问：
  * 答对题目的考察知识点写入 strengths，答错题目的考察知识点写入 weaknesses（均写知识点名称）
  * goals 从用户此前的消息中提取学习目标（如"编程能力评估"对应想学的领域）
  * level 按答对题数推断：0-2 题 beginner，3-4 题 intermediate，5 题 advanced
  * style 根据对话风格推断，无明显信号时填 balanced
- 其他情况：通过 2-3 个针对性问题快速评估，问题自然友好，不要直接问"你是什么水平"；
  信息足够（至少知道水平和目标）时输出 ASSESSMENT，不足则继续提问。

ASSESSMENT 输出格式（必须严格遵守）：
ASSESSMENT:
- level: beginner/intermediate/advanced
- style: visual/practical/theoretical/balanced
- goals: [目标列表]
- strengths: [已掌握的知识点名]
- weaknesses: [待提升的知识点名]"""

QUIZ_GEN_PROMPT = """你是一个学习能力评估专家（Profiler Agent）。用户希望进行能力摸底评估。
请围绕用户消息中的目标领域出 5 道分层选择题，由易到难，覆盖该领域基础知识。
只输出 JSON（不要包含其他任何内容）：
{"questions": [{"question": "题干（单行，不要换行）", "options": ["A. 选项", "B. 选项", "C. 选项", "D. 选项"], "answer": "A", "knowledge_point": "考察的知识点名称"}]}
要求：恰好 5 题；每题 4 个选项且以 A. B. C. D. 开头；answer 为正确选项字母。"""

# 评估意图关键词（首次评估请求判定）
_ASSESS_INTENT_KEYWORDS = ("评估", "摸底", "测一测", "测测我", "能力测试", "水平测试")

# 静态兜底题库：Python 通用 5 题（由易到难），LLM 出题失败时保证演示零冷场
STATIC_QUIZ: list[dict] = [
    {
        "question": "在 Python 中，用于在屏幕上输出内容的函数是？",
        "options": ["A. print()", "B. echo()", "C. printf()", "D. console.log()"],
        "answer": "A",
        "knowledge_point": "基础语法与输出",
    },
    {
        "question": "下列哪个是合法的 Python 变量名？",
        "options": ["A. 2name", "B. my-name", "C. my_name", "D. class"],
        "answer": "C",
        "knowledge_point": "变量与命名规则",
    },
    {
        "question": "len([1, 2, 3]) 的返回值是？",
        "options": ["A. 2", "B. 3", "C. 4", "D. 报错"],
        "answer": "B",
        "knowledge_point": "列表与内置函数",
    },
    {
        "question": "执行 list(range(3)) 的结果是？",
        "options": ["A. [1, 2, 3]", "B. [0, 1, 2]", "C. [0, 1, 2, 3]", "D. (0, 1, 2)"],
        "answer": "B",
        "knowledge_point": "range 与循环基础",
    },
    {
        "question": "表达式 [x * x for x in range(4) if x % 2 == 0] 的结果是？",
        "options": ["A. [0, 4]", "B. [1, 9]", "C. [0, 1, 4, 9]", "D. [4, 16]"],
        "answer": "A",
        "knowledge_point": "列表推导式",
    },
]


def _is_assessment_request(text: str) -> bool:
    """判断用户消息是否为能力评估请求"""
    return any(kw in text for kw in _ASSESS_INTENT_KEYWORDS)


def _validate_quiz(result: dict | None) -> list | None:
    """校验 LLM 出题结果：恰好 5 题、选项以 A-D 开头、答案合法"""
    questions = (result or {}).get("questions")
    if not isinstance(questions, list) or len(questions) != 5:
        return None
    for q in questions:
        if not isinstance(q, dict) or not str(q.get("question", "")).strip():
            return None
        options = q.get("options") or []
        if len(options) < 2 or not all(re.match(r"^[A-D][.．、]", str(o).strip()) for o in options):
            return None
        if str(q.get("answer", "")).strip().upper() not in {"A", "B", "C", "D"}:
            return None
        # 考点缺失时退化为题干前缀，保证 strengths/weaknesses 有名可写
        q.setdefault("knowledge_point", str(q["question"]).strip()[:16])
    return questions


async def _generate_quiz_questions(llm, user_message: str) -> list:
    """LLM 出 5 道分层快测题，失败或格式不合法时回退静态题库"""
    try:
        response = await llm.ainvoke(
            [
                SystemMessage(content=QUIZ_GEN_PROMPT),
                HumanMessage(content=user_message),
            ],
            # internal 标记：阻止出题 JSON 的 token 流式泄漏到前端聊天气泡
            config={"tags": ["internal"]},
        )
        content = response.content
        start, end = content.find("{"), content.rfind("}") + 1
        result = json.loads(content[start:end]) if 0 <= start < end else None
        questions = _validate_quiz(result)
        if questions:
            return questions
        logger.warning("摸底测验 LLM 出题格式不合法，使用静态题库兜底")
    except Exception as e:
        logger.warning(f"摸底测验 LLM 出题失败，使用静态题库兜底: {e}")
    return STATIC_QUIZ


def _format_quiz_message(questions: list) -> str:
    """格式化摸底测验（与前端 QuizCard 的 parseQuizFromContent 解析格式对齐）

    格式约束：含「学习检测」字样；题干为单行且紧跟 **第 N 题** 行；选项行以 A-D. 开头。
    """
    lines = [
        "📝 **学习检测 · 能力摸底评估**",
        "",
        "在为你定制学习路径前，先完成 5 道由易到难的小题（约 1 分钟）：",
        "",
    ]
    for i, q in enumerate(questions, 1):
        lines.append(f"**第 {i} 题**")
        lines.append(" ".join(str(q["question"]).split()))  # 压成单行，确保前端取首行为完整题干
        lines.extend(str(opt).strip() for opt in q["options"])
        lines.append("")
    lines.append("请直接作答提交，我会根据答题情况生成你的能力画像。")
    return "\n".join(lines)


def _build_answer_key(questions: list) -> dict:
    """生成判分用答案要点（写入 metadata，第二轮评估时注入系统提示）"""
    return {
        f"q{i}": {"answer": q["answer"], "knowledge_point": q["knowledge_point"]}
        for i, q in enumerate(questions, 1)
    }


async def profiler_node(state: AgentState) -> dict:
    """画像师节点：首次评估请求发放摸底测验，其余情况对话式评估"""
    config = LLMConfig(**state.get("llm_config", {}))
    llm = get_llm(config, temperature=0.7)

    profile = state.get("user_profile", {})
    last_user = next((m.content for m in reversed(state["messages"]) if m.type == "human"), "")

    # 首次评估请求：不再纯聊天提问，直接发放 5 道分层摸底快测题（前端 QuizCard 渲染）
    if not profile and _is_assessment_request(last_user):
        questions = await _generate_quiz_questions(llm, last_user)
        return {
            "messages": [AIMessage(content=_format_quiz_message(questions), name="profiler")],
            "next_agent": END,
            "metadata": {**state.get("metadata", {}), "profiler_quiz": _build_answer_key(questions)},
            "agent_outputs": {
                **state.get("agent_outputs", {}),
                "profiler": "已发放摸底测验",
            },
        }

    context_summary = build_context_summary(state)
    system_content = PROFILER_PROMPT.format(profile=profile or "暂无") + f"\n\n--- 当前上下文 ---\n{context_summary}"
    # 注入摸底测验答案要点，保证第二轮按答题情况判分的准确性
    quiz_key = state.get("metadata", {}).get("profiler_quiz") or {}
    if quiz_key:
        system_content += (
            "\n\n--- 摸底测验答案与考点（仅用于判分，不要透露给用户）---\n"
            + json.dumps(quiz_key, ensure_ascii=False)
        )
    system_msg = SystemMessage(content=system_content)

    recent_messages = get_conversation_window(state["messages"])
    response = await llm.ainvoke([system_msg] + list(recent_messages))
    content = response.content

    # 检查是否产出了评估结果
    updated_profile = state.get("user_profile", {})
    if "ASSESSMENT:" in content or "assessment:" in content.lower():
        updated_profile = _parse_assessment(content, updated_profile)
        summary = _generate_profile_summary(updated_profile)
        # 判分完成后清除摸底题答案要点，避免永久污染后续 profiler 调用
        # （否则「重新评估」时 LLM 仍被注入陈旧题目，可能误当作待判分作答）
        cleaned_metadata = {k: v for k, v in state.get("metadata", {}).items() if k != "profiler_quiz"}
        return {
            "messages": [AIMessage(content=summary, name="profiler")],
            "user_profile": updated_profile,
            "next_agent": END,
            "metadata": cleaned_metadata,
            "agent_outputs": {
                **state.get("agent_outputs", {}),
                "profiler": "评估完成",
            },
        }

    return {
        "messages": [AIMessage(content=content, name="profiler")],
        "next_agent": END,
        "agent_outputs": {
            **state.get("agent_outputs", {}),
            "profiler": "收集信息中",
        },
    }


def _parse_assessment(content: str, existing: dict) -> dict:
    """从 Agent 输出解析评估结果"""
    profile = {**existing}
    lines = content.lower().split("\n")
    for line in lines:
        if "level:" in line:
            for level in ["beginner", "intermediate", "advanced"]:
                if level in line:
                    profile["knowledge_level"] = level
                    break
        elif "style:" in line:
            for style in ["visual", "practical", "theoretical", "balanced"]:
                if style in line:
                    profile["learning_style"] = style
                    break
        elif "goals:" in line:
            # 提取冒号后的内容，按逗号或顿号分隔
            parts = line.split("goals:", 1)
            if len(parts) > 1:
                raw = parts[1].strip().strip("[]")
                items = [s.strip() for s in raw.replace("、", ",").split(",") if s.strip()]
                if items:
                    profile["goals"] = items
        elif "strengths:" in line:
            parts = line.split("strengths:", 1)
            if len(parts) > 1:
                raw = parts[1].strip().strip("[]")
                items = [s.strip() for s in raw.replace("、", ",").split(",") if s.strip()]
                if items:
                    profile["strengths"] = items
        elif "weaknesses:" in line:
            parts = line.split("weaknesses:", 1)
            if len(parts) > 1:
                raw = parts[1].strip().strip("[]")
                items = [s.strip() for s in raw.replace("、", ",").split(",") if s.strip()]
                if items:
                    profile["weaknesses"] = items
    return profile


def _generate_profile_summary(profile: dict) -> str:
    """生成画像总结"""
    level_map = {"beginner": "入门", "intermediate": "中级", "advanced": "高级"}
    style_map = {"visual": "视觉型", "practical": "实践型", "theoretical": "理论型", "balanced": "均衡型"}

    level = level_map.get(profile.get("knowledge_level", ""), "待评估")
    style = style_map.get(profile.get("learning_style", ""), "待评估")

    lines = [
        "好的，我对你的学习情况有了初步了解！\n",
        "📊 **能力评估**",
        f"- 当前水平：{level}",
        f"- 学习风格：{style}",
    ]
    strengths = profile.get("strengths") or []
    weaknesses = profile.get("weaknesses") or []
    if strengths:
        lines.append(f"- 已掌握：{'、'.join(strengths[:5])}")
    if weaknesses:
        lines.append(f"- 待提升：{'、'.join(weaknesses[:5])}")
    lines.append("\n接下来我可以为你规划个性化的学习路径。你想学习什么内容呢？")
    return "\n".join(lines)
