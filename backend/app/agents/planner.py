"""规划师 Agent — 学习路径规划"""

import json
from langchain_core.messages import AIMessage, SystemMessage
from app.agents import AgentState, get_llm, END
from app.deps import LLMConfig
from app.services.learning_engine import init_node_states, merge_node_states, select_current_node
from app.services.mastery import init_mastery_data, merge_mastery_data
from app.services.memory import build_context_summary, get_conversation_window
from app.services.graph_store import save_graph, validate_domain, slugify_domain

PLANNER_PROMPT = """你是一个学习路径规划专家（Planner Agent）。
你的职责是根据学生画像和学习目标，设计个性化的学习路径。

学习路径设计原则：
1. 基于知识图谱的拓扑结构，确保前置知识先学
2. 难度梯度递进，从基础到进阶
3. 每个节点包含明确的学习目标和预计时间
4. 考虑学生的学习风格调整内容形式

学生画像：{profile}
当前学习路径：{current_path}

请根据用户的学习需求，生成学习路径。输出格式（JSON）：

```json
{{
  "title": "学习路径标题",
  "description": "路径描述",
  "domain": "学科领域",
  "estimated_hours": 总预计小时数,
  "nodes": [
    {{
      "id": "node_1",
      "name": "知识点名称",
      "description": "简要描述",
      "difficulty": 1-5,
      "estimated_minutes": 预计学习分钟数,
      "prerequisites": ["前置节点id"],
      "learning_objectives": ["学习目标1", "学习目标2"],
      "resource_types": ["note", "exercise", "code_example"]
    }}
  ],
  "edges": [
    {{"source": "node_1", "target": "node_2", "relation": "prerequisite"}}
  ]
}}
```

注意：
- 节点数量控制在 8-15 个
- 确保图结构合理（无环、有明确起点和终点）
- 根据学生水平跳过已掌握的基础内容
- 若「当前学习路径」列出了已有节点，说明是调整既有路径：
  保留仍然适用节点的 id 和 name 不变，只增删或修改必要的节点，不要重新编号"""


async def planner_node(state: AgentState) -> dict:
    """规划师节点：生成或调整学习路径"""
    config = LLMConfig(**state.get("llm_config", {}))
    llm = get_llm(config, temperature=0.5)

    profile = state.get("user_profile", {})
    current_path = state.get("learning_path", {})
    # 已有路径节点时进入调整模式：增量合并而非整体重建
    is_adjust = bool(current_path and current_path.get("nodes"))

    context_summary = build_context_summary(state)
    system_msg = SystemMessage(content=PLANNER_PROMPT.format(
        profile=json.dumps(profile, ensure_ascii=False) if profile else "未建立",
        current_path=_describe_current_path(state) if is_adjust else "无",
    ) + f"\n\n--- 当前上下文 ---\n{context_summary}")

    recent_messages = get_conversation_window(state["messages"])
    response = await llm.ainvoke([system_msg] + list(recent_messages))
    content = response.content

    learning_path = _extract_path_json(content)

    if learning_path:
        # 自动保存为动态图谱
        domain = learning_path.get("domain", "")
        if domain and not validate_domain(domain):
            domain = slugify_domain(domain)
        if domain:
            try:
                save_graph(domain, learning_path)
            except Exception:
                pass

        summary = _generate_path_summary(learning_path)
        if is_adjust:
            # 调整模式：按节点名称合并，同名节点保留进度与掌握度；
            # 跨主题重新规划时名称不重合，自然全新初始化
            old_nodes = current_path.get("nodes", [])
            node_states = merge_node_states(learning_path, state.get("node_states", {}), old_nodes)
            mastery_data = merge_mastery_data(learning_path, state.get("mastery_data", {}), old_nodes)
        else:
            node_states = init_node_states(learning_path)
            mastery_data = init_mastery_data(learning_path)
        return {
            "messages": [AIMessage(content=summary, name="planner")],
            "learning_path": learning_path,
            "node_states": node_states,
            "mastery_data": mastery_data,
            "current_node": select_current_node(learning_path, node_states),
            "next_agent": END,
            "agent_outputs": {
                **state.get("agent_outputs", {}),
                "planner": "路径调整完成" if is_adjust else "路径规划完成",
            },
        }

    return {
        "messages": [AIMessage(content=content, name="planner")],
        "next_agent": END,
        "agent_outputs": {
            **state.get("agent_outputs", {}),
            "planner": "需要更多信息",
        },
    }


def _describe_current_path(state: dict) -> str:
    """生成现有路径摘要（含进度与掌握度），供调整模式注入 prompt"""
    path = state.get("learning_path", {})
    node_states = state.get("node_states", {})
    mastery_data = state.get("mastery_data", {})
    lines = [f"《{path.get('title', '未命名')}》已有节点如下："]
    for n in path.get("nodes", []):
        nid = n.get("id", "")
        status = node_states.get(nid, {}).get("status", "locked")
        mastery = mastery_data.get(nid, {}).get("mastery", 0)
        lines.append(f"- {nid}: {n.get('name', '')}（状态: {status}, 掌握度: {mastery}）")
    return "\n".join(lines)


def _extract_path_json(content: str) -> dict | None:
    """从回复中提取 JSON 学习路径"""
    try:
        start = content.find("{")
        end = content.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(content[start:end])
    except (json.JSONDecodeError, ValueError):
        pass
    return None


def _generate_path_summary(path: dict) -> str:
    """生成路径摘要"""
    nodes = path.get("nodes", [])
    title = path.get("title", "学习路径")
    desc = path.get("description", "")
    hours = path.get("estimated_hours", "?")

    node_list = "\n".join(
        f"  {i+1}. **{n['name']}** (难度 {'⭐' * n.get('difficulty', 1)})"
        for i, n in enumerate(nodes[:8])
    )
    if len(nodes) > 8:
        node_list += f"\n  ... 共 {len(nodes)} 个知识点"

    return (
        f"🗺️ **{title}**\n\n"
        f"{desc}\n\n"
        f"📋 **学习节点**：\n{node_list}\n\n"
        f"⏱️ 预计学习时间：{hours} 小时\n\n"
        f"路径已生成！你可以说「开始学习」进入第一个知识点，"
        f"或者告诉我需要调整的地方。"
    )
