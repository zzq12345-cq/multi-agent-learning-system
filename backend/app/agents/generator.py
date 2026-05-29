"""生成器 Agent — 学习资源生成"""

from langchain_core.messages import AIMessage, SystemMessage
from app.agents import AgentState, get_llm, END
from app.deps import LLMConfig
from app.services.learning_engine import start_node
from app.services.memory import build_context_summary, get_conversation_window
from app.services.rag import search_knowledge

GENERATOR_PROMPT = """你是一个学习资源生成专家（Generator Agent）。
你的职责是根据知识点和学生画像，生成高质量的个性化学习资源。

可生成的资源类型：
1. **讲义笔记**（note）：结构化的知识讲解，包含概念、原理、示例
2. **练习题**（exercise）：针对性练习，含答案和解析
3. **代码示例**（code_example）：可运行的 Python 代码示例，含注释
4. **知识总结**（summary）：精炼的要点总结，适合复习

生成原则：
- 根据学生水平调整内容深度和用词
- 视觉型学生：多用图表描述、结构化排版
- 实践型学生：多用实际案例和动手练习
- 理论型学生：注重原理推导和逻辑链条
- 内容准确、示例可运行
- 循序渐进，由浅入深

学生画像：{profile}
当前知识点：{node}
学习路径上下文：{context}

请根据用户需求生成对应的学习资源。使用 Markdown 格式输出。"""


async def generator_node(state: AgentState) -> dict:
    """生成器节点：生成学习资源"""
    config = LLMConfig(**state.get("llm_config", {}))
    llm = get_llm(config, temperature=0.7)

    profile = state.get("user_profile", {})
    current_node = state.get("current_node", {})
    learning_path = state.get("learning_path", {})

    context = ""
    if learning_path:
        nodes = learning_path.get("nodes", [])
        context = f"学习路径：{learning_path.get('title', '')}, 共 {len(nodes)} 个节点"

    context_summary = build_context_summary(state)

    # RAG 检索相关教学资料
    user_query = state["messages"][-1].content if state["messages"] else ""
    node_name = current_node.get("name", "") if current_node else ""
    search_query = f"{node_name} {user_query}" if node_name else user_query
    reference = search_knowledge(search_query, top_k=3)

    prompt_content = GENERATOR_PROMPT.format(
        profile=_format_profile(profile),
        node=current_node.get("name", "用户指定的内容") if current_node else "用户指定的内容",
        context=context or "无特定上下文",
    ) + f"\n\n--- 当前上下文 ---\n{context_summary}"
    if reference:
        prompt_content += f"\n\n{reference}\n\n请参考以上资料生成内容，确保准确性。"
    system_msg = SystemMessage(content=prompt_content)

    recent_messages = get_conversation_window(state["messages"])
    response = await llm.ainvoke([system_msg] + list(recent_messages))

    # 更新节点状态为学习中
    node_states = state.get("node_states", {})
    current = state.get("current_node", {})
    if current and current.get("id"):
        node_states = start_node(current["id"], node_states)

    return {
        "messages": [AIMessage(content=response.content, name="generator")],
        "node_states": node_states,
        "next_agent": END,
        "agent_outputs": {
            **state.get("agent_outputs", {}),
            "generator": "资源生成完成",
        },
    }


def _format_profile(profile: dict) -> str:
    if not profile:
        return "未建立（按中级水平生成）"
    level = profile.get("knowledge_level", "intermediate")
    style = profile.get("learning_style", "balanced")
    return f"水平: {level}, 风格: {style}"
