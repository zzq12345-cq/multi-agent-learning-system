"""Agent 自我反思 — 输出质量检查"""

import json

# 出题难度合法区间（与 assessor 提示词中 difficulty 字段约定一致）
QUIZ_DIFFICULTY_MIN = 1
QUIZ_DIFFICULTY_MAX = 5


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


def _check_question_rules(q: dict) -> list[str]:
    """单题规则检查：题干、难度边界、选择题答案是否在选项中"""
    issues = []
    qid = q.get("id", "?")
    if not q.get("question"):
        issues.append(f"题目 {qid} 缺少题干")
    difficulty = q.get("difficulty")
    if difficulty is not None and not (
        QUIZ_DIFFICULTY_MIN <= difficulty <= QUIZ_DIFFICULTY_MAX
    ):
        issues.append(
            f"题目 {qid} 难度越界（{difficulty}），"
            f"应在 {QUIZ_DIFFICULTY_MIN}-{QUIZ_DIFFICULTY_MAX}"
        )
    options = q.get("options") or []
    answer = str(q.get("answer", "")).strip()
    if q.get("type") == "choice" and options and answer:
        letters = {str(opt).strip()[:1].upper() for opt in options if str(opt).strip()}
        if answer[:1].upper() not in letters:
            issues.append(f"题目 {qid} 答案「{answer}」不在选项中")
    return issues


def review_quiz_rules(result: dict | None) -> dict:
    """L0 出题规则质检（零 LLM 成本）

    在 check_assessor_output 基础上追加题干缺失、难度越界、
    选择题答案不在选项中等检查，返回 {"pass": bool, "issues": [...]}。
    """
    base = check_assessor_output("", result)
    issues = list(base["issues"])
    for q in (result or {}).get("questions", []):
        issues.extend(_check_question_rules(q))
    return {"pass": len(issues) == 0, "issues": issues}


def parse_review_verdict(content: str) -> dict:
    """解析 L1 审题 LLM 输出为 {"verdict": "pass"|"revise", "issues": [...]}

    解析失败或字段非法时默认放行（pass），避免审查环节反向阻塞出题。
    """
    data = None
    try:
        start = content.find("{")
        end = content.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(content[start:end])
    except (json.JSONDecodeError, ValueError):
        data = None

    if not isinstance(data, dict) or data.get("verdict") not in ("pass", "revise"):
        return {"verdict": "pass", "issues": []}

    issues = [str(i) for i in data.get("issues", []) if i]
    if data["verdict"] == "revise" and not issues:
        issues = ["审查者建议修订题目"]
    return {"verdict": data["verdict"], "issues": issues if data["verdict"] == "revise" else []}
