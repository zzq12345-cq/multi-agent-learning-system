"""RAG 检索测试"""

from app.services.rag import SimpleRAG, search_knowledge, _tokenize, _compute_tfidf


def test_tokenize_chinese():
    tokens = _tokenize("Python变量赋值")
    assert "python" in tokens
    assert "变量" in tokens
    assert "赋值" in tokens


def test_tokenize_english():
    tokens = _tokenize("hello world Python")
    assert "hello" in tokens
    assert "python" in tokens


def test_simple_rag_search():
    rag = SimpleRAG()
    rag.chunks = [
        "Python 变量赋值 数据类型",
        "循环 for while break",
        "函数定义 参数 返回值",
    ]
    rag.tfidf_docs, _ = _compute_tfidf(rag.chunks)
    rag.metadata = [{"source": "a"}, {"source": "b"}, {"source": "c"}]

    results = rag.search("变量", top_k=1)
    assert len(results) >= 1
    assert "变量" in results[0]["content"]


def test_search_knowledge_returns_string():
    result = search_knowledge("Python 变量")
    # 应该返回字符串（可能为空如果没有文档）
    assert isinstance(result, str)
