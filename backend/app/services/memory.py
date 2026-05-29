"""对话记忆管理 — 摘要 + 结构化上下文"""

from langchain_core.messages import BaseMessage, SystemMessage


def build_context_summary(state: dict) -> str:
    """构建结构化上下文摘要，注入给每个 Agent"""
    parts = []

    # 学生画像
    profile = state.get("user_profile", {})
    if profile:
        level = profile.get("knowledge_level", "未评估")
        style = profile.get("learning_style", "未评估")
        goals = profile.get("goals", [])
        parts.append(f"【学生画像】水平: {level}, 风格: {style}")
        if goals:
            parts.append(f"  目标: {', '.join(goals[:3])}")

    # 学习路径
    learning_path = state.get("learning_path", {})
    if learning_path and learning_path.get("title"):
        parts.append(f"【学习路径】{learning_path['title']}")
        nodes = learning_path.get("nodes", [])
        if nodes:
            parts.append(f"  共 {len(nodes)} 个知识点")

    # 节点进度
    node_states = state.get("node_states", {})
    if node_states:
        completed = [k for k, v in node_states.items() if v.get("status") == "completed"]
        in_progress = [k for k, v in node_states.items() if v.get("status") == "in_progress"]
        if completed:
            # 找到节点名称
            nodes_map = {n["id"]: n["name"] for n in learning_path.get("nodes", [])}
            completed_names = [nodes_map.get(nid, nid) for nid in completed[:5]]
            parts.append(f"【已完成】{', '.join(completed_names)}")
        if in_progress:
            nodes_map = {n["id"]: n["name"] for n in learning_path.get("nodes", [])}
            progress_names = [nodes_map.get(nid, nid) for nid in in_progress[:3]]
            parts.append(f"【学习中】{', '.join(progress_names)}")

    # 当前节点
    current_node = state.get("current_node", {})
    if current_node and current_node.get("name"):
        parts.append(f"【当前节点】{current_node['name']}")

    # 知识掌握度
    mastery_data = state.get("mastery_data", {})
    if mastery_data:
        weak_nodes = [k for k, v in mastery_data.items() if v.get("mastery", 0) < 70 and v.get("mastery", 0) > 0]
        strong_nodes = [k for k, v in mastery_data.items() if v.get("mastery", 0) >= 70]
        if strong_nodes:
            nodes_map = {n["id"]: n["name"] for n in learning_path.get("nodes", [])} if learning_path else {}
            strong_names = [nodes_map.get(nid, nid) for nid in strong_nodes[:5]]
            parts.append(f"【已掌握】{', '.join(strong_names)}")
        if weak_nodes:
            nodes_map = {n["id"]: n["name"] for n in learning_path.get("nodes", [])} if learning_path else {}
            weak_names = [nodes_map.get(nid, nid) for nid in weak_nodes[:5]]
            parts.append(f"【需加强】{', '.join(weak_names)}")

    # 上次评估
    metadata = state.get("metadata", {})
    last_assessment = metadata.get("last_assessment", {})
    if last_assessment and last_assessment.get("score") is not None:
        parts.append(f"【上次评估】得分: {last_assessment['score']}")
        weak = last_assessment.get("weak_points", [])
        if weak:
            parts.append(f"  薄弱点: {', '.join(weak[:3])}")

    return "\n".join(parts) if parts else "暂无历史上下文"


def get_conversation_window(messages: list, max_recent: int = 6, max_total: int = 12) -> list:
    """智能对话窗口：保留最近 N 条 + 早期重要消息摘要

    策略：
    - 始终保留最近 max_recent 条消息
    - 如果总消息超过 max_total，对早期消息做截断
    - 保留第一条用户消息（通常包含初始目标）
    """
    if len(messages) <= max_total:
        return list(messages)

    # 保留第一条用户消息 + 最近 max_recent 条
    first_user = None
    for m in messages:
        if m.type == "human":
            first_user = m
            break

    recent = list(messages[-max_recent:])

    if first_user and first_user not in recent:
        return [first_user] + recent
    return recent
