"""对话 API — REST + WebSocket"""

import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request, Depends
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from app.agents.graph import agent_graph
from app.agents import AgentState
from app.deps import LLMConfig, get_llm_config
from app.knowledge.python_graph import PYTHON_KNOWLEDGE_GRAPH

router = APIRouter(prefix="/api/chat", tags=["chat"])

# 内存会话存储
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


@router.post("/send", response_model=ChatResponse)
async def send_message(req: ChatRequest):
    """发送消息（REST 接口）"""
    llm_config = get_llm_config()
    session_id = req.session_id or str(uuid.uuid4())

    # 获取或创建会话状态
    state = sessions.get(session_id, _create_initial_state(session_id))

    # 注入 LLM 配置到状态
    state["llm_config"] = {
        "api_key": llm_config.api_key,
        "base_url": llm_config.base_url,
        "model": llm_config.model,
    }

    # 添加用户消息
    state["messages"] = list(state["messages"]) + [HumanMessage(content=req.message)]

    # 运行 Agent 图
    result = await agent_graph.ainvoke(state)

    # 更新会话状态
    sessions[session_id] = result

    # 提取最后一条 AI 消息
    ai_messages = [m for m in result["messages"] if m.type == "ai"]
    last_msg = ai_messages[-1] if ai_messages else None

    return ChatResponse(
        session_id=session_id,
        reply=last_msg.content if last_msg else "抱歉，我没有理解你的意思。",
        agent_name=getattr(last_msg, "name", None) if last_msg else None,
        agent_outputs=result.get("agent_outputs", {}),
        learning_path=result.get("learning_path") or None,
        user_profile=result.get("user_profile") or None,
    )


@router.websocket("/ws/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str):
    """WebSocket 流式对话"""
    await websocket.accept()

    if session_id not in sessions:
        sessions[session_id] = _create_initial_state(session_id)

    try:
        while True:
            # 接收消息（JSON 格式，包含 message 和 llm_config）
            raw = await websocket.receive_json()
            message = raw.get("message", "")
            llm_cfg = raw.get("llm_config", {})

            state = sessions[session_id]
            state["messages"] = list(state["messages"]) + [HumanMessage(content=message)]
            state["llm_config"] = llm_cfg

            # 通知前端开始处理
            await websocket.send_json({"type": "start"})

            # 执行 Agent 图
            result = await agent_graph.ainvoke(state)
            sessions[session_id] = result

            # 提取回复
            ai_messages = [m for m in result["messages"] if m.type == "ai"]
            last_msg = ai_messages[-1] if ai_messages else None

            await websocket.send_json({
                "type": "done",
                "reply": last_msg.content if last_msg else "",
                "agent_name": getattr(last_msg, "name", None) if last_msg else None,
                "agent_outputs": result.get("agent_outputs", {}),
                "learning_path": result.get("learning_path"),
                "user_profile": result.get("user_profile"),
            })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """获取会话状态"""
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
    """获取预置 Python 知识图谱"""
    return PYTHON_KNOWLEDGE_GRAPH


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """删除会话"""
    sessions.pop(session_id, None)
    return {"status": "ok"}


def _create_initial_state(session_id: str) -> dict:
    """创建初始会话状态"""
    return {
        "messages": [],
        "user_id": session_id,
        "user_profile": {},
        "current_intent": "",
        "learning_path": {},
        "current_node": {},
        "agent_outputs": {},
        "next_agent": "",
        "metadata": {},
        "llm_config": {},
    }
