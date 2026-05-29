"""轻量社交引擎 — 动态 Feed + 排行榜 + 徽章"""

import fcntl
import json
import time
import uuid
from pathlib import Path

SOCIAL_DIR = Path("./data/social")
ACTIVITIES_FILE = SOCIAL_DIR / "activities.json"
BADGES_FILE = SOCIAL_DIR / "badges.json"


def _ensure_dir():
    SOCIAL_DIR.mkdir(parents=True, exist_ok=True)


def _read_json_locked(filepath: Path):
    """带文件锁的 JSON 读取"""
    _ensure_dir()
    if not filepath.exists():
        return None
    with open(filepath, 'r') as f:
        fcntl.flock(f, fcntl.LOCK_SH)
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return None
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def _write_json_locked(filepath: Path, data):
    """带文件锁的 JSON 写入（原子）"""
    _ensure_dir()
    import tempfile, os
    tmp_fd, tmp_path = tempfile.mkstemp(dir=filepath.parent, suffix=".tmp")
    try:
        with os.fdopen(tmp_fd, 'w') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, str(filepath))
    except Exception:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise


def _load_activities() -> list[dict]:
    return _read_json_locked(ACTIVITIES_FILE) or []


def _save_activities(activities: list[dict]):
    _write_json_locked(ACTIVITIES_FILE, activities)


def _load_badges() -> dict:
    return _read_json_locked(BADGES_FILE) or {}


def _save_badges(badges: dict):
    _write_json_locked(BADGES_FILE, badges)


# ===== 动态 Feed =====

def post_activity(
    user_id: str,
    username: str,
    activity_type: str,
    content: str,
    metadata: dict = None,
) -> dict:
    """发布一条学习动态"""
    activities = _load_activities()
    activity = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "username": username,
        "type": activity_type,
        "content": content,
        "metadata": metadata or {},
        "likes": 0,
        "liked_by": [],
        "timestamp": time.time(),
    }
    activities.insert(0, activity)
    # 只保留最近 200 条
    activities = activities[:200]
    _save_activities(activities)
    return activity


def get_feed(limit: int = 20) -> list[dict]:
    """获取全局动态 Feed"""
    activities = _load_activities()
    return activities[:limit]


def like_activity(activity_id: str, user_id: str) -> bool:
    """点赞动态"""
    activities = _load_activities()
    for act in activities:
        if act["id"] == activity_id:
            if user_id not in act.get("liked_by", []):
                act["likes"] = act.get("likes", 0) + 1
                act.setdefault("liked_by", []).append(user_id)
                _save_activities(activities)
            return True
    return False


# ===== 排行榜 =====

def calculate_leaderboard(sessions_data: dict) -> list[dict]:
    """计算排行榜

    综合评分 = 完成节点数×0.4 + 平均掌握度×0.4 + 学习天数×0.2
    sessions_data: {session_id: state_dict}
    """
    user_scores = {}

    for session_id, state in sessions_data.items():
        user_id = state.get("user_id", session_id)
        node_states = state.get("node_states", {})
        mastery_data = state.get("mastery_data", {})

        # 完成节点数
        completed = sum(
            1 for v in node_states.values()
            if v.get("status") == "completed"
        )

        # 平均掌握度
        masteries = [
            v.get("mastery", 0)
            for v in mastery_data.values()
            if v.get("mastery", 0) > 0
        ]
        avg_mastery = sum(masteries) / len(masteries) if masteries else 0

        # 学习天数（简化：有活动记录就算 1 天）
        days = 1 if node_states else 0

        # 综合评分
        score = completed * 0.4 + avg_mastery * 0.4 + days * 0.2

        if score > 0:
            username = state.get("metadata", {}).get(
                "username", f"用户{session_id[:6]}"
            )
            entry = {
                "user_id": user_id,
                "username": username,
                "score": round(score, 1),
                "completed": completed,
                "avg_mastery": round(avg_mastery, 1),
            }
            if user_id in user_scores:
                if score > user_scores[user_id]["score"]:
                    user_scores[user_id] = entry
            else:
                user_scores[user_id] = entry

    ranked = sorted(
        user_scores.values(), key=lambda x: x["score"], reverse=True
    )
    return ranked[:10]


# ===== 徽章 =====

BADGE_DEFINITIONS = [
    {
        "id": "first_learn",
        "name": "初学者",
        "icon": "🌱",
        "description": "完成首次学习",
    },
    {
        "id": "perfect_score",
        "name": "满分达人",
        "icon": "🎯",
        "description": "任一评估得分 ≥ 95",
    },
    {
        "id": "path_master",
        "name": "路径大师",
        "icon": "🗺️",
        "description": "完成一条完整学习路径",
    },
    {
        "id": "streak_3",
        "name": "坚持不懈",
        "icon": "🔥",
        "description": "连续 3 天学习",
    },
    {
        "id": "multi_subject",
        "name": "全科学霸",
        "icon": "🌟",
        "description": "在 2 个以上学科有学习记录",
    },
]


def check_badges(user_id: str, state: dict) -> list[str]:
    """检查并颁发徽章，返回新获得的徽章 ID 列表"""
    badges = _load_badges()
    user_badges = set(badges.get(user_id, []))
    new_badges = []

    node_states = state.get("node_states", {})
    metadata = state.get("metadata", {})
    learning_path = state.get("learning_path", {})

    completed_count = sum(
        1 for v in node_states.values()
        if v.get("status") == "completed"
    )

    # 初学者：完成首次学习
    if "first_learn" not in user_badges and completed_count >= 1:
        user_badges.add("first_learn")
        new_badges.append("first_learn")

    # 满分达人：任一评估 ≥ 95
    if "perfect_score" not in user_badges:
        last_assessment = metadata.get("last_assessment", {})
        if last_assessment.get("score", 0) >= 95:
            user_badges.add("perfect_score")
            new_badges.append("perfect_score")

    # 路径大师：完成一条完整路径
    if "path_master" not in user_badges and learning_path:
        total_nodes = len(learning_path.get("nodes", []))
        if total_nodes > 0 and completed_count >= total_nodes:
            user_badges.add("path_master")
            new_badges.append("path_master")

    # 全科学霸：2 个以上学科
    if "multi_subject" not in user_badges:
        activities = _load_activities()
        user_activities = [
            a for a in activities if a.get("user_id") == user_id
        ]
        domains = set()
        for a in user_activities:
            domain = a.get("metadata", {}).get("domain")
            if domain:
                domains.add(domain)
        if len(domains) >= 2:
            user_badges.add("multi_subject")
            new_badges.append("multi_subject")

    # 保存
    if new_badges:
        badges[user_id] = list(user_badges)
        _save_badges(badges)

    return new_badges


def get_user_badges(user_id: str) -> list[dict]:
    """获取用户徽章（含已获得和未解锁）"""
    badges = _load_badges()
    user_badges = set(badges.get(user_id, []))

    result = []
    for badge in BADGE_DEFINITIONS:
        result.append({
            **badge,
            "earned": badge["id"] in user_badges,
        })
    return result
