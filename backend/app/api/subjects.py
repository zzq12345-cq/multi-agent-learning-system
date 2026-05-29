"""学科管理 API"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Header
from app.services.graph_store import (
    list_all_graphs, get_graph, delete_graph, validate_domain,
)
from app.services.doc_parser import (
    parse_file, save_doc_to_domain, list_domain_docs, delete_domain_doc,
)
from app.services.auth import decode_token

router = APIRouter(prefix="/api/subjects", tags=["subjects"])


def _get_current_user(authorization: str = Header(default="")) -> str:
    token = (
        authorization.replace("Bearer ", "")
        if authorization.startswith("Bearer ")
        else authorization
    )
    if not token:
        raise HTTPException(401, "未提供认证 token")
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(401, "token 无效或已过期")
    return user_id


@router.get("")
async def list_subjects():
    """列出所有学科"""
    graphs = list_all_graphs()
    for g in graphs:
        docs = list_domain_docs(g["domain"])
        g["doc_count"] = len(docs)
    return {"subjects": graphs}


@router.get("/{domain}")
async def get_subject(domain: str):
    """获取学科详情"""
    graph = get_graph(domain)
    if not graph:
        raise HTTPException(404, f"学科 {domain} 不存在")
    docs = list_domain_docs(domain)
    return {"domain": domain, "graph": graph, "docs": docs}


@router.post("/{domain}/upload")
async def upload_doc(
    domain: str,
    file: UploadFile = File(...),
    current_user: str = Depends(_get_current_user),
):
    """上传文档到学科"""
    if not validate_domain(domain):
        raise HTTPException(
            400,
            "学科名称不合法（仅支持小写字母、数字、下划线、连字符，2-30字符）",
        )

    content_bytes = await file.read()
    if len(content_bytes) > 10 * 1024 * 1024:
        raise HTTPException(413, "文件大小超过 10MB 限制")

    try:
        text = parse_file(content_bytes, file.filename or "unknown.txt")
    except ValueError as e:
        raise HTTPException(400, str(e))

    save_doc_to_domain(domain, file.filename or "document.md", text)

    # 触发 RAG 重新加载
    try:
        from app.services.rag import get_rag
        rag = get_rag()
        rag._loaded = False
    except Exception:
        pass

    return {"status": "ok", "filename": file.filename, "text_length": len(text)}


@router.get("/{domain}/docs")
async def get_domain_docs(domain: str):
    """列出学科文档"""
    docs = list_domain_docs(domain)
    return {"domain": domain, "docs": docs}


@router.delete("/{domain}/docs/{filename}")
async def remove_doc(
    domain: str,
    filename: str,
    current_user: str = Depends(_get_current_user),
):
    """删除学科文档"""
    if not delete_domain_doc(domain, filename):
        raise HTTPException(404, "文档不存在")
    return {"status": "ok"}


@router.delete("/{domain}")
async def remove_subject(
    domain: str,
    current_user: str = Depends(_get_current_user),
):
    """删除动态学科"""
    if domain in ("python", "web", "datastructure"):
        raise HTTPException(403, "预置学科不可删除")
    if not delete_graph(domain):
        raise HTTPException(404, "学科不存在")
    return {"status": "ok"}
