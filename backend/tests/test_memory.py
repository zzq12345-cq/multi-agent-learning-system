"""对话记忆单元测试"""

from langchain_core.messages import HumanMessage, AIMessage
from app.services.memory import build_context_summary, get_conversation_window


def test_build_context_empty():
    state = {}
    result = build_context_summary(state)
    assert result == "暂无历史上下文"


def test_build_context_with_profile():
    state = {
        "user_profile": {
            "knowledge_level": "beginner",
            "learning_style": "practical",
            "goals": ["学 Python"],
        }
    }
    result = build_context_summary(state)
    assert "beginner" in result
    assert "practical" in result
    assert "学 Python" in result


def test_build_context_with_path():
    state = {
        "learning_path": {"title": "Python 入门", "nodes": [{"id": "n1", "name": "变量"}, {"id": "n2", "name": "函数"}]},
        "node_states": {"n1": {"status": "completed", "score": 90}},
    }
    result = build_context_summary(state)
    assert "Python 入门" in result
    assert "2 个知识点" in result


def test_conversation_window_short():
    msgs = [HumanMessage(content="hi"), AIMessage(content="hello")]
    result = get_conversation_window(msgs)
    assert len(result) == 2


def test_conversation_window_long():
    msgs = [HumanMessage(content=f"msg {i}") for i in range(20)]
    result = get_conversation_window(msgs, max_recent=6, max_total=12)
    # 应该保留第一条 + 最近 6 条 = 7 条
    assert len(result) == 7
    assert result[0].content == "msg 0"  # 第一条保留
    assert result[-1].content == "msg 19"  # 最后一条保留
