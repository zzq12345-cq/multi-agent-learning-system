"""assessor 评分兜底归因守卫 + 出题互审子流程测试"""

import asyncio
import json

from app.agents.assessor import _peer_review_enabled, _resolve_assessment_node, _run_peer_review


PATH = {"nodes": [
    {"id": "n1", "name": "基础", "prerequisites": []},
    {"id": "n2", "name": "进阶", "prerequisites": ["n1"]},
]}


def test_resolve_by_knowledge_point_name():
    states = {"n1": {"status": "in_progress"}, "n2": {"status": "locked"}}
    node = _resolve_assessment_node({"knowledge_point": "基础"}, PATH, states)
    assert node["id"] == "n1"


def test_resolve_knowledge_point_locked_not_matched():
    # knowledge_point 命中 locked 节点时不归因到它，回退到当前在学节点
    states = {"n1": {"status": "in_progress"}, "n2": {"status": "locked"}}
    node = _resolve_assessment_node({"knowledge_point": "进阶"}, PATH, states)
    assert node["id"] == "n1"


def test_resolve_no_match_requires_in_progress():
    # 无法归因且首个可学节点只是 available（尚未开始）→ 不归因
    states = {"n1": {"status": "available"}, "n2": {"status": "locked"}}
    node = _resolve_assessment_node({"knowledge_point": "完全无关"}, PATH, states)
    assert node == {}


def test_resolve_no_match_falls_back_to_in_progress():
    # 无 knowledge_point 时，仅归因到确为 in_progress 的当前节点
    states = {"n1": {"status": "in_progress"}, "n2": {"status": "locked"}}
    node = _resolve_assessment_node({}, PATH, states)
    assert node["id"] == "n1"


# ===== 出题互审子流程 =====

class _FakeResponse:
    def __init__(self, content: str):
        self.content = content


class _FakeLLM:
    """按预设序列依次返回响应，记录调用次数"""

    def __init__(self, replies: list[str]):
        self.replies = list(replies)
        self.calls = 0

    async def ainvoke(self, messages):
        self.calls += 1
        return _FakeResponse(self.replies.pop(0))


VALID_QUIZ = {"questions": [
    {"id": "q1", "type": "choice", "question": "1+1=?",
     "options": ["A. 1", "B. 2"], "answer": "B", "difficulty": 1},
    {"id": "q2", "type": "choice", "question": "2+2=?",
     "options": ["A. 4", "B. 5"], "answer": "A", "difficulty": 1},
]}


def test_peer_review_enabled_default(monkeypatch):
    monkeypatch.delenv("PEER_REVIEW", raising=False)
    assert _peer_review_enabled()


def test_peer_review_off_switch(monkeypatch):
    monkeypatch.setenv("PEER_REVIEW", "off")
    assert not _peer_review_enabled()


def test_peer_review_pass_keeps_original():
    # L0 通过 + L1 审题判 pass → 不重出，仅 1 次 LLM 调用（审题）
    llm = _FakeLLM(['{"verdict": "pass", "issues": []}'])
    content, result = asyncio.run(_run_peer_review(
        llm, base_messages=[], content="原始出题",
        result=VALID_QUIZ, profile={"knowledge_level": "beginner"},
    ))
    assert llm.calls == 1
    assert content == "原始出题"
    assert result is VALID_QUIZ


def test_peer_review_l0_fail_regenerates_once():
    # L0 不过（缺答案）→ 跳过 L1 直接退回重出，仅 1 次 LLM 调用（重出）
    bad_quiz = {"questions": [
        {"id": "q1", "type": "choice", "question": "?", "options": ["A. 1"], "answer": ""},
        {"id": "q2", "type": "choice", "question": "?", "options": ["A. 1"], "answer": "A"},
    ]}
    llm = _FakeLLM([json.dumps(VALID_QUIZ, ensure_ascii=False)])
    content, result = asyncio.run(_run_peer_review(
        llm, base_messages=[], content="坏题", result=bad_quiz, profile={},
    ))
    assert llm.calls == 1
    assert len(result["questions"]) == 2
    assert result["questions"][0]["answer"] == "B"


def test_peer_review_l1_revise_regenerates_once():
    # L0 通过但 L1 判 revise → 重出一次后直接放行（共 2 次 LLM 调用）
    llm = _FakeLLM([
        '{"verdict": "revise", "issues": ["q1 答案标注错误"]}',
        json.dumps(VALID_QUIZ, ensure_ascii=False),
    ])
    content, result = asyncio.run(_run_peer_review(
        llm, base_messages=[], content="原始出题", result=VALID_QUIZ, profile={},
    ))
    assert llm.calls == 2
    assert "questions" in result


def test_peer_review_regen_unparseable_falls_back():
    # 重出结果解析失败 → 保底沿用原题
    llm = _FakeLLM([
        '{"verdict": "revise", "issues": ["表述不清"]}',
        "我重新出题失败了，没有 JSON",
    ])
    content, result = asyncio.run(_run_peer_review(
        llm, base_messages=[], content="原始出题", result=VALID_QUIZ, profile={},
    ))
    assert content == "原始出题"
    assert result is VALID_QUIZ
