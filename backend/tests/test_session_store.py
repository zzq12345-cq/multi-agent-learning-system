"""会话存储单元测试"""

import tempfile
from pathlib import Path
from unittest.mock import patch
from langchain_core.messages import HumanMessage, AIMessage
from app.services.session_store import save_session, load_session, delete_session_file

# 合法 UUID 格式的测试 session_id
TEST_SESSION_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
TEST_SESSION_ID_2 = "11111111-2222-3333-4444-555555555555"


def test_save_and_load():
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("app.services.session_store.STORE_DIR", Path(tmpdir)):
            state = {
                "messages": [
                    HumanMessage(content="你好"),
                    AIMessage(content="你好！", name="tutor"),
                ],
                "user_id": TEST_SESSION_ID,
                "user_profile": {"knowledge_level": "beginner"},
                "current_intent": "learn",
                "learning_path": {"title": "Python"},
                "current_node": {},
                "agent_outputs": {"coordinator": "路由到 tutor"},
                "metadata": {},
                "node_states": {"n1": {"status": "available", "score": None}},
            }
            save_session(TEST_SESSION_ID, state)
            loaded = load_session(TEST_SESSION_ID)

            assert loaded is not None
            assert len(loaded["messages"]) == 2
            assert loaded["messages"][0].content == "你好"
            assert loaded["messages"][1].content == "你好！"
            assert loaded["user_profile"]["knowledge_level"] == "beginner"


def test_load_nonexistent():
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("app.services.session_store.STORE_DIR", Path(tmpdir)):
            result = load_session(TEST_SESSION_ID_2)
            assert result is None


def test_delete():
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("app.services.session_store.STORE_DIR", Path(tmpdir)):
            state = {
                "messages": [], "user_id": TEST_SESSION_ID, "user_profile": {},
                "current_intent": "", "learning_path": {}, "current_node": {},
                "agent_outputs": {}, "metadata": {}, "node_states": {},
            }
            save_session(TEST_SESSION_ID, state)
            delete_session_file(TEST_SESSION_ID)
            assert load_session(TEST_SESSION_ID) is None


def test_invalid_session_id_rejected():
    """路径注入防护：非法 session_id 应被拒绝"""
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("app.services.session_store.STORE_DIR", Path(tmpdir)):
            state = {"messages": [], "user_id": "x", "user_profile": {},
                     "current_intent": "", "learning_path": {}, "current_node": {},
                     "agent_outputs": {}, "metadata": {}, "node_states": {}}
            # 路径遍历攻击
            save_session("../../../etc/passwd", state)
            assert load_session("../../../etc/passwd") is None
            # 非 UUID 格式
            save_session("test-123", state)
            assert load_session("test-123") is None
