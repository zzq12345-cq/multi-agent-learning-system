"""学习相关 API"""

from fastapi import APIRouter
from app.knowledge.python_graph import PYTHON_KNOWLEDGE_GRAPH
from app.knowledge.web_graph import WEB_KNOWLEDGE_GRAPH
from app.knowledge.datastructure_graph import DS_KNOWLEDGE_GRAPH

router = APIRouter(prefix="/api/learning", tags=["learning"])

GRAPHS = {
    "python": PYTHON_KNOWLEDGE_GRAPH,
    "web": WEB_KNOWLEDGE_GRAPH,
    "datastructure": DS_KNOWLEDGE_GRAPH,
}


@router.get("/graphs/{domain}")
async def get_knowledge_graph(domain: str):
    """获取指定学科的知识图谱"""
    graph = GRAPHS.get(domain)
    if not graph:
        return {"error": f"未找到 {domain} 学科图谱", "available": list(GRAPHS.keys())}
    return graph


@router.get("/graphs")
async def list_graphs():
    """列出所有可用学科图谱"""
    return {
        "graphs": [
            {"domain": k, "title": v["title"], "nodes_count": len(v["nodes"])}
            for k, v in GRAPHS.items()
        ]
    }


@router.get("/path/{session_id}")
async def get_learning_path(session_id: str):
    """获取用户学习路径"""
    from app.api.chat import sessions
    state = sessions.get(session_id)
    if not state:
        return {"session_id": session_id, "path": None}
    return {"session_id": session_id, "path": state.get("learning_path")}


@router.get("/profile/{session_id}")
async def get_profile(session_id: str):
    """获取用户画像"""
    from app.api.chat import sessions
    state = sessions.get(session_id)
    if not state:
        return {"session_id": session_id, "profile": None}
    return {"session_id": session_id, "profile": state.get("user_profile")}
