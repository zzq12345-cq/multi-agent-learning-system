"""导师 Agent — 实时答疑和引导"""

from langchain_core.messages import AIMessage, SystemMessage
from app.agents import AgentState, get_llm, END
from app.deps import LLMConfig

TUTOR_PROMPT = """你是一个耐心且专业的 Python 学习导师（Tutor Agent）。
你的职责是回答学生的问题、解释概念、引导思考。

教学风格：
1. 苏格拉底式引导：不直接给答案，通过提问引导学生思考
2. 类比教学：用生活中的例子解释抽象概念
3. 分层解释：先给简单直觉，再深入细节
4. 鼓励式反馈：肯定学生的思考过程

回答原则：
- 先确认理解了学生的问题
- 根据学生水平调整解释深度
- 如果问题涉及代码，给出可运行的示例
- 适时提出引导性问题，促进深度理解
- 如果学生明显困惑，主动简化解释

学生画像：{profile}
当前学习内容：{context}

注意：你的回答应该像一个好老师在一对一辅导，温暖、专业、有耐心。"""


async def tutor_node(state: AgentState) -> dict:
    """导师节点：答疑解惑"""
    config = LLMConfig(**state.get("llm_config", {}))
    llm = get_llm(config, temperature=0.7)

    profile = state.get("user_profile", {})
    current_node = state.get("current_node", {})
    learning_path = state.get("learning_path", {})

    context_parts = []
    if current_node:
        context_parts.append(f"当前知识点: {current_node.get('name', '未知')}")
    if learning_path:
        context_parts.append(f"学习路径: {learning_path.get('title', '未知')}")

    system_msg = SystemMessage(content=TUTOR_PROMPT.format(
        profile=_format_profile(profile),
        context=" | ".join(context_parts) if context_parts else "自由问答模式",
    ))

    recent_messages = state["messages"][-8:]
    response = await llm.ainvoke([system_msg] + list(recent_messages))

    return {
        "messages": [AIMessage(content=response.content, name="tutor")],
        "next_agent": END,
        "agent_outputs": {
            **state.get("agent_outputs", {}),
            "tutor": "答疑完成",
        },
    }


def _format_profile(profile: dict) -> str:
    if not profile:
        return "未建立"
    level = profile.get("knowledge_level", "intermediate")
    style = profile.get("learning_style", "balanced")
    return f"水平: {level}, 风格: {style}"
