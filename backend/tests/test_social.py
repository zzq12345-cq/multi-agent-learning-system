"""社交功能测试"""

import tempfile
from pathlib import Path
from unittest.mock import patch
from app.services.social import (
    post_activity,
    get_feed,
    like_activity,
    calculate_leaderboard,
    check_badges,
    get_user_badges,
)


def test_post_and_get_feed():
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("app.services.social.SOCIAL_DIR", Path(tmpdir)):
            with patch("app.services.social.ACTIVITIES_FILE", Path(tmpdir) / "activities.json"):
                post_activity("u1", "小明", "node_completed", "完成了变量", {"score": 85})
                post_activity("u2", "小红", "node_completed", "完成了循环", {"score": 90})

                feed = get_feed(10)
                assert len(feed) == 2
                assert feed[0]["username"] == "小红"  # 最新的在前
                assert feed[0]["comments"] == []  # 新动态评论初始化为空


def test_like():
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("app.services.social.SOCIAL_DIR", Path(tmpdir)):
            with patch("app.services.social.ACTIVITIES_FILE", Path(tmpdir) / "activities.json"):
                act = post_activity("u1", "小明", "node_completed", "test", {})
                like_activity(act["id"], "u2")

                feed = get_feed(1)
                assert feed[0]["likes"] == 1


def test_leaderboard():
    sessions = {
        "s1": {
            "user_id": "u1",
            "node_states": {
                "n1": {"status": "completed"},
                "n2": {"status": "completed"},
            },
            "mastery_data": {"n1": {"mastery": 80}, "n2": {"mastery": 90}},
            "metadata": {"username": "小明"},
        },
        "s2": {
            "user_id": "u2",
            "node_states": {"n1": {"status": "completed"}},
            "mastery_data": {"n1": {"mastery": 70}},
            "metadata": {"username": "小红"},
        },
    }
    board = calculate_leaderboard(sessions)
    assert len(board) == 2
    assert board[0]["username"] == "小明"  # 分数更高


def test_badges():
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("app.services.social.SOCIAL_DIR", Path(tmpdir)):
            with patch("app.services.social.BADGES_FILE", Path(tmpdir) / "badges.json"):
                with patch("app.services.social.ACTIVITIES_FILE", Path(tmpdir) / "activities.json"):
                    state = {
                        "node_states": {"n1": {"status": "completed"}},
                        "mastery_data": {},
                        "metadata": {"last_assessment": {"score": 60}},
                        "learning_path": {"nodes": [{"id": "n1"}, {"id": "n2"}]},
                    }
                    new = check_badges("u1", state)
                    assert "first_learn" in new

                    badges = get_user_badges("u1")
                    earned = [b for b in badges if b["earned"]]
                    assert len(earned) == 1
