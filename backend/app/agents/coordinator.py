"""协调者 Agent — 意图识别和任务分发"""

from langchain_core.messages import AIMessage, SystemMessage
from app.agents import AgentState, get_llm, PROFILER, PLANNER, GENERATOR, TUTOR, ASSESSOR, END
from app.deps import LLMConfig

COORDINATOR_PROMPT = """你是一个智能学习系统的协调者（Coordinator Agent）。
你的职责是理解用户意图，并将任务分发给合适的专业 Agent。

可用的 Agent：
- profiler: 评估学生能力水平、识别学习风格（用于新用户或需要重新评估时）
- planner: 规划学习路径、调整学习计划（用于开始新学科或调整路径时）
- generator: 生成学习资源（讲义、练习题、代码示例）
- tutor: 实时答疑、概念解释、引导思考
- assessor: 学习效果评估、生成测试题

判断规则：
1. 用户想开始学习新内容/新学科 → planner
2. 用户问具体知识问题/需要解释 → tutor
3. 用户想做练习/测试 → assessor
4. 用户想获取学习资料/笔记 → generator
5. 用户是新用户/想重新评估水平 → profiler
6. 简单的问候/闲聊 → 直接回复（以 REPLY: 开头）

当前学生画像：{profile}
当前学习路径：{path}

请只回复一个 Agent 名称（profiler/planner/generator/tutor/assessor），
或者如果是简单对话直接回复用户（以 REPLY: 开头）。"""


async def coordinator_node(state: AgentState) -> dict:
    """协调者节点：识别意图并路由"""
    config = LLMConfig(**state.get("llm_config", {}))
    llm = get_llm(config, temperature=0.3)

    profile_info = state.get("user_profile", {})
    path_info = state.get("learning_path", {})

    system_msg = SystemMessage(content=COORDINATOR_PROMPT.format(
        profile=profile_info or "未建立",
        path=path_info.get("title", "未设置") if path_info else "未设置",
    ))

    recent_messages = state["messages"][-3:]
    response = await llm.ainvoke([system_msg] + list(recent_messages))
    content = response.content.strip().lower()

    # 解析路由决策
    agent_map = {
        "profiler": PROFILER,
        "planner": PLANNER,
        "generator": GENERATOR,
        "tutor": TUTOR,
        "assessor": ASSESSOR,
    }

    for name, agent_id in agent_map.items():
        if name in content and "reply:" not in content:
            return {
                "current_intent": name,
                "next_agent": agent_id,
                "agent_outputs": {
                    **state.get("agent_outputs", {}),
                    "coordinator": f"路由到 {name}",
                },
            }

    # 直接回复
    reply = content.replace("reply:", "").strip() if "reply:" in content else content
    return {
        "messages": [AIMessage(content=reply, name="coordinator")],
        "next_agent": END,
        "agent_outputs": {
            **state.get("agent_outputs", {}),
            "coordinator": "直接回复",
        },
    }
