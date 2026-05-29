"""文档解析器 — 支持 PDF/Word/MD/TXT"""

import io
from pathlib import Path
from app.config import DATA_DIR

DOCS_DIR = DATA_DIR / "docs"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def parse_file(file_bytes: bytes, filename: str) -> str:
    """解析文件为纯文本"""
    if len(file_bytes) > MAX_FILE_SIZE:
        raise ValueError("文件大小超过 10MB 限制")

    ext = Path(filename).suffix.lower()

    if ext == ".pdf":
        return _parse_pdf(file_bytes)
    elif ext == ".docx":
        return _parse_docx(file_bytes)
    elif ext in (".md", ".txt", ".markdown"):
        return _parse_text(file_bytes)
    else:
        raise ValueError(f"不支持的文件格式: {ext}，支持 PDF/DOCX/MD/TXT")


def _parse_pdf(file_bytes: bytes) -> str:
    """解析 PDF"""
    try:
        import fitz  # pymupdf
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text_parts = []
        for page in doc:
            text_parts.append(page.get_text())
        doc.close()
        return "\n\n".join(text_parts)
    except ImportError:
        raise ValueError("PDF 解析依赖未安装（pymupdf）")


def _parse_docx(file_bytes: bytes) -> str:
    """解析 Word 文档"""
    try:
        from docx import Document
        doc = Document(io.BytesIO(file_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs)
    except ImportError:
        raise ValueError("Word 解析依赖未安装（python-docx）")


def _parse_text(file_bytes: bytes) -> str:
    """解析纯文本（自动检测编码）"""
    for encoding in ("utf-8", "gbk", "gb2312", "latin-1"):
        try:
            return file_bytes.decode(encoding)
        except (UnicodeDecodeError, LookupError):
            continue
    return file_bytes.decode("utf-8", errors="replace")


def save_doc_to_domain(domain: str, filename: str, content: str):
    """将解析后的文本保存到学科文档目录"""
    domain_dir = DOCS_DIR / domain
    domain_dir.mkdir(parents=True, exist_ok=True)
    # 保存为 .md 格式
    safe_name = Path(filename).stem + ".md"
    filepath = domain_dir / safe_name
    filepath.write_text(content, encoding="utf-8")
    return str(filepath)


def list_domain_docs(domain: str) -> list[dict]:
    """列出学科下的文档"""
    domain_dir = DOCS_DIR / domain
    if not domain_dir.exists():
        return []
    docs = []
    for f in domain_dir.glob("*"):
        if f.is_file():
            docs.append({
                "filename": f.name,
                "size": f.stat().st_size,
            })
    return docs


def delete_domain_doc(domain: str, filename: str) -> bool:
    """删除学科文档"""
    filepath = DOCS_DIR / domain / filename
    if filepath.exists():
        filepath.unlink()
        return True
    return False
