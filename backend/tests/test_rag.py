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


def _make_isolated_rag(tmp_path, monkeypatch):
    """构造使用临时目录的 RAG 实例（隔离预置文档）"""
    import app.services.rag as rag_module

    docs_dir = tmp_path / "docs"
    user_dir = tmp_path / "user_docs"
    docs_dir.mkdir()
    user_dir.mkdir()
    (docs_dir / "base.md").write_text(
        "Python 变量赋值 数据类型 字符串 整数", encoding="utf-8",
    )
    monkeypatch.setattr(rag_module, "DOCS_DIR", docs_dir)
    monkeypatch.setattr(rag_module, "USER_DOCS_DIR", user_dir)

    rag = rag_module.SimpleRAG()
    rag.load_documents()
    return rag, user_dir


def test_reload_picks_up_new_document(tmp_path, monkeypatch):
    """回归：上传新文档后调用 reload()，新内容立即可检索"""
    rag, user_dir = _make_isolated_rag(tmp_path, monkeypatch)

    # 上传前：新文档内容检索不到
    assert all(
        "量子纠缠" not in r["content"] for r in rag.search("量子纠缠 叠加态")
    )

    # 模拟上传新文档（subjects.py 上传接口会触发 reload）
    (user_dir / "quantum.md").write_text(
        "量子纠缠 是一种 量子力学 现象，两个粒子处于 叠加态", encoding="utf-8",
    )
    rag.reload()

    results = rag.search("量子纠缠 叠加态")
    assert any("量子纠缠" in r["content"] for r in results)


def test_search_rebuilds_when_index_invalidated(tmp_path, monkeypatch):
    """回归：chunks 非空时仅置 _loaded=False，search 也应重建索引检索到新文档"""
    rag, user_dir = _make_isolated_rag(tmp_path, monkeypatch)
    assert rag.chunks  # 前置条件：索引已加载非空

    (user_dir / "quantum.md").write_text(
        "量子纠缠 是一种 量子力学 现象，两个粒子处于 叠加态", encoding="utf-8",
    )
    rag._loaded = False  # 仅失效标记，不清空 chunks

    results = rag.search("量子纠缠 叠加态")
    assert any("量子纠缠" in r["content"] for r in results)
