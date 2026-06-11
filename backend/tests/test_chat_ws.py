"""WS 连续多轮对话回归测试 — 真实 uvicorn 传输层

回归场景：_run_graph_with_cancel 的 finally 若只 cancel 不 await
recv_task，cancel 监听协程未退出时外层循环再次 receive_json，
websockets 库抛 "cannot call recv while another coroutine is
already waiting for the next message"，表现为成功回复后又收到
error 事件且连接断开。TestClient 的进程内传输无此约束，必须用
真实 uvicorn + websockets 客户端才能覆盖。
"""

import asyncio
import json
import uuid

import uvicorn
from websockets.client import connect as ws_connect

import app.api.chat as chat
from app.main import app


class _FakeGraph:
    """空事件流：立即结束本轮图执行，不调用任何 LLM"""

    async def astream_events(self, state, version="v2"):
        return
        yield  # pragma: no cover


def test_ws_consecutive_rounds_no_concurrent_recv_error(monkeypatch):
    monkeypatch.setattr(chat, "agent_graph", _FakeGraph())
    # 测试不污染磁盘会话（避免出现在历史会话页）
    monkeypatch.setattr(chat, "save_session", lambda *a, **k: None)

    async def run():
        config = uvicorn.Config(app, host="127.0.0.1", port=0, log_level="warning")
        server = uvicorn.Server(config)
        server_task = asyncio.create_task(server.serve())
        while not server.started:
            await asyncio.sleep(0.05)
        port = server.servers[0].sockets[0].getsockname()[1]
        try:
            url = f"ws://127.0.0.1:{port}/api/chat/ws/{uuid.uuid4()}"
            async with ws_connect(url) as ws:
                for i, msg in enumerate(("你好", "继续"), 1):
                    await ws.send(json.dumps({"message": msg}))
                    while True:
                        ev = json.loads(await asyncio.wait_for(ws.recv(), timeout=10))
                        assert ev["type"] != "error", f"第 {i} 轮出现 error 事件: {ev}"
                        if ev["type"] == "done":
                            break
        finally:
            server.should_exit = True
            await server_task

    asyncio.run(run())
