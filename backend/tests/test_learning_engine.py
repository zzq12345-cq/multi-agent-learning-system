"""学习引擎单元测试"""

import pytest
from app.services.learning_engine import (
    init_node_states,
    start_node,
    complete_node,
    unlock_next_nodes,
    select_current_node,
    find_node_by_name,
    merge_node_states,
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


def test_select_current_node_prefers_in_progress(sample_path):
    states = {
        "n1": {"status": "completed", "score": 80},
        "n2": {"status": "in_progress", "score": None},
        "n3": {"status": "locked", "score": None},
        "n4": {"status": "available", "score": None},
    }
    assert select_current_node(sample_path, states)["id"] == "n2"


def test_select_current_node_falls_back_to_available(sample_path):
    states = init_node_states(sample_path)
    assert select_current_node(sample_path, states)["id"] == "n1"


def test_select_current_node_empty():
    assert select_current_node({}, {}) == {}
    # 全部完成时无可选节点
    path = {"nodes": [{"id": "n1", "name": "基础", "prerequisites": []}]}
    assert select_current_node(path, {"n1": {"status": "completed", "score": 90}}) == {}


def test_find_node_by_name_in_text(sample_path):
    node = find_node_by_name("我想开始学习进阶部分", sample_path)
    assert node["id"] == "n2"


def test_find_node_by_name_longest_match():
    path = {"nodes": [
        {"id": "a", "name": "函数"},
        {"id": "b", "name": "高阶函数"},
    ]}
    # 最长名称优先，避免短名误匹配
    assert find_node_by_name("讲讲高阶函数", path)["id"] == "b"


def test_find_node_by_name_no_match(sample_path):
    assert find_node_by_name("随便聊聊", sample_path) == {}
    assert find_node_by_name("", sample_path) == {}


def test_find_node_by_name_excludes_locked(sample_path):
    states = init_node_states(sample_path)  # n2/n3 locked
    # 传入 node_states 时不匹配 locked 节点，避免打穿解锁顺序
    assert find_node_by_name("我想开始学习进阶部分", sample_path, states) == {}
    # 不传时保留原行为（generator 用户显式指定要学的场景）
    assert find_node_by_name("我想开始学习进阶部分", sample_path)["id"] == "n2"


def test_merge_node_states_keeps_progress(sample_path):
    old = {
        "n1": {"status": "completed", "score": 85},
        "n2": {"status": "in_progress", "score": None},
        "n3": {"status": "locked", "score": None},
        "n4": {"status": "available", "score": None},
    }
    merged = merge_node_states(sample_path, old, sample_path["nodes"])
    assert merged["n1"] == {"status": "completed", "score": 85}
    assert merged["n2"]["status"] == "in_progress"


def test_merge_node_states_inits_and_unlocks_new_node(sample_path):
    old = {"n1": {"status": "completed", "score": 85}}
    new_path = {
        "nodes": sample_path["nodes"] + [
            {"id": "n5", "name": "新增", "prerequisites": ["n1"]},
        ],
    }
    merged = merge_node_states(new_path, old, sample_path["nodes"])
    assert merged["n1"]["status"] == "completed"  # 已有进度保留
    assert merged["n5"]["status"] == "available"  # 新节点前置已完成 → 解锁
    assert merged["n2"]["status"] == "available"  # n2 前置 n1 已完成 → 解锁
    assert merged["n3"]["status"] == "locked"  # n3 还需要 n2


def test_merge_node_states_drops_removed_nodes(sample_path):
    old_nodes = sample_path["nodes"] + [{"id": "n_old", "name": "旧主题"}]
    old = {
        "n_old": {"status": "completed", "score": 100},
        "n1": {"status": "in_progress", "score": None},
    }
    merged = merge_node_states(sample_path, old, old_nodes)
    assert "n_old" not in merged  # 新路径中名称不存在的旧节点被丢弃
    assert merged["n1"]["status"] == "in_progress"


def test_merge_node_states_cross_topic_no_grafting():
    # 回归：跨主题重新规划时 LLM 生成的 id（node_1 风格）重合，旧进度不得嫁接
    old_nodes = [
        {"id": "node_1", "name": "Python 基础", "prerequisites": []},
        {"id": "node_2", "name": "Python 函数", "prerequisites": ["node_1"]},
    ]
    old = {
        "node_1": {"status": "completed", "score": 95},
        "node_2": {"status": "in_progress", "score": None},
    }
    new_path = {"nodes": [
        {"id": "node_1", "name": "HTML 入门", "prerequisites": []},
        {"id": "node_2", "name": "CSS 布局", "prerequisites": ["node_1"]},
    ]}
    merged = merge_node_states(new_path, old, old_nodes)
    assert merged["node_1"] == {"status": "available", "score": None}
    assert merged["node_2"]["status"] == "locked"


def test_merge_node_states_matches_by_normalized_name():
    # 同主题调整：id 变化但名称（全角/空白差异）相同 → 进度保留
    old_nodes = [{"id": "node_1", "name": "Ｐｙｔｈｏｎ 基础 "}]
    old = {"node_1": {"status": "completed", "score": 88}}
    new_path = {"nodes": [{"id": "n_a", "name": "python 基础", "prerequisites": []}]}
    merged = merge_node_states(new_path, old, old_nodes)
    assert merged["n_a"] == {"status": "completed", "score": 88}
