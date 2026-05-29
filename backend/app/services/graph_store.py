"""动态知识图谱存储"""

import json
import re
from pathlib import Path
from app.config import DATA_DIR

GRAPHS_DIR = DATA_DIR / "graphs"

# domain 名称校验
DOMAIN_PATTERN = re.compile(r'^[a-z0-9_-]{2,30}$')


def validate_domain(domain: str) -> bool:
    return bool(DOMAIN_PATTERN.match(domain))


def slugify_domain(text: str) -> str:
    """将中文/英文文本转为合法 domain slug"""
    slug = re.sub(r'[^a-z0-9]', '-', text.lower().strip())
    slug = re.sub(r'-+', '-', slug).strip('-')
    if not slug or len(slug) < 2:
        import hashlib
        slug = "subject-" + hashlib.md5(text.encode()).hexdigest()[:6]
    return slug[:30]


def save_graph(domain: str, graph_data: dict):
    """保存动态知识图谱"""
    if not validate_domain(domain):
        domain = slugify_domain(domain)
    GRAPHS_DIR.mkdir(parents=True, exist_ok=True)
    filepath = GRAPHS_DIR / f"{domain}.json"
    filepath.write_text(json.dumps(graph_data, ensure_ascii=False, indent=2))


def load_graph(domain: str) -> dict | None:
    """加载动态知识图谱"""
    filepath = GRAPHS_DIR / f"{domain}.json"
    if not filepath.exists():
        return None
    try:
        return json.loads(filepath.read_text())
    except (json.JSONDecodeError, OSError):
        return None


def list_dynamic_graphs() -> list[dict]:
    """列出所有动态图谱"""
    GRAPHS_DIR.mkdir(parents=True, exist_ok=True)
    results = []
    for f in GRAPHS_DIR.glob("*.json"):
        try:
            data = json.loads(f.read_text())
            results.append({
                "domain": f.stem,
                "title": data.get("title", f.stem),
                "nodes_count": len(data.get("nodes", [])),
                "source": "dynamic",
            })
        except (json.JSONDecodeError, OSError):
            continue
    return results


def list_all_graphs() -> list[dict]:
    """合并预置 + 动态图谱"""
    from app.knowledge.python_graph import PYTHON_KNOWLEDGE_GRAPH
    from app.knowledge.web_graph import WEB_KNOWLEDGE_GRAPH
    from app.knowledge.datastructure_graph import DS_KNOWLEDGE_GRAPH

    preset = [
        {"domain": "python", "title": PYTHON_KNOWLEDGE_GRAPH["title"], "nodes_count": len(PYTHON_KNOWLEDGE_GRAPH["nodes"]), "source": "preset"},
        {"domain": "web", "title": WEB_KNOWLEDGE_GRAPH["title"], "nodes_count": len(WEB_KNOWLEDGE_GRAPH["nodes"]), "source": "preset"},
        {"domain": "datastructure", "title": DS_KNOWLEDGE_GRAPH["title"], "nodes_count": len(DS_KNOWLEDGE_GRAPH["nodes"]), "source": "preset"},
    ]

    dynamic = list_dynamic_graphs()
    # 动态图谱不覆盖预置
    preset_domains = {g["domain"] for g in preset}
    dynamic = [g for g in dynamic if g["domain"] not in preset_domains]

    return preset + dynamic


def get_graph(domain: str) -> dict | None:
    """获取图谱（先动态后预置）"""
    # 先查动态
    dynamic = load_graph(domain)
    if dynamic:
        return dynamic

    # 再查预置
    from app.knowledge.python_graph import PYTHON_KNOWLEDGE_GRAPH
    from app.knowledge.web_graph import WEB_KNOWLEDGE_GRAPH
    from app.knowledge.datastructure_graph import DS_KNOWLEDGE_GRAPH
    presets = {
        "python": PYTHON_KNOWLEDGE_GRAPH,
        "web": WEB_KNOWLEDGE_GRAPH,
        "datastructure": DS_KNOWLEDGE_GRAPH,
    }
    return presets.get(domain)


def delete_graph(domain: str) -> bool:
    """删除动态图谱（预置不可删）"""
    filepath = GRAPHS_DIR / f"{domain}.json"
    if filepath.exists():
        filepath.unlink()
        return True
    return False
