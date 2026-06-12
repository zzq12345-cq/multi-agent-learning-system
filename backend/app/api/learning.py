"""学习相关 API"""

import hashlib
import json
import re
import time
from pathlib import Path

from fastapi import APIRouter
from loguru import logger
from app.deps import get_llm_config
from app.services.graph_store import list_all_graphs, get_graph
from app.services.rag import search_knowledge
from app.services.mastery import (
    calculate_mastery_decay,
    get_review_suggestions,
    MASTERY_THRESHOLD,
)

router = APIRouter(prefix="/api/learning", tags=["learning"])

# 学情报告评语缓存目录（按 mastery_data 哈希命中）
REPORTS_DIR = Path("./data/reports")


@router.get("/graphs/{domain}")
async def get_knowledge_graph(domain: str):
    """获取指定学科的知识图谱"""
    graph = get_graph(domain)
    if not graph:
        return {
            "error": f"未找到 {domain} 学科图谱",
            "available": [g["domain"] for g in list_all_graphs()],
        }
    return graph


@router.get("/graphs")
async def list_graphs():
    """列出所有可用学科图谱"""
    return {"graphs": list_all_graphs()}


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


def _mastery_hash(mastery_data: dict, node_states: dict | None = None) -> str:
    """掌握度 + 节点状态内容哈希，作为评语缓存键

    评语 prompt 同时引用完成节点数/平均分（来源 node_states），
    只哈希 mastery 会导致节点状态变化后旧评语仍命中缓存。
    """
    payload = json.dumps(
        {"mastery": mastery_data, "nodes": node_states or {}},
        sort_keys=True, ensure_ascii=False,
    )
    return hashlib.md5(payload.encode()).hexdigest()


def _load_cached_comment(session_id: str, data_hash: str) -> str | None:
    """读取缓存评语，哈希不一致视为未命中"""
    path = REPORTS_DIR / f"{session_id}.json"
    if not path.exists():
        return None
    try:
        cached = json.loads(path.read_text())
        if cached.get("hash") == data_hash:
            return cached.get("comment")
    except (json.JSONDecodeError, OSError):
        pass
    return None


def _save_cached_comment(session_id: str, data_hash: str, comment: str) -> None:
    """缓存评语到 data/reports/{session_id}.json（仅限 UUID 形式，防路径穿越）"""
    if not re.match(r"^[a-f0-9\-]{36}$", session_id):
        return
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    (REPORTS_DIR / f"{session_id}.json").write_text(
        json.dumps(
            {"hash": data_hash, "comment": comment, "generated_at": time.time()},
            ensure_ascii=False,
        )
    )


def _build_report(state: dict, now: float) -> dict:
    """汇总会话学情：路径信息 + 节点状态统计 + 掌握度（含衰减）+ 薄弱点"""
    learning_path = state.get("learning_path") or {}
    nodes = learning_path.get("nodes", [])
    node_states = state.get("node_states") or {}
    mastery_data = state.get("mastery_data") or {}

    completed = sum(1 for ns in node_states.values() if ns.get("status") == "completed")
    in_progress = sum(1 for ns in node_states.values() if ns.get("status") == "in_progress")
    scores = [ns.get("score") for ns in node_states.values() if isinstance(ns.get("score"), (int, float))]
    avg_score = round(sum(scores) / len(scores), 1) if scores else None

    mastery_items = []
    weak_points = []
    for node in nodes:
        data = mastery_data.get(node["id"])
        if not data:
            continue
        decayed = calculate_mastery_decay(data.get("mastery", 0), data.get("last_review_ts", now), now)
        item = {
            "id": node["id"],
            "name": node.get("name", node["id"]),
            "difficulty": node.get("difficulty", 1),
            "mastery": data.get("mastery", 0),
            "current_mastery": decayed,
            "attempts": data.get("attempts", 0),
        }
        mastery_items.append(item)
        # 薄弱点只统计已测评节点，未学节点不算薄弱
        if item["attempts"] > 0 and decayed < MASTERY_THRESHOLD:
            weak_points.append({"id": item["id"], "name": item["name"], "current_mastery": decayed})

    return {
        "username": state.get("metadata", {}).get("username", ""),
        "path_title": learning_path.get("title", ""),
        "domain": learning_path.get("domain", ""),
        "estimated_hours": learning_path.get("estimated_hours", 0),
        "generated_at": now,
        "total_nodes": len(nodes),
        "completed_nodes": completed,
        "in_progress_nodes": in_progress,
        "avg_score": avg_score,
        "review_count": len(get_review_suggestions(mastery_data, now)),
        "mastery": mastery_items,
        "weak_points": weak_points,
    }


def _template_comment(report: dict) -> str:
    """LLM 不可用时的模板评语兜底"""
    weak_names = [w["name"] for w in report["weak_points"][:3]]
    weak_text = (
        f"「{'、'.join(weak_names)}」掌握度偏低，建议优先复习巩固。"
        if weak_names
        else "目前没有明显薄弱点，继续保持。"
    )
    avg_text = f"，平均得分 {report['avg_score']}" if report["avg_score"] is not None else ""
    return (
        f"本阶段共完成 {report['completed_nodes']}/{report['total_nodes']} 个知识点{avg_text}。"
        f"{weak_text}"
        "建议保持稳定的学习节奏，按遗忘曲线及时复习，再进入下一阶段的进阶内容。"
    )


async def _generate_ai_comment(report: dict, session_id: str, data_hash: str) -> str:
    """生成 AI 评语：缓存命中直接返回，LLM 失败降级为模板"""
    cached = _load_cached_comment(session_id, data_hash)
    if cached:
        return cached

    config = get_llm_config()
    if not config.api_key:
        return _template_comment(report)

    weak_names = [w["name"] for w in report["weak_points"][:5]]
    prompt = (
        "你是一位学习教练。请根据以下学情数据，用 3-4 句话给出个性化总结与下阶段建议，"
        "语气友好具体，直接输出正文，不要标题、列表或客套开场：\n"
        f"- 学习路径：{report['path_title'] or '未命名路径'}\n"
        f"- 完成进度：{report['completed_nodes']}/{report['total_nodes']} 个知识点\n"
        f"- 平均得分：{report['avg_score'] if report['avg_score'] is not None else '暂无'}\n"
        f"- 待复习知识点数：{report['review_count']}\n"
        f"- 薄弱点：{'、'.join(weak_names) if weak_names else '无'}"
    )
    try:
        from app.agents import get_llm

        result = await get_llm(config, temperature=0.7).ainvoke(prompt)
        comment = (result.content or "").strip()
        if not comment:
            return _template_comment(report)
        _save_cached_comment(session_id, data_hash, comment)
        return comment
    except Exception as e:
        logger.warning(f"[{session_id}] 学情报告评语生成失败，降级为模板: {e}")
        return _template_comment(report)


@router.get("/report/{session_id}")
async def get_learning_report(session_id: str):
    """生成一页式学情报告（数据汇总 + AI 评语）"""
    from app.api.chat import sessions
    from app.services.session_store import load_session

    state = sessions.get(session_id) or load_session(session_id)
    if not state or not state.get("learning_path"):
        return {"session_id": session_id, "report": None}

    now = time.time()
    report = _build_report(state, now)
    data_hash = _mastery_hash(state.get("mastery_data") or {}, state.get("node_states") or {})
    report["ai_comment"] = await _generate_ai_comment(report, session_id, data_hash)
    return {"session_id": session_id, "report": report}
