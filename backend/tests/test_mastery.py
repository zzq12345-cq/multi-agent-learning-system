"""知识掌握度模型测试"""

import time
import pytest
from app.services.mastery import (
    calculate_mastery_decay,
    update_mastery,
    get_weak_points,
    get_review_suggestions,
    init_mastery_data,
    merge_mastery_data,
    record_assessment,
)


def test_mastery_decay_no_time():
    now = time.time()
    result = calculate_mastery_decay(80, now, now)
    assert result == 80


def test_mastery_decay_one_day():
    now = time.time()
    one_day_ago = now - 86400
    result = calculate_mastery_decay(80, one_day_ago, now)
    assert result < 80
    assert result > 70  # 一天衰减不会太多


def test_mastery_decay_long_time():
    now = time.time()
    thirty_days_ago = now - 86400 * 30
    result = calculate_mastery_decay(80, thirty_days_ago, now)
    assert result >= 10  # 不低于最低值


def test_update_mastery_improve():
    result = update_mastery(50, 90)
    assert result > 50


def test_update_mastery_decline():
    result = update_mastery(80, 40)
    assert result < 80
    assert result > 40  # 不会暴跌


def test_get_weak_points():
    data = {
        "n1": {"mastery": 90},
        "n2": {"mastery": 50},
        "n3": {"mastery": 30},
    }
    weak = get_weak_points(data)
    assert "n2" in weak
    assert "n3" in weak
    assert "n1" not in weak


def test_init_mastery_data():
    path = {"nodes": [{"id": "a"}, {"id": "b"}]}
    data = init_mastery_data(path)
    assert "a" in data
    assert "b" in data
    assert data["a"]["mastery"] == 0


def test_record_assessment():
    data = {"n1": {"mastery": 0, "attempts": 0, "last_review_ts": time.time(), "history": []}}
    updated = record_assessment(data, "n1", 85)
    assert updated["n1"]["mastery"] > 0
    assert updated["n1"]["attempts"] == 1
    assert len(updated["n1"]["history"]) == 1


def test_merge_mastery_data_keeps_history():
    old_nodes = [{"id": "a", "name": "变量"}, {"id": "removed", "name": "旧主题"}]
    path = {"nodes": [{"id": "a2", "name": "变量"}, {"id": "b", "name": "循环"}]}
    old = {
        "a": {"mastery": 88.0, "attempts": 2, "last_review_ts": 123.0,
              "history": [{"score": 88, "timestamp": 123.0}]},
        "removed": {"mastery": 50, "attempts": 1, "last_review_ts": 1.0, "history": []},
    }
    merged = merge_mastery_data(path, old, old_nodes)
    assert merged["a2"]["mastery"] == 88.0  # 同名节点保留历史（id 变化不影响）
    assert merged["a2"]["attempts"] == 2
    assert merged["b"]["mastery"] == 0  # 新节点初始化
    assert merged["b"]["attempts"] == 0
    assert "removed" not in merged  # 新路径中名称不存在的旧节点被丢弃


def test_merge_mastery_data_cross_topic_no_grafting():
    # 回归：跨主题重新规划时 LLM 生成的 id（node_1 风格）重合，旧掌握度不得嫁接
    old_nodes = [{"id": "node_1", "name": "Python 基础"}]
    old = {"node_1": {"mastery": 90.0, "attempts": 3, "last_review_ts": 1.0,
                      "history": [{"score": 90, "timestamp": 1.0}]}}
    path = {"nodes": [{"id": "node_1", "name": "HTML 入门"}]}
    merged = merge_mastery_data(path, old, old_nodes)
    assert merged["node_1"]["mastery"] == 0
    assert merged["node_1"]["attempts"] == 0
    assert merged["node_1"]["history"] == []
