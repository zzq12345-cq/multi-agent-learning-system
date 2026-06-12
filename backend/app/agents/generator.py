"""生成器 Agent — 学习资源生成"""

from langchain_core.messages import AIMessage, SystemMessage
from app.agents import AgentState, get_llm, END
from app.deps import LLMConfig
from app.services.learning_engine import find_node_by_name, select_current_node, start_node
from app.services.memory import build_context_summary, get_conversation_window
from app.services.rag import search_knowledge

GENERATOR_PROMPT = """你是一个学习资源生成专家（Generator Agent）。
你的职责是根据知识点和学生画像，生成**深度、系统、有实操价值**的个性化学习资源。

## 输出结构要求（必须完整包含以下板块）

### 1. 核心概念讲解
- 用 2-3 段文字讲清「是什么」「为什么重要」「在什么场景用」
- 关键术语加粗，首次出现时给出一句话定义
- 适当类比帮助理解

### 2. 原理与机制
- 深入讲解内部工作原理（不是停留在表面用法）
- 若涉及流程，用 Mermaid 流程图展示
- 列出常见误区/易错点（用 ⚠️ 标记）

### 3. 代码实战（至少 2 个递进示例）
- 示例 1：基础用法（含逐行注释）
- 示例 2：进阶场景或组合应用
- 每个示例后附上运行结果说明
- 代码必须可运行、有实际意义（不要 hello world 级别）

### 4. 对比与拓展
- 与相近概念的区别对比（可用表格）
- 实际项目中的应用场景举例
- 性能/使用注意事项

### 5. 巩固练习
- 2-3 道递进练习题（从理解到应用）
- 用 <details><summary>参考答案</summary> ... </details> 折叠答案

## 生成原则
- 内容深度适配学生水平，但不要过于浅显
- 视觉型学生：多用 Mermaid 图（流程图/类图/时序图）
- 实践型学生：多用真实项目案例和动手任务
- 理论型学生：注重原理推导、复杂度分析、设计思想
- 代码示例必须准确可运行
- 全文 Markdown 格式，层级清晰

学生画像：{profile}
当前知识点：{node}
学习路径上下文：{context}"""


async def generator_node(state: AgentState) -> dict:
    """生成器节点：生成学习资源"""
    config = LLMConfig(**state.get("llm_config", {}))
    llm = get_llm(config, temperature=0.7)

    profile = state.get("user_profile", {})
    current_node = state.get("current_node", {})
    learning_path = state.get("learning_path", {})
    node_states = state.get("node_states", {})

    # 解析当前知识点：用户指定 > 已有 current_node > 路径中第一个可学节点
    user_query = state["messages"][-1].content if state["messages"] else ""
    matched = find_node_by_name(user_query, learning_path)
    if matched:
        current_node = matched
    elif not current_node.get("id"):
        current_node = select_current_node(learning_path, node_states)

    context = ""
    if learning_path:
        nodes = learning_path.get("nodes", [])
        context = f"学习路径：{learning_path.get('title', '')}, 共 {len(nodes)} 个节点"

    context_summary = build_context_summary(state)

    # RAG 检索相关教学资料
    node_name = current_node.get("name", "") if current_node else ""
    search_query = f"{node_name} {user_query}" if node_name else user_query
    domain = learning_path.get("domain") if learning_path else None
    reference = search_knowledge(search_query, top_k=3, domain=domain)

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
    if current_node.get("id"):
        node_states = start_node(current_node["id"], node_states)

    return {
        "messages": [AIMessage(content=response.content, name="generator")],
        "node_states": node_states,
        "current_node": current_node,
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
    parts = [f"水平: {level}, 风格: {style}"]
    if profile.get("goals"):
        parts.append(f"学习目标: {', '.join(profile['goals'])}")
    if profile.get("strengths"):
        parts.append(f"优势: {', '.join(profile['strengths'])}")
    if profile.get("weaknesses"):
        parts.append(f"薄弱项: {', '.join(profile['weaknesses'])}")
    # 视觉型学生追加图解提示
    if style == "visual":
        parts.append("（优先用 Mermaid 图解）")
    return " | ".join(parts)
