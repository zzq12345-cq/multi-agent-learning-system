"""学习引擎 — 节点状态自动驱动"""


def init_node_states(learning_path: dict) -> dict:
    """根据学习路径初始化节点状态

    规则：
    - 没有前置依赖的节点 → available
    - 有前置依赖的节点 → locked
    """
    nodes = learning_path.get("nodes", [])
    if not nodes:
        return {}

    states = {}
    for node in nodes:
        prereqs = node.get("prerequisites", [])
        status = "available" if not prereqs else "locked"
        states[node["id"]] = {"status": status, "score": None}

    return states


def unlock_next_nodes(node_id: str, learning_path: dict, node_states: dict) -> dict:
    """完成一个节点后，解锁其后续节点

    规则：一个节点的所有 prerequisites 都 completed 时，该节点变为 available
    """
    nodes = learning_path.get("nodes", [])
    updated = {**node_states}

    for node in nodes:
        nid = node["id"]
        if updated.get(nid, {}).get("status") != "locked":
            continue
        prereqs = node.get("prerequisites", [])
        if not prereqs:
            continue
        # 检查所有前置是否都已完成
        all_done = all(
            updated.get(p, {}).get("status") == "completed"
            for p in prereqs
        )
        if all_done:
            updated[nid] = {**updated.get(nid, {}), "status": "available"}

    return updated


def complete_node(node_id: str, score: float, learning_path: dict, node_states: dict) -> dict:
    """标记节点完成并解锁后续"""
    updated = {**node_states}
    updated[node_id] = {"status": "completed", "score": score}
    # 解锁后续节点
    updated = unlock_next_nodes(node_id, learning_path, updated)
    return updated


def start_node(node_id: str, node_states: dict) -> dict:
    """标记节点为学习中"""
    updated = {**node_states}
    if updated.get(node_id, {}).get("status") in ("available", "locked"):
        updated[node_id] = {**updated.get(node_id, {}), "status": "in_progress"}
    return updated
