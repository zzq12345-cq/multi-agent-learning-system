"""社交 API — 动态 Feed + 排行榜 + 徽章"""

from fastapi import APIRouter, HTTPException, Depends, Header
from loguru import logger
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
from app.services.ai_companions import (
    advance_companions,
    respond_to_user_activities,
    get_companion_leaderboard_entries,
)
from app.services.auth import decode_token

router = APIRouter(prefix="/api/social", tags=["social"])


def _tick_companions():
    """AI 学伴惰性结算（毫秒级同步，失败不影响接口响应）"""
    try:
        advance_companions()
        respond_to_user_activities()
    except Exception as e:
        logger.debug(f"AI 学伴结算失败: {e}")


def _normalize_activity(act: dict) -> dict:
    """旧数据兼容（缺 is_ai 按 false、缺 comments 按 []），并剔除内部字段"""
    act.setdefault("is_ai", False)
    act.setdefault("comments", [])
    # ai_responded 是学伴回应的幂等标记，属实现细节，不进入 API 契约
    return {k: v for k, v in act.items() if k != "ai_responded"}


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
    _tick_companions()
    return {"activities": [_normalize_activity(a) for a in get_feed(limit)]}


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

    _tick_companions()
    leaderboard = calculate_leaderboard(all_sessions)
    for entry in leaderboard:
        entry.setdefault("is_ai", False)
    # 并入 AI 学伴条目，统一按综合评分重排
    merged = leaderboard + get_companion_leaderboard_entries()
    merged.sort(key=lambda x: x["score"], reverse=True)
    return {"leaderboard": merged[:10]}


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
