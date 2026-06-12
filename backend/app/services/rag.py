"""RAG 检索增强 — 向量语义检索（FAISS）+ TF-IDF 兜底"""

import json
import re
import math
import hashlib
import numpy as np
from pathlib import Path
from collections import Counter
from loguru import logger
from app.config import DATA_DIR

# 教学文档存储目录
DOCS_DIR = Path(__file__).parent.parent / "knowledge" / "docs"
# 用户上传文档目录
USER_DOCS_DIR = DATA_DIR / "docs"
# 向量索引缓存目录
INDEX_DIR = DATA_DIR / "vector_index"


# ──────────────── TF-IDF 兜底检索 ────────────────


def _tokenize(text: str) -> list[str]:
    """中英文分词（jieba + 英文空格分词）"""
    import jieba
    words = jieba.lcut(text.lower())
    return [w.strip() for w in words if len(w.strip()) > 0 and not re.match(r'^[\\s\\W]$', w)]


def _compute_tfidf(docs: list[str]) -> list[dict]:
    """计算 TF-IDF 向量"""
    doc_tokens = [_tokenize(d) for d in docs]
    df: Counter = Counter()
    for tokens in doc_tokens:
        for t in set(tokens):
            df[t] += 1
    n = len(docs)
    tfidf_docs = []
    for tokens in doc_tokens:
        tf = Counter(tokens)
        total = len(tokens) if tokens else 1
        tfidf = {}
        for t, count in tf.items():
            tfidf[t] = (count / total) * math.log((n + 1) / (df[t] + 1))
        tfidf_docs.append(tfidf)
    return tfidf_docs

def _cosine_sim(a: dict, b: dict) -> float:
    """字典向量余弦相似度"""
    common = set(a.keys()) & set(b.keys())
    if not common:
        return 0.0
    dot = sum(a[k] * b[k] for k in common)
    norm_a = math.sqrt(sum(v * v for v in a.values()))
    norm_b = math.sqrt(sum(v * v for v in b.values()))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _tfidf_search(
    query: str, chunks: list[str], metadata: list[dict],
    tfidf_docs: list[dict], top_k: int, domain: str | None,
) -> list[dict]:
    """TF-IDF 兜底检索"""
    query_tokens = _tokenize(query)
    query_tf = Counter(query_tokens)
    total = len(query_tokens) if query_tokens else 1
    query_tfidf = {t: count / total for t, count in query_tf.items()}

    candidates = (
        [(i, d) for i, d in enumerate(tfidf_docs)
         if i < len(metadata) and metadata[i].get("domain") == domain]
        if domain else list(enumerate(tfidf_docs))
    )
    scores = sorted(
        [((_cosine_sim(query_tfidf, d)), i) for i, d in candidates],
        reverse=True,
    )
    results = []
    for sim, idx in scores[:top_k]:
        if sim > 0.01:
            results.append({
                "content": chunks[idx],
                "score": round(sim, 4),
                "source": metadata[idx].get("source", "unknown"),
            })
    return results


# ──────────────── 向量嵌入检索 ────────────────


def _get_embeddings_model():
    """获取 OpenAI 兼容的 Embeddings 模型"""
    import os
    from langchain_openai import OpenAIEmbeddings
    api_key = os.environ.get("LLM_API_KEY", "")
    base_url = os.environ.get("LLM_BASE_URL", "https://api.deepseek.com/v1")
    if not api_key:
        return None
    return OpenAIEmbeddings(
        api_key=api_key,
        base_url=base_url,
        model="text-embedding-v1",  # 通用嵌入模型名
        request_timeout=30,
    )


def _content_hash(chunks: list[str]) -> str:
    """计算 chunks 内容哈希，用于判断索引是否需要重建"""
    h = hashlib.md5()
    for c in chunks:
        h.update(c.encode("utf-8"))
    return h.hexdigest()


# ──────────────── 主检索器 ────────────────


class VectorRAG:
    """向量语义检索器（FAISS），自动降级 TF-IDF"""

    def __init__(self):
        self.chunks: list[str] = []
        self.metadata: list[dict] = []
        self.tfidf_docs: list[dict] = []
        self.embeddings: np.ndarray | None = None
        self._loaded = False
        self._vector_ready = False

    def load_documents(self, domain: str = None):
        """加载教学文档并构建索引"""
        if self._loaded and not domain:
            return

        self.chunks = []
        self.metadata = []

        docs_dir = DOCS_DIR
        if not docs_dir.exists():
            docs_dir.mkdir(parents=True, exist_ok=True)
            self._create_default_docs()

        # 读取预置文档
        patterns = [f"{domain}/*.md", "*.md"] if domain else ["**/*.md"]
        for pattern in patterns:
            for filepath in docs_dir.glob(pattern):
                content = filepath.read_text(encoding="utf-8")
                file_domain = (
                    filepath.parent.name
                    if filepath.parent != docs_dir else ""
                )
                file_chunks = self._split_chunks(content, filepath.stem, domain=file_domain)
                self.chunks.extend(file_chunks)

        # 读取用户上传文档
        if USER_DOCS_DIR.exists():
            user_patterns = [f"{domain}/*.md"] if domain else ["**/*.md"]
            for pattern in user_patterns:
                for filepath in USER_DOCS_DIR.glob(pattern):
                    content = filepath.read_text(encoding="utf-8")
                    file_domain = (
                        filepath.parent.name
                        if filepath.parent != USER_DOCS_DIR else ""
                    )
                    file_chunks = self._split_chunks(content, filepath.stem, domain=file_domain)
                    self.chunks.extend(file_chunks)

        # 构建 TF-IDF 索引（兜底）
        if self.chunks:
            self.tfidf_docs = _compute_tfidf(self.chunks)

        # 尝试构建向量索引
        self._build_vector_index()
        self._loaded = True

    def _build_vector_index(self):
        """构建或加载向量索引"""
        if not self.chunks:
            return

        INDEX_DIR.mkdir(parents=True, exist_ok=True)
        content_hash = _content_hash(self.chunks)
        cache_file = INDEX_DIR / f"{content_hash}.npy"

        # 命中缓存
        if cache_file.exists():
            try:
                self.embeddings = np.load(str(cache_file))
                if self.embeddings.shape[0] == len(self.chunks):
                    self._vector_ready = True
                    logger.info(f"向量索引命中缓存：{len(self.chunks)} chunks")
                    return
            except Exception:
                pass

        # 调用 Embedding API
        model = _get_embeddings_model()
        if not model:
            logger.info("未配置 LLM_API_KEY，向量检索不可用，使用 TF-IDF 兜底")
            return

        try:
            vectors = model.embed_documents(self.chunks)
            self.embeddings = np.array(vectors, dtype=np.float32)
            # 缓存到磁盘
            np.save(str(cache_file), self.embeddings)
            self._vector_ready = True
            logger.info(f"向量索引构建完成：{len(self.chunks)} chunks, dim={self.embeddings.shape[1]}")
        except Exception as e:
            logger.warning(f"向量索引构建失败，降级 TF-IDF: {e}")
            self._vector_ready = False

    def search(self, query: str, top_k: int = 3, domain: str = None) -> list[dict]:
        """检索最相关的文档片段"""
        if not self.chunks or not self._loaded:
            self.reload()
        if not self.chunks:
            return []

        # 优先向量检索
        if self._vector_ready and self.embeddings is not None:
            return self._vector_search(query, top_k, domain)

        # 降级 TF-IDF
        return _tfidf_search(
            query, self.chunks, self.metadata, self.tfidf_docs, top_k, domain,
        )

    def _vector_search(self, query: str, top_k: int, domain: str | None) -> list[dict]:
        """向量语义检索"""
        model = _get_embeddings_model()
        if not model:
            return _tfidf_search(
                query, self.chunks, self.metadata, self.tfidf_docs, top_k, domain,
            )

        try:
            query_vec = np.array(model.embed_query(query), dtype=np.float32)
        except Exception as e:
            logger.warning(f"查询向量化失败，降级 TF-IDF: {e}")
            return _tfidf_search(
                query, self.chunks, self.metadata, self.tfidf_docs, top_k, domain,
            )

        # 余弦相似度
        norms = np.linalg.norm(self.embeddings, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1, norms)
        normalized = self.embeddings / norms
        query_norm = query_vec / (np.linalg.norm(query_vec) or 1)
        scores = normalized @ query_norm

        # 按 domain 过滤
        if domain:
            mask = np.array([
                m.get("domain") == domain for m in self.metadata
            ], dtype=bool)
            scores = np.where(mask, scores, -1)

        # Top-K
        top_indices = np.argsort(scores)[::-1][:top_k]
        results = []
        for idx in top_indices:
            sim = float(scores[idx])
            if sim > 0.1:
                results.append({
                    "content": self.chunks[idx],
                    "score": round(sim, 4),
                    "source": self.metadata[idx].get("source", "unknown"),
                })
        return results

    def reload(self):
        """重新加载文档"""
        self._loaded = False
        self._vector_ready = False
        self.chunks = []
        self.metadata = []
        self.tfidf_docs = []
        self.embeddings = None
        self.load_documents()

    def _split_chunks(
        self, content: str, source: str, domain: str = "", chunk_size: int = 500,
    ) -> list[str]:
        """按段落分块"""
        paragraphs = content.split("\n\n")
        chunks = []
        current = ""
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            if len(current) + len(para) > chunk_size and current:
                chunks.append(current)
                self.metadata.append({"source": source, "domain": domain})
                current = para
            else:
                current = current + "\n\n" + para if current else para
        if current:
            chunks.append(current)
            self.metadata.append({"source": source, "domain": domain})
        return chunks

    def _create_default_docs(self):
        """创建默认教学文档"""
        python_dir = DOCS_DIR / "python"
        python_dir.mkdir(exist_ok=True)
        (python_dir / "variables.md").write_text(_DOC_VARIABLES, encoding="utf-8")
        (python_dir / "control_flow.md").write_text(_DOC_CONTROL_FLOW, encoding="utf-8")
        (python_dir / "functions.md").write_text(_DOC_FUNCTIONS, encoding="utf-8")


# ──────────────── 全局单例 ────────────────

# 兼容旧接口名
SimpleRAG = VectorRAG

_rag_instance: VectorRAG | None = None


def get_rag() -> VectorRAG:
    """获取 RAG 检索器单例"""
    global _rag_instance
    if _rag_instance is None:
        _rag_instance = VectorRAG()
        _rag_instance.load_documents()
    return _rag_instance


def search_knowledge(query: str, top_k: int = 3, domain: str = None) -> str:
    """检索相关知识，返回格式化的参考文本"""
    rag = get_rag()
    results = rag.search(query, top_k=top_k, domain=domain)
    if not results:
        return ""
    parts = ["[参考资料]"]
    for i, r in enumerate(results, 1):
        parts.append(f"--- 片段 {i} (来源: {r['source']}, 相关度: {r['score']}) ---")
        parts.append(r["content"][:400])
    return "\n".join(parts)


_DOC_VARIABLES = """\
# Python 变量与数据类型

## 变量赋值

Python 中变量不需要声明类型，直接赋值即可：

```python
name = "Alice"    # 字符串
age = 25          # 整数
height = 1.75     # 浮点数
is_student = True # 布尔值
```

## 数据类型

Python 的基本数据类型包括：
- **int**: 整数，如 1, -5, 100
- **float**: 浮点数，如 3.14, -0.5
- **str**: 字符串，如 "hello", 'world'
- **bool**: 布尔值，True 或 False
- **None**: 空值

## 类型转换

```python
x = int("123")      # 字符串转整数 -> 123
y = float("3.14")   # 字符串转浮点 -> 3.14
z = str(42)         # 整数转字符串 -> "42"
```

## 动态类型

Python 是动态类型语言，变量可以随时改变类型：
```python
x = 10       # x 是 int
x = "hello"  # x 变成 str
```
"""

_DOC_CONTROL_FLOW = """\
# Python 控制流

## 条件语句

```python
score = 85

if score >= 90:
    print("优秀")
elif score >= 60:
    print("及格")
else:
    print("不及格")
```

## for 循环

```python
# 遍历列表
fruits = ["苹果", "香蕉", "橙子"]
for fruit in fruits:
    print(fruit)

# range 生成数字序列
for i in range(5):    # 0, 1, 2, 3, 4
    print(i)
```

## while 循环

```python
count = 0
while count < 5:
    print(count)
    count += 1
```

## break 和 continue

- `break`: 立即退出循环
- `continue`: 跳过本次迭代

```python
for i in range(10):
    if i == 5:
        break
    if i % 2 == 0:
        continue
    print(i)        # 输出: 1, 3
```
"""

_DOC_FUNCTIONS = """\
# Python 函数

## 定义函数

```python
def greet(name):
    \"\"\"向某人问好\"\"\"
    return f"你好，{name}！"

result = greet("小明")  # "你好，小明！"
```

## 参数类型

```python
# 默认参数
def power(base, exp=2):
    return base ** exp

# 可变参数
def total(*numbers):
    return sum(numbers)

total(1, 2, 3, 4)  # 10
```

## Lambda 表达式

```python
square = lambda x: x ** 2
numbers = [1, 2, 3, 4, 5]
squared = list(map(square, numbers))  # [1, 4, 9, 16, 25]
```

## 作用域

- **局部变量**: 函数内定义，函数外不可访问
- **全局变量**: 函数外定义，函数内可读取
- **global 关键字**: 在函数内修改全局变量
"""
