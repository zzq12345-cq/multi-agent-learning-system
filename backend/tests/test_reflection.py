"""Agent 反思模块测试"""

from app.services.reflection import (
    check_planner_output,
    check_generator_output,
    check_assessor_output,
    review_quiz_rules,
    parse_review_verdict,
)


def test_planner_no_path():
    result = check_planner_output("some text", None)
    assert not result["pass"]


def test_planner_valid():
    path = {
        "nodes": [
            {"id": "n1", "name": "A"},
            {"id": "n2", "name": "B"},
            {"id": "n3", "name": "C"},
            {"id": "n4", "name": "D"},
            {"id": "n5", "name": "E"},
        ],
        "edges": [
            {"source": "n1", "target": "n2"},
            {"source": "n2", "target": "n3"},
            {"source": "n3", "target": "n4"},
            {"source": "n4", "target": "n5"},
        ],
    }
    result = check_planner_output("", path)
    assert result["pass"]


def test_planner_too_few_nodes():
    path = {"nodes": [{"id": "n1", "name": "A"}], "edges": []}
    result = check_planner_output("", path)
    assert not result["pass"]


def test_generator_too_short():
    result = check_generator_output("短")
    assert not result["pass"]


def test_generator_valid():
    content = "x" * 200
    result = check_generator_output(content)
    assert result["pass"]


def test_assessor_no_result():
    result = check_assessor_output("text", None)
    assert not result["pass"]


def test_assessor_valid():
    data = {"questions": [{"id": "q1", "answer": "A"}, {"id": "q2", "answer": "B"}]}
    result = check_assessor_output("", data)
    assert result["pass"]


# ===== 出题互审 L0 规则质检 =====

def _valid_question(qid="q1", **overrides):
    q = {
        "id": qid,
        "type": "choice",
        "question": "1+1=?",
        "options": ["A. 1", "B. 2", "C. 3", "D. 4"],
        "answer": "B",
        "difficulty": 2,
    }
    q.update(overrides)
    return q


def test_review_quiz_rules_valid():
    quiz = {"questions": [_valid_question("q1"), _valid_question("q2")]}
    result = review_quiz_rules(quiz)
    assert result["pass"]
    assert result["issues"] == []


def test_review_quiz_rules_none_result():
    result = review_quiz_rules(None)
    assert not result["pass"]


def test_review_quiz_rules_missing_answer():
    quiz = {"questions": [_valid_question("q1", answer=""), _valid_question("q2")]}
    result = review_quiz_rules(quiz)
    assert not result["pass"]
    assert any("缺少答案" in i for i in result["issues"])


def test_review_quiz_rules_difficulty_out_of_range():
    quiz = {"questions": [_valid_question("q1", difficulty=9), _valid_question("q2")]}
    result = review_quiz_rules(quiz)
    assert not result["pass"]
    assert any("难度越界" in i for i in result["issues"])


def test_review_quiz_rules_answer_not_in_options():
    quiz = {"questions": [_valid_question("q1", answer="E"), _valid_question("q2")]}
    result = review_quiz_rules(quiz)
    assert not result["pass"]
    assert any("不在选项中" in i for i in result["issues"])


def test_review_quiz_rules_missing_question_text():
    quiz = {"questions": [_valid_question("q1", question=""), _valid_question("q2")]}
    result = review_quiz_rules(quiz)
    assert not result["pass"]
    assert any("缺少题干" in i for i in result["issues"])


def test_review_quiz_rules_fill_answer_not_letter_ok():
    # 填空题答案不是选项字母，不应误报"不在选项中"
    quiz = {"questions": [
        _valid_question("q1", type="fill", options=[], answer="42"),
        _valid_question("q2"),
    ]}
    result = review_quiz_rules(quiz)
    assert result["pass"]


# ===== 出题互审 L1 判定解析 =====

def test_parse_review_verdict_pass():
    result = parse_review_verdict('{"verdict": "pass", "issues": []}')
    assert result == {"verdict": "pass", "issues": []}


def test_parse_review_verdict_revise_with_issues():
    result = parse_review_verdict('审查结果：{"verdict": "revise", "issues": ["q1 答案错误"]}')
    assert result["verdict"] == "revise"
    assert result["issues"] == ["q1 答案错误"]


def test_parse_review_verdict_garbage_defaults_pass():
    # 解析失败默认放行，避免审查环节阻塞出题
    result = parse_review_verdict("这不是 JSON")
    assert result == {"verdict": "pass", "issues": []}


def test_parse_review_verdict_invalid_verdict_defaults_pass():
    result = parse_review_verdict('{"verdict": "maybe", "issues": ["x"]}')
    assert result == {"verdict": "pass", "issues": []}


def test_parse_review_verdict_revise_without_issues_gets_default():
    result = parse_review_verdict('{"verdict": "revise", "issues": []}')
    assert result["verdict"] == "revise"
    assert len(result["issues"]) == 1
