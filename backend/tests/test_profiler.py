"""profiler 入学摸底测：静态题库格式校验 + 出题兜底 + 评估解析兼容测试"""

import asyncio
import json
import re

from langchain_core.messages import AIMessage, HumanMessage

from app.agents.profiler import (
    STATIC_QUIZ,
    _build_answer_key,
    _format_quiz_message,
    _generate_quiz_questions,
    _is_assessment_request,
    _parse_assessment,
    profiler_node,
)


def _parse_quiz_like_frontend(content: str) -> list | None:
    """复刻前端 MessageBubble.parseQuizFromContent 的解析逻辑（格式契约）"""
    if "学习检测" not in content and "第 1 题" not in content and "第1题" not in content:
        return None
    questions = []
    blocks = re.split(r"\*\*第\s*\d+\s*题\*\*", content)
    for block in blocks[1:]:
        lines = [ln.strip() for ln in block.split("\n") if ln.strip()]
        question = re.sub(r"^\(.*?\)\s*", "", lines[0]) if lines else ""
        options = [ln for ln in lines if re.match(r"^[A-D][.．、]", ln)]
        if question and len(options) >= 2:
            questions.append({"question": question, "options": options})
    return questions or None


class _FakeResponse:
    def __init__(self, content: str):
        self.content = content


class _FakeLLM:
    """按预设序列依次返回响应；replies 为空时抛异常模拟调用失败"""

    def __init__(self, replies: list[str] | None = None):
        self.replies = list(replies or [])
        self.calls = 0
        self.last_messages = None

    async def ainvoke(self, messages):
        self.calls += 1
        self.last_messages = messages
        if not self.replies:
            raise RuntimeError("LLM 调用失败")
        return _FakeResponse(self.replies.pop(0))


# ===== 静态题库格式契约 =====

def test_static_quiz_has_five_layered_questions():
    assert len(STATIC_QUIZ) == 5
    for q in STATIC_QUIZ:
        assert q["question"].strip()
        assert "\n" not in q["question"]  # 题干单行，前端取首行为题干
        assert len(q["options"]) == 4
        for opt in q["options"]:
            assert re.match(r"^[A-D][.．、]", opt)
        assert q["answer"] in {"A", "B", "C", "D"}
        assert q["knowledge_point"].strip()


def test_static_quiz_message_parseable_by_quizcard():
    content = _format_quiz_message(STATIC_QUIZ)
    parsed = _parse_quiz_like_frontend(content)
    assert parsed is not None and len(parsed) == 5
    for i, q in enumerate(parsed):
        assert q["question"] == STATIC_QUIZ[i]["question"]
        assert q["options"] == STATIC_QUIZ[i]["options"]


def test_format_quiz_collapses_multiline_question():
    # LLM 出题题干带换行时压成单行，避免前端只取到半截题干
    questions = [{
        "question": "以下代码输出什么？\nprint(1 + 1)",
        "options": ["A. 1", "B. 2", "C. 11", "D. 报错"],
        "answer": "B",
        "knowledge_point": "运算符",
    }] * 5
    parsed = _parse_quiz_like_frontend(_format_quiz_message(questions))
    assert parsed is not None and len(parsed) == 5
    assert "print(1 + 1)" in parsed[0]["question"]


# ===== 评估意图判定 =====

def test_is_assessment_request():
    assert _is_assessment_request("请对我进行编程能力评估")
    assert _is_assessment_request("帮我摸底一下")
    assert not _is_assessment_request("第1题我选 A，第2题我选 B")
    assert not _is_assessment_request("你好")


# ===== LLM 出题与静态兜底 =====

def test_generate_quiz_falls_back_on_llm_error():
    llm = _FakeLLM()  # 无预设回复 → 抛异常
    questions = asyncio.run(_generate_quiz_questions(llm, "请评估我的能力"))
    assert questions is STATIC_QUIZ


def test_generate_quiz_falls_back_on_unparseable_output():
    llm = _FakeLLM(["我不会出题，抱歉"])
    questions = asyncio.run(_generate_quiz_questions(llm, "请评估我的能力"))
    assert questions is STATIC_QUIZ


def test_generate_quiz_falls_back_on_wrong_count():
    bad = {"questions": [{
        "question": "1+1=?", "options": ["A. 1", "B. 2"], "answer": "B",
    }] * 3}  # 只有 3 题
    llm = _FakeLLM([json.dumps(bad, ensure_ascii=False)])
    questions = asyncio.run(_generate_quiz_questions(llm, "请评估我的能力"))
    assert questions is STATIC_QUIZ


def test_generate_quiz_accepts_valid_llm_output():
    valid = {"questions": [{
        "question": f"第{i}个问题？",
        "options": ["A. 甲", "B. 乙", "C. 丙", "D. 丁"],
        "answer": "A",
        "knowledge_point": f"考点{i}",
    } for i in range(1, 6)]}
    llm = _FakeLLM([json.dumps(valid, ensure_ascii=False)])
    questions = asyncio.run(_generate_quiz_questions(llm, "评估一下我的 Java 水平"))
    assert questions is not STATIC_QUIZ
    assert len(questions) == 5
    assert _parse_quiz_like_frontend(_format_quiz_message(questions))


def test_build_answer_key():
    key = _build_answer_key(STATIC_QUIZ)
    assert set(key) == {"q1", "q2", "q3", "q4", "q5"}
    assert key["q1"] == {"answer": "A", "knowledge_point": "基础语法与输出"}


# ===== _parse_assessment 对新输出的兼容 =====

def test_parse_assessment_quiz_result():
    content = (
        "你答对了 3 题，表现不错！\n\n"
        "ASSESSMENT:\n"
        "- level: intermediate\n"
        "- style: balanced\n"
        "- goals: [学习 Python, 掌握编程基础]\n"
        "- strengths: [基础语法与输出、变量与命名规则、列表与内置函数]\n"
        "- weaknesses: [range 与循环基础、列表推导式]\n"
    )
    profile = _parse_assessment(content, {})
    assert profile["knowledge_level"] == "intermediate"
    assert profile["learning_style"] == "balanced"
    assert any("python" in g for g in profile["goals"])
    assert any("基础语法" in s for s in profile["strengths"])
    assert any("列表推导式" in w for w in profile["weaknesses"])


def test_parse_assessment_preserves_existing_fields():
    existing = {"goals": ["原有目标"], "knowledge_level": "beginner"}
    profile = _parse_assessment("ASSESSMENT:\n- level: advanced\n- style: visual", existing)
    assert profile["knowledge_level"] == "advanced"
    assert profile["goals"] == ["原有目标"]  # 未输出的字段保留原值


# ===== profiler_node 分支行为 =====

def _make_state(messages, profile=None, metadata=None):
    return {
        "messages": messages,
        "user_id": "u1",
        "user_profile": profile or {},
        "current_intent": "",
        "learning_path": {},
        "current_node": {},
        "node_states": {},
        "mastery_data": {},
        "agent_outputs": {},
        "next_agent": "",
        "metadata": metadata or {},
        "llm_config": {},
        "event_log": [],
    }


def test_profiler_node_first_assessment_issues_quiz(monkeypatch):
    # 首次评估请求 + LLM 失败 → 静态题兜底，输出可被 QuizCard 解析
    fake = _FakeLLM()
    monkeypatch.setattr("app.agents.profiler.get_llm", lambda *a, **kw: fake)
    state = _make_state([HumanMessage(content="请对我进行编程能力评估")])
    result = asyncio.run(profiler_node(state))

    msg = result["messages"][0]
    assert msg.name == "profiler"
    parsed = _parse_quiz_like_frontend(msg.content)
    assert parsed is not None and len(parsed) == 5
    assert result["next_agent"] == "end"
    assert set(result["metadata"]["profiler_quiz"]) == {"q1", "q2", "q3", "q4", "q5"}
    assert result["agent_outputs"]["profiler"] == "已发放摸底测验"


def test_profiler_node_second_round_parses_assessment(monkeypatch):
    # 第二轮收到答案 → 走原有 _parse_assessment 单写入口，注入答案要点
    assessment = (
        "ASSESSMENT:\n"
        "- level: beginner\n"
        "- style: balanced\n"
        "- goals: [学习 Python]\n"
        "- strengths: [基础语法与输出]\n"
        "- weaknesses: [列表推导式]\n"
    )
    fake = _FakeLLM([assessment])
    monkeypatch.setattr("app.agents.profiler.get_llm", lambda *a, **kw: fake)
    quiz_key = _build_answer_key(STATIC_QUIZ)
    state = _make_state(
        [
            HumanMessage(content="请对我进行编程能力评估"),
            AIMessage(content=_format_quiz_message(STATIC_QUIZ), name="profiler"),
            HumanMessage(content="第1题我选 A，第2题我选 B，第3题我选 C，第4题我选 D，第5题我选 B"),
        ],
        metadata={"profiler_quiz": quiz_key},
    )
    result = asyncio.run(profiler_node(state))

    profile = result["user_profile"]
    assert profile["knowledge_level"] == "beginner"
    assert profile["strengths"] == ["基础语法与输出"]
    assert profile["weaknesses"] == ["列表推导式"]
    assert result["agent_outputs"]["profiler"] == "评估完成"
    # 答案要点已注入系统提示，供 LLM 判分
    system_content = fake.last_messages[0].content
    assert "摸底测验答案与考点" in system_content
    # 画像总结呈现个性化差异
    assert "已掌握" in result["messages"][0].content
    assert "待提升" in result["messages"][0].content
