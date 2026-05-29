"""文档解析测试"""
import pytest
from app.services.doc_parser import parse_file


def test_parse_txt():
    content = "Hello World 你好世界".encode("utf-8")
    result = parse_file(content, "test.txt")
    assert "Hello World" in result
    assert "你好世界" in result


def test_parse_md():
    content = "# Title\n\nParagraph".encode("utf-8")
    result = parse_file(content, "test.md")
    assert "Title" in result


def test_parse_unsupported():
    with pytest.raises(ValueError, match="不支持"):
        parse_file(b"data", "test.xyz")


def test_file_too_large():
    large = b"x" * (11 * 1024 * 1024)
    with pytest.raises(ValueError, match="10MB"):
        parse_file(large, "big.txt")
