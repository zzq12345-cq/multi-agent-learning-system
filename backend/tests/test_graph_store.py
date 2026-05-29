"""图谱存储测试"""
import tempfile
from pathlib import Path
from unittest.mock import patch
from app.services.graph_store import (
    save_graph, load_graph, list_dynamic_graphs,
    validate_domain, slugify_domain,
)


def test_validate_domain():
    assert validate_domain("python")
    assert validate_domain("web-dev")
    assert validate_domain("math_101")
    assert not validate_domain("")
    assert not validate_domain("a")
    assert not validate_domain("../../etc")
    assert not validate_domain("中文")


def test_slugify():
    slug = slugify_domain("高等数学")
    assert len(slug) >= 2
    assert validate_domain(slug)


def test_save_and_load():
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("app.services.graph_store.GRAPHS_DIR", Path(tmpdir)):
            data = {"title": "测试", "nodes": [{"id": "n1"}], "edges": []}
            save_graph("test-subject", data)
            loaded = load_graph("test-subject")
            assert loaded is not None
            assert loaded["title"] == "测试"


def test_list_dynamic():
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("app.services.graph_store.GRAPHS_DIR", Path(tmpdir)):
            save_graph("math", {"title": "数学", "nodes": [{"id": "n1"}], "edges": []})
            graphs = list_dynamic_graphs()
            assert len(graphs) == 1
            assert graphs[0]["domain"] == "math"
