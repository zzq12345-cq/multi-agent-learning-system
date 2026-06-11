"""AI 学伴引擎测试"""

import json
import random
import time
import tempfile
from contextlib import ExitStack, contextmanager
from pathlib import Path
from unittest.mock import patch

from app.services import ai_companions as ac
from app.services.social import post_activity, get_feed, _load_activities, _save_activities

HOUR = 3600


@contextmanager
def _social_sandbox():
    """将社交数据文件统一替换到临时目录"""
    with tempfile.TemporaryDirectory() as tmpdir:
        base = Path(tmpdir)
        with ExitStack() as stack:
            stack.enter_context(patch("app.services.social.SOCIAL_DIR", base))
            stack.enter_context(
                patch("app.services.social.ACTIVITIES_FILE", base / "activities.json")
            )
            stack.enter_context(
                patch("app.services.social.BADGES_FILE", base / "badges.json")
            )
            stack.enter_context(
                patch("app.services.ai_companions.COMPANIONS_FILE", base / "companions.json")
            )
            yield base


def _idle_state(now: float) -> dict:
    """所有学伴均处于刚结算完的状态（不会推进、不会触发初始化回填）"""
    return {
        c["id"]: {
            "node_index": 1, "round": 0, "last_ts": now,
            "score_sum": 80, "score_count": 1,
        }
        for c in ac.COMPANIONS
    }


def test_first_init_backfill():
    """首次初始化：每个学伴回填过去 24 小时 2-3 条动态"""
    with _social_sandbox():
        now = time.time()
        created = ac.advance_companions(now)
        assert 8 <= created <= 12  # 4 个学伴 × 2-3 条

        feed = get_feed(50)
        assert len(feed) == created
        for act in feed:
            assert act["is_ai"] is True
            assert act["comments"] == []
            assert now - 24 * HOUR <= act["timestamp"] <= now
        # 每个学伴 2-3 条
        for comp in ac.COMPANIONS:
            cnt = sum(1 for a in feed if a["user_id"] == comp["id"])
            assert 2 <= cnt <= 3


def test_advance_pace():
    """推进节奏：12 小时时间差 → 推进 1-2 个节点（单节点 6-10 小时）"""
    with _social_sandbox() as base:
        now = time.time()
        state = _idle_state(now)
        state["ai-nova"] = {
            "node_index": 0, "round": 0, "last_ts": now - 12 * HOUR,
            "score_sum": 0, "score_count": 0,
        }
        (base / "companions.json").write_text(json.dumps(state))

        ac.advance_companions(now)
        feed = get_feed(50)
        nova_acts = [a for a in feed if a["user_id"] == "ai-nova"]
        assert 1 <= len(nova_acts) <= 2
        # 其他学伴不应推进
        assert len(feed) == len(nova_acts)


def test_settle_cap_and_no_replay():
    """单次结算上限 3 条防刷屏；积压被丢弃，紧接着再结算不产生新动态"""
    with _social_sandbox() as base:
        now = time.time()
        state = _idle_state(now)
        state["ai-nova"] = {
            "node_index": 0, "round": 0, "last_ts": now - 100 * HOUR,
            "score_sum": 0, "score_count": 0,
        }
        (base / "companions.json").write_text(json.dumps(state))

        created = ac.advance_companions(now)
        assert created == ac.MAX_ACTS_PER_SETTLE

        # 立即再次结算：积压已丢弃，幂等不刷屏
        assert ac.advance_companions(now) == 0
        assert len(get_feed(50)) == created


def test_respond_idempotent():
    """回应幂等：同一动态只回应一次，不重复点赞/评论"""
    with _social_sandbox() as base:
        now = time.time()
        (base / "companions.json").write_text(json.dumps(_idle_state(now)))

        post_activity("u1", "小明", "node_completed", "完成了「变量」，得分 88",
                      {"node_name": "变量", "score": 88})
        # 时间回拨到 2 分钟前，满足「发布超 60 秒」条件
        acts = _load_activities()
        acts[0]["timestamp"] = now - 120
        _save_activities(acts)

        with patch("app.services.ai_companions.COMMENT_PROBABILITY", 1.0):
            assert ac.respond_to_user_activities(now) == 1

        act = _load_activities()[0]
        assert act["ai_responded"] is True
        assert 1 <= act["likes"] <= 2
        assert all(uid.startswith("ai-") for uid in act["liked_by"])
        assert len(act["comments"]) == 1
        comment = act["comments"][0]
        assert comment["is_ai"] is True
        assert comment["author_id"].startswith("ai-")
        # 评论时间在动态发布 1 分钟后、且不晚于当前
        assert act["timestamp"] + 60 <= comment["timestamp"] <= now

        # 再次回应：无新增
        with patch("app.services.ai_companions.COMMENT_PROBABILITY", 1.0):
            assert ac.respond_to_user_activities(now) == 0
        act2 = _load_activities()[0]
        assert act2["likes"] == act["likes"]
        assert len(act2["comments"]) == 1


def test_respond_skips_fresh_and_ai_activities():
    """刚发布（<60s）的动态与学伴自己的动态不被回应"""
    with _social_sandbox() as base:
        now = time.time()
        (base / "companions.json").write_text(json.dumps(_idle_state(now)))

        post_activity("u1", "小明", "node_completed", "刚刚完成", {"score": 90})
        assert ac.respond_to_user_activities(now) == 0
        assert _load_activities()[0].get("ai_responded") is None


def test_companion_leaderboard():
    """排行榜包含学伴条目且 is_ai 正确、口径字段齐全"""
    with _social_sandbox():
        ac.advance_companions()
        entries = ac.get_companion_leaderboard_entries()
        assert len(entries) == len(ac.COMPANIONS)
        for entry in entries:
            comp = next(c for c in ac.COMPANIONS if c["id"] == entry["user_id"])
            assert entry["is_ai"] is True
            assert entry["completed"] >= 2
            assert entry["score"] > 0
            lo, hi = comp["score_range"]
            assert lo <= entry["avg_mastery"] <= hi


def test_feed_normalization():
    """旧数据兼容：缺 is_ai 按 false、缺 comments 按 []"""
    from app.api.social import _normalize_activity

    old = {"id": "x", "user_id": "u1", "username": "小明",
           "type": "node_completed", "content": "c", "timestamp": 0}
    out = _normalize_activity(old)
    assert out["is_ai"] is False
    assert out["comments"] == []
