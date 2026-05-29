"""学习引擎单元测试"""

import pytest
from app.services.learning_engine import (
    init_node_states,
    start_node,
    complete_node,
    unlock_next_nodes,
)


@pytest.fixture
def sample_path():
    return {
        "title": "测试路径",
        "nodes": [
            {"id": "n1", "name": "基础", "prerequisites": []},
            {"id": "n2", "name": "进阶", "prerequisites": ["n1"]},
            {"id": "n3", "name": "高级", "prerequisites": ["n1", "n2"]},
            {"id": "n4", "name": "独立", "prerequisites": []},
        ],
        "edges": [
            {"source": "n1", "target": "n2", "relation": "prerequisite"},
            {"source": "n2", "target": "n3", "relation": "prerequisite"},
        ],
    }


def test_init_node_states(sample_path):
    states = init_node_states(sample_path)
    assert states["n1"]["status"] == "available"
    assert states["n2"]["status"] == "locked"
    assert states["n3"]["status"] == "locked"
    assert states["n4"]["status"] == "available"


def test_init_empty_path():
    states = init_node_states({})
    assert states == {}


def test_start_node():
    states = {"n1": {"status": "available", "score": None}}
    updated = start_node("n1", states)
    assert updated["n1"]["status"] == "in_progress"


def test_start_node_already_completed():
    states = {"n1": {"status": "completed", "score": 90}}
    updated = start_node("n1", states)
    # completed 不应该被改回 in_progress
    assert updated["n1"]["status"] == "completed"


def test_complete_node_unlocks_next(sample_path):
    states = {
        "n1": {"status": "in_progress", "score": None},
        "n2": {"status": "locked", "score": None},
        "n3": {"status": "locked", "score": None},
        "n4": {"status": "available", "score": None},
    }
    updated = complete_node("n1", 85, sample_path, states)
    assert updated["n1"]["status"] == "completed"
    assert updated["n1"]["score"] == 85
    assert updated["n2"]["status"] == "available"  # n1 完成后 n2 解锁
    assert updated["n3"]["status"] == "locked"  # n3 还需要 n2


def test_complete_all_prereqs_unlocks(sample_path):
    states = {
        "n1": {"status": "completed", "score": 90},
        "n2": {"status": "in_progress", "score": None},
        "n3": {"status": "locked", "score": None},
        "n4": {"status": "available", "score": None},
    }
    updated = complete_node("n2", 75, sample_path, states)
    assert updated["n2"]["status"] == "completed"
    assert updated["n3"]["status"] == "available"  # n1+n2 都完成，n3 解锁
