"""对话 API — REST + WebSocket 事件流"""

import time
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from loguru import logger
from langchain_core.messages import HumanMessage
from app.agents.graph import agent_graph
from app.agents import AgentState
from app.deps import LLMConfig, get_llm_config
from app.knowledge.python_graph import PYTHON_KNOWLEDGE_GRAPH
from app.services.session_store import save_session, load_session, delete_session_file

router = APIRouter(prefix="/api/chat", tags=["chat"])

# 内存会话存储（Task 8 替换为持久化）
sessions: dict[str, dict] = {}


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    agent_name: str | None = None
    agent_outputs: dict = {}
    learning_path: dict | None = None
    user_profile: dict | None = None
    node_states: dict | None = None


def _now() -> int:
    return int(time.time() * 1000)


@router.post("/send", response_model=ChatResponse)
async def send_message(req: ChatRequest):
    """发送消息（REST 兼容接口）"""
    llm_config = get_llm_config()
    session_id = req.session_id or str(uuid.uuid4())

    state = sessions.get(session_id) or load_session(session_id) or _create_initial_state(session_id)
    state["llm_config"] = {
        "api_key": llm_config.api_key,
        "base_url": llm_config.base_url,
        "model": llm_config.model,
    }
    state["messages"] = list(state["messages"]) + [HumanMessage(content=req.message)]

    result = await agent_graph.ainvoke(state)
    sessions[session_id] = result
    save_session(session_id, result)

    ai_messages = [m for m in result["messages"] if m.type == "ai"]
    last_msg = ai_messages[-1] if ai_messages else None

    return ChatResponse(
        session_id=session_id,
        reply=last_msg.content if last_msg else "抱歉，我没有理解你的意思。",
        agent_name=getattr(last_msg, "name", None) if last_msg else None,
        agent_outputs=result.get("agent_outputs", {}),
        learning_path=result.get("learning_path") or None,
        user_profile=result.get("user_profile") or None,
        node_states=result.get("node_states") or None,
    )


@router.websocket("/ws/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str):
    """WebSocket 流式对话 — 推送 Agent 协作事件"""
    await websocket.accept()

    if session_id not in sessions:
        loaded = load_session(session_id)
        if loaded:
            sessions[session_id] = loaded
        else:
            sessions[session_id] = _create_initial_state(session_id)

    try:
        while True:
            raw = await websocket.receive_json()
            message = raw.get("message", "")
            llm_cfg = raw.get("llm_config", {})
            logger.info(f"[{session_id}] 收到消息: {message[:50]}...")

            # 如果前端未提供有效 api_key，回退到后端默认配置
            if not llm_cfg.get("api_key"):
                default_config = get_llm_config()
                llm_cfg = {
                    "api_key": default_config.api_key,
                    "base_url": default_config.base_url,
                    "model": default_config.model,
                }

            state = sessions[session_id]
            state["messages"] = list(state["messages"]) + [HumanMessage(content=message)]
            state["llm_config"] = llm_cfg
            state["event_log"] = []

            # 协调者开始
            await websocket.send_json({
                "type": "agent_start", "agent": "coordinator", "timestamp": _now(),
            })

            result = None
            current_agent = "coordinator"

            async for event in agent_graph.astream_events(state, version="v2"):
                kind = event.get("event", "")
                name = event.get("name", "")

                # Agent 节点开始
                if kind == "on_chain_start" and name in (
                    "profiler", "planner", "generator", "tutor", "assessor"
                ):
                    await websocket.send_json({
                        "type": "agent_end", "agent": current_agent, "timestamp": _now(),
                    })
                    await websocket.send_json({
                        "type": "route",
                        "route_from": current_agent,
                        "route_to": name,
                        "timestamp": _now(),
                    })
                    current_agent = name
                    await websocket.send_json({
                        "type": "agent_start", "agent": name, "timestamp": _now(),
                    })
                    logger.info(f"[{session_id}] Agent 路由: {current_agent} → {name}")

                # 流式 token（只推送适合直接展示的 Agent 输出）
                # coordinator 输出是路由决策，planner/assessor 输出是 JSON 需要后处理
                if kind == "on_chat_model_stream" and current_agent in (
                    "tutor", "generator", "profiler"
                ):
                    chunk = event.get("data", {}).get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        await websocket.send_json({
                            "type": "token",
                            "agent": current_agent,
                            "content": chunk.content,
                            "timestamp": _now(),
                        })

                # 图执行结束
                if kind == "on_chain_end" and name == "LangGraph":
                    result = event.get("data", {}).get("output", {})

            await websocket.send_json({
                "type": "agent_end", "agent": current_agent, "timestamp": _now(),
            })

            if result:
                sessions[session_id] = result
                save_session(session_id, result)

            final_state = result or sessions[session_id]
            ai_messages = [m for m in final_state.get("messages", []) if m.type == "ai"]
            last_msg = ai_messages[-1] if ai_messages else None

            await websocket.send_json({
                "type": "done",
                "content": last_msg.content if last_msg else "",
                "agent": getattr(last_msg, "name", None) if last_msg else None,
                "agent_outputs": final_state.get("agent_outputs", {}),
                "learning_path": final_state.get("learning_path"),
                "user_profile": final_state.get("user_profile"),
                "node_states": final_state.get("node_states"),
                "timestamp": _now(),
            })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"[{session_id}] WebSocket 错误: {e}")
        try:
            await websocket.send_json({
                "type": "error", "error": str(e), "timestamp": _now(),
            })
        except Exception:
            pass


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    state = sessions.get(session_id)
    if not state:
        return {"session_id": session_id, "messages": [], "exists": False}
    messages = [
        {"role": m.type, "content": m.content, "name": getattr(m, "name", None)}
        for m in state.get("messages", [])
    ]
    return {
        "session_id": session_id,
        "messages": messages,
        "user_profile": state.get("user_profile"),
        "learning_path": state.get("learning_path"),
        "exists": True,
    }


@router.get("/knowledge/python")
async def get_python_graph():
    return PYTHON_KNOWLEDGE_GRAPH


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    sessions.pop(session_id, None)
    delete_session_file(session_id)
    return {"status": "ok"}


def _create_initial_state(session_id: str) -> dict:
    return {
        "messages": [],
        "user_id": session_id,
        "user_profile": {},
        "current_intent": "",
        "learning_path": {},
        "current_node": {},
        "node_states": {},
        "agent_outputs": {},
        "next_agent": "",
        "metadata": {},
        "llm_config": {},
        "event_log": [],
    }

