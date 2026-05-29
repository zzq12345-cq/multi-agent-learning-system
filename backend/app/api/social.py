"""社交 API — 动态 Feed + 排行榜 + 徽章"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.social import (
    get_feed,
    post_activity,
    like_activity,
    calculate_leaderboard,
    get_user_badges,
    check_badges,
    BADGE_DEFINITIONS,
)

router = APIRouter(prefix="/api/social", tags=["social"])


class SharePathRequest(BaseModel):
    user_id: str
    username: str
    path_title: str
    domain: str


class LikeRequest(BaseModel):
    user_id: str


@router.get("/feed")
async def api_get_feed(limit: int = 20):
    """获取学习动态 Feed"""
    return {"activities": get_feed(limit)}


@router.get("/leaderboard")
async def api_get_leaderboard():
    """获取排行榜"""
    from app.api.chat import sessions
    from app.services.session_store import load_session, list_sessions

    # 合并内存 sessions 和持久化 sessions
    all_sessions = dict(sessions)
    for sid in list_sessions():
        if sid not in all_sessions:
            loaded = load_session(sid)
            if loaded:
                all_sessions[sid] = loaded

    leaderboard = calculate_leaderboard(all_sessions)
    return {"leaderboard": leaderboard}


@router.get("/badges/{user_id}")
async def api_get_badges(user_id: str):
    """获取用户徽章"""
    badges = get_user_badges(user_id)
    return {"user_id": user_id, "badges": badges}


@router.post("/share-path")
async def api_share_path(req: SharePathRequest):
    """分享学习路径"""
    activity = post_activity(
        user_id=req.user_id,
        username=req.username,
        activity_type="path_shared",
        content=f"分享了学习路径「{req.path_title}」",
        metadata={"path_title": req.path_title, "domain": req.domain},
    )
    return {"activity": activity}


@router.post("/like/{activity_id}")
async def api_like(activity_id: str, req: LikeRequest):
    """点赞动态"""
    success = like_activity(activity_id, req.user_id)
    if not success:
        raise HTTPException(404, "动态不存在")
    return {"status": "ok"}


@router.get("/badge-definitions")
async def api_badge_definitions():
    """获取所有徽章定义"""
    return {"badges": BADGE_DEFINITIONS}
