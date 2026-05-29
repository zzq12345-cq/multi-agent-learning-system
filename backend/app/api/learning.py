"""学习路径 API"""

from fastapi import APIRouter
from app.api.chat import sessions
from app.knowledge.python_graph import PYTHON_KNOWLEDGE_GRAPH

router = APIRouter(prefix="/api/learning", tags=["learning"])


@router.get("/path/{session_id}")
async def get_learning_path(session_id: str):
    """获取当前学习路径"""
    state = sessions.get(session_id)
    if not state:
        return {"exists": False, "path": None}

    path = state.get("learning_path", {})
    return {"exists": bool(path), "path": path or None}


@router.get("/profile/{session_id}")
async def get_student_profile(session_id: str):
    """获取学生画像"""
    state = sessions.get(session_id)
    if not state:
        return {"exists": False, "profile": None}

    profile = state.get("user_profile", {})
    return {"exists": bool(profile), "profile": profile or None}


@router.get("/graphs/python")
async def get_python_knowledge_graph():
    """获取预置 Python 知识图谱（用于展示）"""
    return PYTHON_KNOWLEDGE_GRAPH
