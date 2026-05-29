"""社交 API — 动态 Feed + 排行榜 + 徽章"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from app.services.social import (
    get_feed,
    post_activity,
    like_activity,
    calculate_leaderboard,
    get_user_badges,
    check_badges,
    BADGE_DEFINITIONS,
)
from app.services.auth import decode_token

router = APIRouter(prefix="/api/social", tags=["social"])


def _get_current_user(authorization: str = Header(default="")) -> str:
    """从 Header 提取并验证用户 ID"""
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    if not token:
        raise HTTPException(401, "未提供认证 token")
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(401, "token 无效或已过期")
    return user_id


class SharePathRequest(BaseModel):
    username: str = Field(max_length=50)
    path_title: str = Field(max_length=200)
    domain: str = Field(max_length=50)


@router.get("/feed")
async def api_get_feed(limit: int = 20):
    """获取学习动态 Feed"""
    limit = min(max(1, limit), 50)
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
async def api_share_path(req: SharePathRequest, current_user: str = Depends(_get_current_user)):
    """分享学习路径"""
    activity = post_activity(
        user_id=current_user,
        username=req.username,
        activity_type="path_shared",
        content=f"分享了学习路径「{req.path_title}」",
        metadata={"path_title": req.path_title, "domain": req.domain},
    )
    return {"activity": activity}


@router.post("/like/{activity_id}")
async def api_like(activity_id: str, current_user: str = Depends(_get_current_user)):
    """点赞动态"""
    success = like_activity(activity_id, current_user)
    if not success:
        raise HTTPException(404, "动态不存在")
    return {"status": "ok"}


@router.get("/badge-definitions")
async def api_badge_definitions():
    """获取所有徽章定义"""
    return {"badges": BADGE_DEFINITIONS}
