"""assessor 评分兜底归因守卫测试"""

from app.agents.assessor import _resolve_assessment_node


PATH = {"nodes": [
    {"id": "n1", "name": "基础", "prerequisites": []},
    {"id": "n2", "name": "进阶", "prerequisites": ["n1"]},
]}


def test_resolve_by_knowledge_point_name():
    states = {"n1": {"status": "in_progress"}, "n2": {"status": "locked"}}
    node = _resolve_assessment_node({"knowledge_point": "基础"}, PATH, states)
    assert node["id"] == "n1"


def test_resolve_knowledge_point_locked_not_matched():
    # knowledge_point 命中 locked 节点时不归因到它，回退到当前在学节点
    states = {"n1": {"status": "in_progress"}, "n2": {"status": "locked"}}
    node = _resolve_assessment_node({"knowledge_point": "进阶"}, PATH, states)
    assert node["id"] == "n1"


def test_resolve_no_match_requires_in_progress():
    # 无法归因且首个可学节点只是 available（尚未开始）→ 不归因
    states = {"n1": {"status": "available"}, "n2": {"status": "locked"}}
    node = _resolve_assessment_node({"knowledge_point": "完全无关"}, PATH, states)
    assert node == {}


def test_resolve_no_match_falls_back_to_in_progress():
    # 无 knowledge_point 时，仅归因到确为 in_progress 的当前节点
    states = {"n1": {"status": "in_progress"}, "n2": {"status": "locked"}}
    node = _resolve_assessment_node({}, PATH, states)
    assert node["id"] == "n1"
