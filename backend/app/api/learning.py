"""学习相关 API"""

import time

from fastapi import APIRouter
from app.knowledge.python_graph import PYTHON_KNOWLEDGE_GRAPH
from app.knowledge.web_graph import WEB_KNOWLEDGE_GRAPH
from app.knowledge.datastructure_graph import DS_KNOWLEDGE_GRAPH
from app.services.rag import search_knowledge
from app.services.mastery import (
    calculate_mastery_decay,
    get_review_suggestions,
    MASTERY_THRESHOLD,
)

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


@router.get("/search")
async def search_docs(q: str, top_k: int = 3):
    """搜索教学文档"""
    results = search_knowledge(q, top_k=top_k)
    return {"query": q, "results": results}


@router.get("/mastery/{session_id}")
async def get_mastery_data(session_id: str):
    """获取掌握度数据（含衰减计算）"""
    from app.api.chat import sessions
    from app.services.session_store import load_session

    state = sessions.get(session_id) or load_session(session_id)
    if not state:
        return {"session_id": session_id, "mastery": {}, "review_suggestions": []}

    mastery_data = state.get("mastery_data", {})
    learning_path = state.get("learning_path", {})
    now = time.time()

    # 计算当前衰减后的掌握度
    current_mastery = {}
    nodes_map = {n["id"]: n["name"] for n in learning_path.get("nodes", [])}

    for node_id, data in mastery_data.items():
        mastery = data.get("mastery", 0)
        last_review = data.get("last_review_ts", now)
        decayed = calculate_mastery_decay(mastery, last_review, now)
        current_mastery[node_id] = {
            "name": nodes_map.get(node_id, node_id),
            "original_mastery": mastery,
            "current_mastery": decayed,
            "last_review_ts": last_review,
            "days_since_review": round((now - last_review) / 86400, 1),
            "needs_review": decayed < MASTERY_THRESHOLD and mastery >= MASTERY_THRESHOLD,
        }

    review_suggestions = get_review_suggestions(mastery_data, now)
    suggestion_names = [nodes_map.get(nid, nid) for nid in review_suggestions]

    return {
        "session_id": session_id,
        "mastery": current_mastery,
        "review_suggestions": suggestion_names,
        "threshold": MASTERY_THRESHOLD,
    }
