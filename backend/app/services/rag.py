"""RAG 检索增强 - 轻量级文本检索（无外部向量库依赖）"""

import re
import math
from pathlib import Path
from collections import Counter
from app.config import DATA_DIR

# 教学文档存储目录
DOCS_DIR = Path(__file__).parent.parent / "knowledge" / "docs"
# 用户上传文档目录
USER_DOCS_DIR = DATA_DIR / "docs"


def _tokenize(text: str) -> list[str]:
    """中英文分词（jieba + 英文空格分词）"""
    import jieba
    # jieba 分词处理中文，同时保留英文单词
    words = jieba.lcut(text.lower())
    # 过滤掉单字符标点和空白
    return [w.strip() for w in words if len(w.strip()) > 0 and not re.match(r'^[\s\W]$', w)]


def _compute_tfidf(docs: list[str]) -> tuple[list[dict], dict]:
    """计算 TF-IDF"""
    doc_tokens = [_tokenize(d) for d in docs]
    # DF
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

    return tfidf_docs, df


def _cosine_sim(a: dict, b: dict) -> float:
    """余弦相似度"""
    common = set(a.keys()) & set(b.keys())
    if not common:
        return 0.0
    dot = sum(a[k] * b[k] for k in common)
    norm_a = math.sqrt(sum(v * v for v in a.values()))
    norm_b = math.sqrt(sum(v * v for v in b.values()))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class SimpleRAG:
    """轻量级 RAG 检索器"""

    def __init__(self):
        self.chunks: list[str] = []
        self.metadata: list[dict] = []
        self.tfidf_docs: list[dict] = []
        self._loaded = False

    def load_documents(self, domain: str = None):
        """加载教学文档"""
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
                # 推断 domain：取父目录名（如果在子目录中）
                file_domain = (
                    filepath.parent.name
                    if filepath.parent != docs_dir
                    else ""
                )
                file_chunks = self._split_chunks(
                    content, filepath.stem, domain=file_domain,
                )
                self.chunks.extend(file_chunks)

        # 读取用户上传文档
        if USER_DOCS_DIR.exists():
            user_patterns = (
                [f"{domain}/*.md"] if domain else ["**/*.md"]
            )
            for pattern in user_patterns:
                for filepath in USER_DOCS_DIR.glob(pattern):
                    content = filepath.read_text(encoding="utf-8")
                    file_domain = (
                        filepath.parent.name
                        if filepath.parent != USER_DOCS_DIR
                        else ""
                    )
                    file_chunks = self._split_chunks(
                        content, filepath.stem, domain=file_domain,
                    )
                    self.chunks.extend(file_chunks)

        if self.chunks:
            self.tfidf_docs, _ = _compute_tfidf(self.chunks)
        self._loaded = True

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

    def search(self, query: str, top_k: int = 3, domain: str = None) -> list[dict]:
        """检索最相关的文档片段"""
        if not self.chunks:
            self.load_documents()

        if not self.chunks:
            return []

        query_tokens = _tokenize(query)
        query_tf = Counter(query_tokens)
        total = len(query_tokens) if query_tokens else 1
        query_tfidf = {t: count / total for t, count in query_tf.items()}

        # 如果指定 domain，只在该 domain 的 chunks 中检索
        if domain:
            candidates = [
                (i, doc_tfidf)
                for i, doc_tfidf in enumerate(self.tfidf_docs)
                if i < len(self.metadata)
                and self.metadata[i].get("domain") == domain
            ]
        else:
            candidates = list(enumerate(self.tfidf_docs))

        scores = []
        for i, doc_tfidf in candidates:
            sim = _cosine_sim(query_tfidf, doc_tfidf)
            scores.append((sim, i))

        scores.sort(reverse=True)

        results = []
        for sim, idx in scores[:top_k]:
            if sim > 0.01:
                results.append({
                    "content": self.chunks[idx],
                    "score": round(sim, 4),
                    "source": (
                        self.metadata[idx]["source"]
                        if idx < len(self.metadata)
                        else "unknown"
                    ),
                })

        return results

    def reload(self):
        """重新加载文档"""
        self._loaded = False
        self.chunks = []
        self.metadata = []
        self.tfidf_docs = []
        self.load_documents()

    def _create_default_docs(self):
        """创建默认教学文档"""
        python_dir = DOCS_DIR / "python"
        python_dir.mkdir(exist_ok=True)

        (python_dir / "variables.md").write_text(
            _DOC_VARIABLES, encoding="utf-8"
        )
        (python_dir / "control_flow.md").write_text(
            _DOC_CONTROL_FLOW, encoding="utf-8"
        )
        (python_dir / "functions.md").write_text(
            _DOC_FUNCTIONS, encoding="utf-8"
        )


# --- 全局单例 ---

_rag_instance: SimpleRAG | None = None


def get_rag() -> SimpleRAG:
    """获取 RAG 检索器单例"""
    global _rag_instance
    if _rag_instance is None:
        _rag_instance = SimpleRAG()
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
        parts.append(f"--- 片段 {i} (来源: {r['source']}) ---")
        parts.append(r["content"][:400])

    return "\n".join(parts)


# --- 预置教学文档内容 ---

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

# enumerate 同时获取索引和值
for i, fruit in enumerate(fruits):
    print(f"{i}: {fruit}")
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
- `continue`: 跳过本次迭代，进入下一次

```python
for i in range(10):
    if i == 5:
        break       # 到 5 就停
    if i % 2 == 0:
        continue    # 跳过偶数
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

# 关键字参数
def info(name, age, city="北京"):
    print(f"{name}, {age}岁, 来自{city}")

info(name="小红", age=20, city="上海")

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

```python
x = 10  # 全局

def modify():
    global x
    x = 20  # 修改全局变量

modify()
print(x)  # 20
```
"""
