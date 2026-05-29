"""知识掌握度模型测试"""

import time
import pytest
from app.services.mastery import (
    calculate_mastery_decay,
    update_mastery,
    get_weak_points,
    get_review_suggestions,
    init_mastery_data,
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
