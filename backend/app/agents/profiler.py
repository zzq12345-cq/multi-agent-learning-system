"""画像师 Agent — 评估学生能力和学习风格"""

from langchain_core.messages import AIMessage, SystemMessage
from app.agents import AgentState, get_llm, END
from app.deps import LLMConfig

PROFILER_PROMPT = """你是一个学习能力评估专家（Profiler Agent）。
你的职责是通过对话了解学生的：
1. 当前知识水平（beginner/intermediate/advanced）
2. 学习风格偏好（visual 视觉型/practical 实践型/theoretical 理论型/balanced 均衡型）
3. 学习目标
4. 已有知识基础

评估策略：
- 通过 2-3 个针对性问题快速评估
- 问题应该自然、友好，不像考试
- 根据回答推断水平，不要直接问"你是什么水平"

当前已知信息：{profile}

如果信息已经足够（至少知道水平和目标），输出评估结果，格式：
ASSESSMENT:
- level: beginner/intermediate/advanced
- style: visual/practical/theoretical/balanced
- goals: [目标列表]
- strengths: [优势]
- weaknesses: [待提升]

如果信息不足，继续提问（友好自然的方式）。"""


async def profiler_node(state: AgentState) -> dict:
    """画像师节点：评估学生能力"""
    config = LLMConfig(**state.get("llm_config", {}))
    llm = get_llm(config, temperature=0.7)

    profile = state.get("user_profile", {})
    system_msg = SystemMessage(content=PROFILER_PROMPT.format(profile=profile or "暂无"))

    recent_messages = state["messages"][-5:]
    response = await llm.ainvoke([system_msg] + list(recent_messages))
    content = response.content

    # 检查是否产出了评估结果
    updated_profile = state.get("user_profile", {})
    if "ASSESSMENT:" in content or "assessment:" in content.lower():
        updated_profile = _parse_assessment(content, updated_profile)
        summary = _generate_profile_summary(updated_profile)
        return {
            "messages": [AIMessage(content=summary, name="profiler")],
            "user_profile": updated_profile,
            "next_agent": END,
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
    return profile


def _generate_profile_summary(profile: dict) -> str:
    """生成画像总结"""
    level_map = {"beginner": "入门", "intermediate": "中级", "advanced": "高级"}
    style_map = {"visual": "视觉型", "practical": "实践型", "theoretical": "理论型", "balanced": "均衡型"}

    level = level_map.get(profile.get("knowledge_level", ""), "待评估")
    style = style_map.get(profile.get("learning_style", ""), "待评估")

    return (
        f"好的，我对你的学习情况有了初步了解！\n\n"
        f"📊 **能力评估**\n"
        f"- 当前水平：{level}\n"
        f"- 学习风格：{style}\n\n"
        f"接下来我可以为你规划个性化的学习路径。你想学习什么内容呢？"
    )
