"""会话存储单元测试"""

import tempfile
from pathlib import Path
from unittest.mock import patch
from langchain_core.messages import HumanMessage, AIMessage
from app.services.session_store import save_session, load_session, delete_session_file


def test_save_and_load():
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("app.services.session_store.STORE_DIR", Path(tmpdir)):
            state = {
                "messages": [
                    HumanMessage(content="你好"),
                    AIMessage(content="你好！", name="tutor"),
                ],
                "user_id": "test-123",
                "user_profile": {"knowledge_level": "beginner"},
                "current_intent": "learn",
                "learning_path": {"title": "Python"},
                "current_node": {},
                "agent_outputs": {"coordinator": "路由到 tutor"},
                "metadata": {},
                "node_states": {"n1": {"status": "available", "score": None}},
            }
            save_session("test-123", state)
            loaded = load_session("test-123")

            assert loaded is not None
            assert len(loaded["messages"]) == 2
            assert loaded["messages"][0].content == "你好"
            assert loaded["messages"][1].content == "你好！"
            assert loaded["user_profile"]["knowledge_level"] == "beginner"


def test_load_nonexistent():
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("app.services.session_store.STORE_DIR", Path(tmpdir)):
            result = load_session("nonexistent")
            assert result is None


def test_delete():
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("app.services.session_store.STORE_DIR", Path(tmpdir)):
            state = {
                "messages": [], "user_id": "x", "user_profile": {},
                "current_intent": "", "learning_path": {}, "current_node": {},
                "agent_outputs": {}, "metadata": {}, "node_states": {},
            }
            save_session("x", state)
            delete_session_file("x")
            assert load_session("x") is None
