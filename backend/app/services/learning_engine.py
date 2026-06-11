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


def select_current_node(learning_path: dict, node_states: dict) -> dict:
    """选出当前学习节点：优先 in_progress，其次第一个 available

    按学习路径中节点的原始顺序遍历，返回完整节点 dict；无可选节点时返回 {}
    """
    nodes = learning_path.get("nodes", [])
    for status in ("in_progress", "available"):
        for node in nodes:
            if node_states.get(node.get("id"), {}).get("status") == status:
                return node
    return {}


def find_node_by_name(text: str, learning_path: dict, node_states: dict = None) -> dict:
    """在文本中按名称匹配知识点节点（最长名称优先，避免短名误匹配）

    传入 node_states 时排除 locked 节点，避免用户消息提及锁定知识点
    打穿解锁顺序；不传时保留原行为（如 generator 用户显式指定要学的场景）。
    """
    if not text:
        return {}
    text_lower = text.lower()

    def _locked(node: dict) -> bool:
        if not node_states:
            return False
        return node_states.get(node.get("id"), {}).get("status") == "locked"

    matched = [
        n for n in learning_path.get("nodes", [])
        if n.get("name") and n["name"].lower() in text_lower and not _locked(n)
    ]
    if not matched:
        return {}
    return max(matched, key=lambda n: len(n["name"]))


def normalize_node_name(name: str) -> str:
    """节点名称归一化：全角转半角、去首尾空白、转小写，用于按名称匹配新旧节点"""
    chars = []
    for ch in name or "":
        code = ord(ch)
        if code == 0x3000:  # 全角空格
            chars.append(" ")
        elif 0xFF01 <= code <= 0xFF5E:  # 全角 ASCII 区
            chars.append(chr(code - 0xFEE0))
        else:
            chars.append(ch)
    return "".join(chars).strip().lower()


def index_by_node_name(data: dict, nodes: list) -> dict:
    """把按节点 id 键控的数据转为按归一化名称键控（nodes 提供 id→name 映射）"""
    id_to_name = {n.get("id"): normalize_node_name(n.get("name", "")) for n in nodes}
    return {
        id_to_name[nid]: value
        for nid, value in data.items()
        if id_to_name.get(nid)
    }


def merge_node_states(learning_path: dict, old_states: dict, old_nodes: list) -> dict:
    """调整路径后合并节点状态：按节点名称匹配，同名节点保留原进度

    LLM 生成的节点 id（node_1 风格）在新旧路径间几乎必然重合，
    以名称为合并键可避免跨主题重新规划时旧进度错误嫁接到新节点；
    合并后做一次解锁检查，新路径中名称不存在的旧节点状态会被丢弃。
    """
    old_by_name = index_by_node_name(old_states, old_nodes)
    fresh = init_node_states(learning_path)
    merged = {
        node["id"]: old_by_name.get(normalize_node_name(node.get("name", "")), fresh[node["id"]])
        for node in learning_path.get("nodes", [])
    }
    # unlock_next_nodes 内部全量扫描 locked 节点，node_id 参数不参与判断
    return unlock_next_nodes("", learning_path, merged)
