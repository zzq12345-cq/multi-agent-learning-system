"""历史会话 API — 直接扫描磁盘会话文件（轻量读取，后端重启后依然可用）"""

import json

from fastapi import APIRouter, HTTPException

from app.services.session_store import STORE_DIR, _validate_session_id

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("/sessions")
async def list_user_sessions(user_id: str = ""):
    """列出用户的历史会话（按更新时间倒序）

    归属规则：user_id 匹配本人的会话；user_id == session_id 为旧版
    未绑定用户的遗留会话，本地单机 demo 场景下一并展示。
    """
    items = []
    if STORE_DIR.exists():
        for f in STORE_DIR.glob("*.json"):
            try:
                data = json.loads(f.read_text())
            except (json.JSONDecodeError, OSError):
                continue
            owner = data.get("user_id", "")
            if user_id and owner not in (user_id, f.stem):
                continue
            msgs = data.get("messages", [])
            if not msgs:
                continue
            first_human = next(
                (m.get("content", "") for m in msgs if m.get("type") == "human"), ""
            )
            items.append({
                "session_id": f.stem,
                "title": first_human[:50] or "（无标题对话）",
                "message_count": len(msgs),
                "path_title": (data.get("learning_path") or {}).get("title", ""),
                "updated_at": int(f.stat().st_mtime),
            })
    items.sort(key=lambda x: -x["updated_at"])
    return {"sessions": items}


@router.get("/sessions/{session_id}")
async def get_history_session(session_id: str):
    """读取单条历史会话的完整内容（消息 + 路径 + 节点状态 + 掌握度）"""
    if not _validate_session_id(session_id):
        raise HTTPException(status_code=400, detail="无效的会话 ID")
    path = STORE_DIR / f"{session_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="会话不存在")
    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="会话文件损坏")
    messages = [
        {
            "role": "user" if m.get("type") == "human" else "assistant",
            "content": m.get("content", ""),
            "name": m.get("name"),
        }
        for m in data.get("messages", [])
        if m.get("type") in ("human", "ai")
    ]
    return {
        "session_id": session_id,
        "messages": messages,
        "learning_path": data.get("learning_path") or {},
        "node_states": data.get("node_states") or {},
        "mastery_data": data.get("mastery_data") or {},
        "exists": True,
    }
