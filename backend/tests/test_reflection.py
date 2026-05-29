"""Agent 反思模块测试"""

from app.services.reflection import (
    check_planner_output,
    check_generator_output,
    check_assessor_output,
)


def test_planner_no_path():
    result = check_planner_output("some text", None)
    assert not result["pass"]


def test_planner_valid():
    path = {
        "nodes": [
            {"id": "n1", "name": "A"},
            {"id": "n2", "name": "B"},
            {"id": "n3", "name": "C"},
            {"id": "n4", "name": "D"},
            {"id": "n5", "name": "E"},
        ],
        "edges": [
            {"source": "n1", "target": "n2"},
            {"source": "n2", "target": "n3"},
            {"source": "n3", "target": "n4"},
            {"source": "n4", "target": "n5"},
        ],
    }
    result = check_planner_output("", path)
    assert result["pass"]


def test_planner_too_few_nodes():
    path = {"nodes": [{"id": "n1", "name": "A"}], "edges": []}
    result = check_planner_output("", path)
    assert not result["pass"]


def test_generator_too_short():
    result = check_generator_output("短")
    assert not result["pass"]


def test_generator_valid():
    content = "x" * 200
    result = check_generator_output(content)
    assert result["pass"]


def test_assessor_no_result():
    result = check_assessor_output("text", None)
    assert not result["pass"]


def test_assessor_valid():
    data = {"questions": [{"id": "q1", "answer": "A"}, {"id": "q2", "answer": "B"}]}
    result = check_assessor_output("", data)
    assert result["pass"]
