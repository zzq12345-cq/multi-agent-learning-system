"""coordinator 路由解析与回复提取测试"""

from app.agents.coordinator import _resolve_route, _extract_reply


def test_resolve_route_exact_match():
    assert _resolve_route("tutor") == ("tutor", 0.95)
    assert _resolve_route("planner") == ("planner", 0.95)


def test_resolve_route_exact_match_with_wrapping():
    # 容忍引号、标点、Markdown 符号包裹
    assert _resolve_route("「assessor」。") == ("assessor", 0.95)
    assert _resolve_route("**generator**") == ("generator", 0.95)
    assert _resolve_route("tutor。\n") == ("tutor", 0.95)


def test_resolve_route_unique_substring():
    assert _resolve_route("我会路由到 tutor 处理这个问题") == ("tutor", 0.85)


def test_resolve_route_multiple_names_no_route():
    # 命中多个 Agent 名时不强行路由，避免按 dict 顺序误判
    assert _resolve_route("不需要 profiler，应该用 tutor") == (None, 0.7)


def test_resolve_route_reply_prefix_no_route():
    assert _resolve_route("reply: 你好，我是你的 tutor") == (None, 1.0)


def test_resolve_route_no_match():
    assert _resolve_route("你好") == (None, 0.7)


def test_extract_reply_keeps_case():
    # 直接回复保留原文大小写，不破坏英文/专有名词
    assert _extract_reply("REPLY: 学习 Python 和 API 很有趣") == "学习 Python 和 API 很有趣"


def test_extract_reply_without_prefix():
    assert _extract_reply("你好呀！") == "你好呀！"
