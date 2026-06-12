"""对话 API — REST + WebSocket 事件流"""

import asyncio
import time
import uuid
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from loguru import logger
from langchain_core.messages import HumanMessage
from app.agents.graph import agent_graph
from app.agents import AgentState
from app.deps import LLMConfig, get_llm_config
from app.knowledge.python_graph import PYTHON_KNOWLEDGE_GRAPH
from app.services.session_store import save_session, load_session, delete_session_file
from app.services.auth import decode_token

router = APIRouter(prefix="/api/chat", tags=["chat"])

# 安全限制常量
MAX_SESSIONS = 100
MAX_MESSAGE_LENGTH = 5000
AGENT_TIMEOUT_SECONDS = 300  # Agent 执行超时时间（秒）

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

    try:
        async with asyncio.timeout(AGENT_TIMEOUT_SECONDS):
            result = await agent_graph.ainvoke(state)
    except asyncio.TimeoutError:
        logger.warning(f"[{session_id}] REST /send 执行超时（{AGENT_TIMEOUT_SECONDS}s）")
        raise HTTPException(504, "处理超时，请重试或简化问题")
    except Exception as e:
        logger.error(f"[{session_id}] REST /send 执行失败: {e}")
        raise HTTPException(503, "服务处理异常，请稍后重试")

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
    # 可选认证：从 query param 获取 token
    token = websocket.query_params.get("token", "")
    if token:
        user_id = decode_token(token)
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return

    await websocket.accept()

    if session_id not in sessions:
        loaded = load_session(session_id)
        if loaded:
            sessions[session_id] = loaded
        else:
            # 内存上限保护
            if len(sessions) >= MAX_SESSIONS:
                oldest = next(iter(sessions))
                del sessions[oldest]
            sessions[session_id] = _create_initial_state(session_id)

    # 绑定真实用户 ID（带 token 连接时），历史会话按用户归属
    if token and user_id:
        sessions[session_id]["user_id"] = user_id

    # 图执行期间收到的普通消息暂存于此，待本轮结束后处理
    pending_messages: list[dict] = []
    try:
        while True:
            raw = pending_messages.pop(0) if pending_messages else await websocket.receive_json()

            # 空闲状态收到取消请求（执行已结束），直接忽略
            if raw.get("type") == "cancel":
                logger.debug(f"[{session_id}] 当前无执行任务，忽略取消请求")
                continue

            message = raw.get("message", "")
            if len(message) > MAX_MESSAGE_LENGTH:
                await websocket.send_json({
                    "type": "error", "error": "消息过长，请精简后重试", "timestamp": _now(),
                })
                continue
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
            state["_prev_node_states"] = dict(state.get("node_states", {}))
            state["_prev_learning_path"] = dict(state.get("learning_path", {})) if state.get("learning_path") else {}

            # 协调者开始
            await websocket.send_json({
                "type": "agent_start", "agent": "coordinator", "timestamp": _now(),
            })

            result = None
            tracker = {"agent": "coordinator"}
            cancelled = False

            try:
                async with asyncio.timeout(AGENT_TIMEOUT_SECONDS):
                    cancelled, result = await _run_graph_with_cancel(
                        websocket, session_id, state, tracker, pending_messages,
                    )
            except asyncio.TimeoutError:
                logger.warning(f"[{session_id}] Agent 执行超时（{AGENT_TIMEOUT_SECONDS}s）")
                await _send_abort_events(
                    websocket, tracker["agent"], "处理超时，请重试或简化问题",
                )
                continue
            except WebSocketDisconnect:
                raise
            except Exception as e:
                # 单条消息执行失败：回错误事件并复位前端状态，连接保持
                logger.error(f"[{session_id}] Agent 执行失败: {e}")
                error_msg = _friendly_error(e)
                await _send_abort_events(
                    websocket, tracker["agent"], error_msg,
                )
                continue

            if cancelled:
                logger.info(f"[{session_id}] 用户取消执行")
                await websocket.send_json({
                    "type": "agent_end", "agent": tracker["agent"], "timestamp": _now(),
                })
                await websocket.send_json({
                    "type": "system_notice", "content": "已取消本次请求", "timestamp": _now(),
                })
                continue

            await websocket.send_json({
                "type": "agent_end", "agent": tracker["agent"], "timestamp": _now(),
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
                "mastery_data": final_state.get("mastery_data"),
                "timestamp": _now(),
            })

            # 检测路径调整并通知前端
            try:
                old_path = state.get("_prev_learning_path", {})
                new_path = final_state.get("learning_path", {})
                if old_path and new_path and old_path != new_path:
                    old_nodes = set(n.get("id") for n in old_path.get("nodes", []))
                    new_nodes = set(n.get("id") for n in new_path.get("nodes", []))
                    added = new_nodes - old_nodes
                    if added:
                        nodes_map = {n["id"]: n["name"] for n in new_path.get("nodes", [])}
                        added_names = [nodes_map.get(nid, nid) for nid in list(added)[:3]]
                        await websocket.send_json({
                            "type": "system_notice",
                            "content": f"📋 学习路径已调整：新增知识点「{'、'.join(added_names)}」",
                            "timestamp": _now(),
                        })
            except Exception:
                pass

            # 社交：检查新完成节点并发布动态
            try:
                from app.services.social import post_activity, check_badges, BADGE_DEFINITIONS
                new_node_states = final_state.get("node_states", {})
                old_node_states = state.get("_prev_node_states", {})
                username = final_state.get("metadata", {}).get("username", f"用户{session_id[:6]}")
                user_id = final_state.get("user_id", session_id)
                learning_path = final_state.get("learning_path", {})
                nodes_map = {n["id"]: n["name"] for n in learning_path.get("nodes", [])}

                for nid, ns in new_node_states.items():
                    old_status = old_node_states.get(nid, {}).get("status")
                    if ns.get("status") == "completed" and old_status != "completed":
                        node_name = nodes_map.get(nid, nid)
                        score = ns.get("score", "")
                        content = f"完成了「{node_name}」" + (f"，得分 {score}" if score else "")
                        post_activity(
                            user_id, username, "node_completed", content,
                            {"node_id": nid, "node_name": node_name, "score": score, "domain": learning_path.get("domain", "")},
                        )

                # 检查徽章
                new_badges = check_badges(user_id, final_state)
                for badge_id in new_badges:
                    badge = next((b for b in BADGE_DEFINITIONS if b["id"] == badge_id), None)
                    if badge:
                        post_activity(
                            user_id, username, "badge_earned",
                            f"获得徽章「{badge['name']}」{badge['icon']}",
                            {"badge_id": badge_id},
                        )
            except Exception as e:
                logger.debug(f"[{session_id}] 社交事件触发失败: {e}")

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"[{session_id}] WebSocket 错误: {e}")
        try:
            await websocket.send_json({
                "type": "error", "error": "服务处理异常，请重试", "timestamp": _now(),
            })
        except Exception:
            pass


def _consume_task_exception(task: asyncio.Task) -> None:
    """提前消费任务异常，避免取消路径下产生 exception never retrieved 告警"""
    if not task.cancelled():
        task.exception()


async def _run_graph_with_cancel(
    websocket: WebSocket,
    session_id: str,
    state: dict,
    tracker: dict,
    pending_messages: list[dict],
) -> tuple[bool, dict | None]:
    """图执行放入独立 Task，并发监听 cancel 消息实现真实取消

    返回 (是否被取消, 图最终输出)；图执行异常原样抛出，由调用方处理。
    """
    graph_task = asyncio.create_task(
        _stream_graph_events(websocket, session_id, state, tracker)
    )
    graph_task.add_done_callback(_consume_task_exception)
    recv_task: asyncio.Task | None = None
    try:
        while True:
            recv_task = asyncio.create_task(websocket.receive_json())
            await asyncio.wait(
                {graph_task, recv_task}, return_when=asyncio.FIRST_COMPLETED,
            )
            if recv_task.done():
                raw = recv_task.result()  # 客户端断开时抛出 WebSocketDisconnect
                if raw.get("type") == "cancel":
                    # 图已在同一 tick 完成：结果有效，保留并正常走完（落盘）
                    if graph_task.done():
                        return False, graph_task.result()
                    # 真正取消：同时丢弃执行期间排队的消息，避免取消后立即被执行
                    pending_messages.clear()
                    return True, None
                # 执行期间收到的普通消息暂存，待本轮结束后处理
                pending_messages.append(raw)
            if graph_task.done():
                return False, graph_task.result()
    finally:
        for task in (graph_task, recv_task):
            if task is not None and not task.done():
                task.cancel()
                # 必须等待取消真正完成：receive_json 未完全退出时，外层循环
                # 再次 receive 会触发 websockets 并发接收错误
                # （"cannot call recv while another coroutine is already waiting"）
                try:
                    await task
                except BaseException:
                    pass


async def _stream_graph_events(
    websocket: WebSocket, session_id: str, state: dict, tracker: dict,
) -> dict | None:
    """消费图事件流并推送 WS 事件，返回图最终输出"""
    result = None
    async for event in agent_graph.astream_events(state, version="v2"):
        kind = event.get("event", "")
        name = event.get("name", "")

        # Agent 节点开始
        if kind == "on_chain_start" and name in (
            "profiler", "planner", "generator", "tutor", "assessor"
        ):
            await websocket.send_json({
                "type": "agent_end", "agent": tracker["agent"], "timestamp": _now(),
            })
            # 从 coordinator 输出中获取路由理由
            coordinator_output = state.get("agent_outputs", {}).get("coordinator", "")
            route_reasons = {
                "profiler": "检测到需要评估学习水平",
                "planner": "准备规划个性化学习路径",
                "generator": "开始生成定制学习资源",
                "tutor": "进入答疑解惑模式",
                "assessor": "启动学习效果评估",
            }
            # 兼容新旧格式：尝试解析 JSON，失败则用原值或兜底
            reasoning = coordinator_output
            if coordinator_output:
                try:
                    import json
                    parsed = json.loads(coordinator_output)
                    if isinstance(parsed, dict) and "reasoning" in parsed:
                        reasoning = coordinator_output  # 保持 JSON 字符串，前端解析
                    elif "意图识别" in coordinator_output:
                        reasoning = coordinator_output
                    else:
                        reasoning = route_reasons.get(name, coordinator_output)
                except (json.JSONDecodeError, ValueError):
                    reasoning = coordinator_output if "意图识别" in coordinator_output else route_reasons.get(name, coordinator_output)
            else:
                reasoning = route_reasons.get(name, "")
            await websocket.send_json({
                "type": "route",
                "route_from": tracker["agent"],
                "route_to": name,
                "reasoning": reasoning,
                "timestamp": _now(),
            })
            tracker["agent"] = name
            await websocket.send_json({
                "type": "agent_start", "agent": name, "timestamp": _now(),
            })
            logger.info(f"[{session_id}] Agent 路由: {tracker['agent']} → {name}")

        # 流式 token（只推送适合直接展示的 Agent 输出）
        # coordinator 输出是路由决策，planner/assessor 输出是 JSON 需要后处理
        # 带 internal 标记的调用（如摸底出题）属内部 JSON 生成，不外泄
        if (
            kind == "on_chat_model_stream"
            and tracker["agent"] in ("tutor", "generator", "profiler")
            and "internal" not in (event.get("tags") or [])
        ):
            chunk = event.get("data", {}).get("chunk")
            if chunk and hasattr(chunk, "content") and chunk.content:
                await websocket.send_json({
                    "type": "token",
                    "agent": tracker["agent"],
                    "content": chunk.content,
                    "timestamp": _now(),
                })

        # 出题互审事件（评估师出题 → 审查层审题，agent 节点内派发）
        if kind == "on_custom_event" and name == "review_verdict":
            data = event.get("data", {}) or {}
            await websocket.send_json({
                "type": "review_verdict",
                "verdict": data.get("verdict", "pass"),
                "issues": data.get("issues", []),
                "round": data.get("round", 1),
                "timestamp": _now(),
            })

        # 图执行结束
        if kind == "on_chain_end" and name == "LangGraph":
            result = event.get("data", {}).get("output", {})

    return result


async def _send_abort_events(websocket: WebSocket, agent: str, error_msg: str) -> None:
    """执行中止时补发 agent_end + error 事件，复位前端状态"""
    await websocket.send_json({
        "type": "agent_end", "agent": agent, "timestamp": _now(),
    })
    await websocket.send_json({
        "type": "error", "error": error_msg, "timestamp": _now(),
    })


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
        "mastery_data": {},
        "agent_outputs": {},
        "next_agent": "",
        "metadata": {},
        "llm_config": {},
        "event_log": [],
    }

