# 开放学科支持设计文档

## 概述

让系统从"预置 3 个编程学科"变为"支持任意学科的自适应学习平台"。用户说出任何学科，系统自动生成知识图谱并持久化；用户可上传教材文档（PDF/Word/MD/TXT）自动构建该学科的 RAG 知识库。

## 架构

```
用户说"我想学高等数学"
    ↓
Planner 生成学习路径 JSON
    ↓
自动保存为该学科的知识图谱（data/graphs/{domain}.json）
    ↓
下次同学科直接复用
    ↓
用户可上传教材（PDF/Word/MD/TXT）
    ↓
后端解析分块 → 存入 data/docs/{domain}/
    ↓
generator/tutor 检索时按学科过滤
```

## 后端模块

### backend/app/services/graph_store.py

动态知识图谱存储，职责：
- `save_graph(domain: str, graph_data: dict)` — 保存 LLM 生成的图谱到 `data/graphs/{domain}.json`
- `load_graph(domain: str) -> dict | None` — 加载已保存的图谱
- `list_all_graphs() -> list[dict]` — 合并预置图谱 + 动态图谱，返回 `[{domain, title, nodes_count, source}]`
- `delete_graph(domain: str)` — 删除动态图谱

存储位置：`data/graphs/`，每个学科一个 JSON 文件。

预置图谱（python/web/datastructure）仍从代码中加载，动态图谱从文件加载，两者合并展示。

### backend/app/services/doc_parser.py

文档解析器，职责：
- `parse_file(file_bytes: bytes, filename: str) -> str` — 根据扩展名选择解析器，返回纯文本
- 支持格式：
  - `.pdf` → pymupdf (fitz) 提取文本
  - `.docx` → python-docx 提取段落
  - `.md` / `.txt` → 直接 UTF-8 解码
- 自动检测编码（对 txt 文件）
- 文件大小上限：10MB

### backend/app/api/subjects.py

学科管理 API：
- `GET /api/subjects` — 列出所有学科（预置 + 动态），返回 `{subjects: [{domain, title, nodes_count, source, doc_count}]}`
- `POST /api/subjects/{domain}/upload` — 上传文档到指定学科（multipart/form-data）
- `GET /api/subjects/{domain}/docs` — 列出该学科已上传的文档
- `DELETE /api/subjects/{domain}/docs/{filename}` — 删除文档
- `DELETE /api/subjects/{domain}` — 删除动态学科（预置学科不可删）

### 修改 backend/app/agents/planner.py

在 `planner_node` 中，当 `learning_path` 解析成功时：
1. 提取 `domain` 字段
2. 调用 `graph_store.save_graph(domain, learning_path)` 自动保存
3. 下次同 domain 请求时，Planner 可参考已有图谱做增量调整

### 修改 backend/app/services/rag.py

- `load_documents(domain: str = None)` — 支持按学科加载文档
- `search_knowledge(query: str, domain: str = None, top_k: int = 3)` — 支持按学科过滤检索
- 文档目录结构：`data/docs/{domain}/*.md`（用户上传的文档解析后存为 .md）
- 预置文档目录保持不变：`backend/app/knowledge/docs/`

### 修改 backend/app/api/learning.py

- `GET /api/learning/graphs` 改为调用 `graph_store.list_all_graphs()`，合并预置 + 动态
- `GET /api/learning/graphs/{domain}` 先查动态图谱，再查预置图谱

## 前端模块

### 修改 frontend/src/components/SubjectSelector.tsx

- 数据源改为 `GET /api/subjects`（包含动态学科）
- 增加"自定义学科"提示：当列表中无匹配时，提示用户"直接在对话中说出想学的学科"

### 新增 frontend/src/components/DocUpload.tsx

文档上传组件：
- 拖拽区域 + 点击上传按钮
- 支持 PDF/Word/MD/TXT
- 显示已上传文档列表（文件名 + 大小 + 删除按钮）
- 上传成功后提示"文档已加入知识库"

### 修改 frontend/src/pages/LearningPage.tsx

右侧面板增加第三个 tab："资料"
- 展示当前学科的已上传文档
- 提供上传入口

## 数据流

### 新学科创建流程

1. 用户对话："我想学微积分"
2. Coordinator → Planner
3. Planner 生成路径 JSON（domain: "calculus"）
4. `graph_store.save_graph("calculus", path_data)` 持久化
5. 前端收到 learning_path → 图谱渲染
6. SubjectSelector 刷新 → 出现"微积分"选项

### 文档上传流程

1. 用户在"资料"tab 点击上传
2. 前端 POST multipart/form-data 到 `/api/subjects/{domain}/upload`
3. 后端 `doc_parser.parse_file()` 解析为纯文本
4. 文本存入 `data/docs/{domain}/{filename}.md`
5. RAG 索引下次查询时自动加载新文档（懒加载）

### 检索增强流程

1. generator/tutor 调用 `search_knowledge(query, domain=current_domain)`
2. RAG 优先检索当前学科文档
3. 如果当前学科无结果，回退到全局检索

## 新增依赖

```
pymupdf==1.24.0    # PDF 解析
python-docx==1.1.0 # Word 解析
```

## 存储结构

```
data/
├── graphs/              # 动态知识图谱
│   ├── calculus.json
│   └── english.json
├── docs/                # 用户上传文档（解析后）
│   ├── calculus/
│   │   └── textbook_ch1.md
│   └── english/
│       └── grammar_notes.md
├── sessions/            # 会话数据（已有）
└── social/              # 社交数据（已有）
```

## 不做的事

- 不做文档在线预览/编辑
- 不做 OCR（扫描版 PDF 不支持）
- 不做文档版本管理
- 不做多用户文档隔离（所有用户共享学科文档）
- 不做实时索引更新（懒加载，下次查询时生效）

## 边界情况

- 用户上传非支持格式 → 返回 400 错误
- 文件超过 10MB → 返回 413 错误
- 同名文件重复上传 → 覆盖旧文件
- 动态图谱 domain 与预置冲突 → 动态优先（用户可覆盖预置）
- LLM 生成的路径无 domain 字段 → 从路径 title 推断或使用 "custom"
