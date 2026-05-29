"""Agent 自我反思 — 输出质量检查"""


def check_planner_output(content: str, learning_path: dict | None) -> dict:
    """检查规划师输出质量

    返回 {"pass": bool, "issues": [...]}
    """
    issues = []

    if not learning_path:
        issues.append("未能生成有效的学习路径 JSON")
        return {"pass": False, "issues": issues}

    nodes = learning_path.get("nodes", [])
    if len(nodes) < 3:
        issues.append(f"节点数量过少（{len(nodes)}），建议 5-15 个")
    if len(nodes) > 20:
        issues.append(f"节点数量过多（{len(nodes)}），建议精简")

    # 检查是否有孤立节点（无边连接）
    edges = learning_path.get("edges", [])
    connected = set()
    for e in edges:
        connected.add(e.get("source"))
        connected.add(e.get("target"))

    for node in nodes[1:]:  # 跳过第一个（起点可以无入边）
        if node["id"] not in connected:
            issues.append(f"节点 {node['name']} 未与其他节点连接")

    return {"pass": len(issues) == 0, "issues": issues}


def check_generator_output(content: str) -> dict:
    """检查生成器输出质量"""
    issues = []

    if len(content) < 100:
        issues.append("内容过短，可能不够详细")

    if len(content) > 5000:
        issues.append("内容过长，建议精简")

    # 检查是否包含代码示例（对编程类内容）
    has_code = "```" in content or "    " in content

    return {"pass": len(issues) == 0, "issues": issues, "has_code": has_code}


def check_assessor_output(content: str, result: dict | None) -> dict:
    """检查评估师输出质量"""
    issues = []

    if not result:
        issues.append("未能生成结构化评估结果")
        return {"pass": False, "issues": issues}

    if "questions" in result:
        questions = result.get("questions", [])
        if len(questions) < 2:
            issues.append("题目数量过少")
        for q in questions:
            if not q.get("answer"):
                issues.append(f"题目 {q.get('id', '?')} 缺少答案")

    return {"pass": len(issues) == 0, "issues": issues}
