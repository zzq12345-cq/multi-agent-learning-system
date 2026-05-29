# 设计规格：基于大模型的个性化资源生成与学习多智能体系统

> 中国软件杯 A3 赛题 | 2026-05-29

## 1. 概述

### 1.1 目标

构建一个多 Agent 协作的个性化学习平台，通过 6 个专业化 Agent 协同工作，为学生提供能力评估、路径规划、资源生成、实时答疑和学习评估的完整闭环。

### 1.2 核心约束

| 约束 | 说明 |
|------|------|
| 团队 | 3-5 人，全栈 + AI |
| 时间 | 1 个月（截止 2026-06-30） |
| LLM | DeepSeek（用户自配 Key，前端输入，后端透传） |
| 演示领域 | Python 编程 |
| 部署 | Docker Compose 一键启动 |

### 1.3 成功标准

1. 6 个 Agent 全部可工作，协作流程完整可演示
2. 不同学生画像产生明显不同的学习路径和资源
3. 7 分钟内能完整展示核心流程
4. Agent 协作过程实时可视化
5. 一键部署，评委可复现

## 2. 系统架构

### 2.1 整体架构

```
Frontend (React 18 + Vite + Tailwind)
    ↕ REST API + WebSocket
Backend (Python FastAPI, 无状态)
    ├── LangGraph Agent Orchestrator
    │     ├── Coordinator (路由)
    │     ├── Profiler (画像)
    │     ├── Planner (规划)
    │     ├── Generator (生成)
    │     ├── Tutor (答疑)
    │     └── Assessor (评估)
    ├── SQLite (会话/进度/画像)
    └── ChromaDB (知识向量检索)
```

### 2.2 API Key 管理

- 前端设置页：用户输入 API Key + Base URL + Model
- 存储：localStorage（浏览器本地）
- 传递：每次 API 请求通过 `X-LLM-API-Key` / `X-LLM-Base-URL` / `X-LLM-Model` 请求头
- 后端：从请求头读取，不持久化，不记录日志

### 2.3 数据流

```
用户输入 → Coordinator(意图识别)
              ├→ Profiler → 更新画像 → 存 DB
              ├→ Planner → 生成路径 → 存 DB + 返回前端可视化
              ├→ Generator → 生成资源 → 返回 Markdown
              ├→ Tutor → 流式回复
              └→ Assessor → 生成题目/评判 → 反馈给 Planner
```

## 3. Agent 设计

### 3.1 Coordinator（协调者）

- 输入：用户消息 + 当前上下文
- 输出：路由决策（下一个 Agent）或直接回复
- 策略：基于意图分类，规则优先 + LLM 兜底

### 3.2 Profiler（画像师）

- 输入：用户对话
- 输出：学生画像（level, style, goals, strengths, weaknesses）
- 策略：2-3 轮对话快速评估，不像考试

### 3.3 Planner（规划师）

- 输入：学生画像 + 学习目标
- 输出：知识图谱结构的学习路径（JSON）
- 策略：拓扑排序 + 难度梯度 + 跳过已掌握内容
- 节点数：8-15 个（适合演示）

### 3.4 Generator（生成器）

- 输入：知识点 + 学生画像
- 输出：Markdown 格式学习资源
- 资源类型：讲义、练习题、代码示例、总结
- 策略：根据学习风格调整内容形式

### 3.5 Tutor（导师）

- 输入：学生问题 + 上下文
- 输出：流式回复
- 策略：苏格拉底式引导，不直接给答案

### 3.6 Assessor（评估师）

- 输入：知识点 + 学生画像
- 输出：测试题（JSON）或评分结果
- 策略：选择题/填空题/代码题，评判后识别薄弱点

## 4. 前端设计

### 4.1 页面结构

| 页面 | 功能 |
|------|------|
| 首页 | 产品介绍 + 快速开始 |
| 设置页 | API Key 配置 |
| 学习主页 | 三栏布局：对话 + 路径图 + Agent 面板 |
| 知识图谱页 | 全屏 ReactFlow 交互式图谱 |

### 4.2 学习主页三栏布局

```
┌──────────────────────────────────────────────────┐
│  Header: 系统名称 + 导航                          │
├────────────┬──────────────────┬──────────────────┤
│  左侧栏    │    中间主区域     │    右侧栏        │
│  Agent     │    对话界面       │    知识图谱      │
│  协作面板  │    (流式输出)     │    (ReactFlow)   │
│            │                  │                  │
│  显示当前  │    用户输入框     │    当前节点高亮  │
│  Agent状态 │                  │    进度标记      │
├────────────┴──────────────────┴──────────────────┤
│  Footer: 学习进度条                               │
└──────────────────────────────────────────────────┘
```

### 4.3 Agent 协作可视化

- 左侧面板实时显示：当前活跃 Agent（高亮）、数据流向（动画箭头）
- 每条消息标注来源 Agent（彩色标签）
- Agent 切换时有过渡动画

## 5. 技术栈

### 5.1 后端

| 组件 | 选择 | 版本 |
|------|------|------|
| 语言 | Python | 3.11+ |
| 框架 | FastAPI | 0.115+ |
| Agent | LangGraph | 0.2+ |
| LLM | langchain-openai | 0.2+ |
| 数据库 | SQLite + aiosqlite | - |
| 向量库 | ChromaDB | 0.5+ |

### 5.2 前端

| 组件 | 选择 | 版本 |
|------|------|------|
| 框架 | React | 18.3+ |
| 构建 | Vite | 5.4+ |
| 样式 | Tailwind CSS | 3.4+ |
| 状态 | Zustand | 4.5+ |
| 图谱 | ReactFlow | 11+ |
| 图标 | Lucide React | - |
| Markdown | react-markdown | 9+ |

### 5.3 部署

- Docker Compose（backend + frontend nginx）
- 一键 `docker compose up` 启动

## 6. 数据模型

### 6.1 核心表

- `users` — 用户基本信息
- `student_profiles` — 学生画像（JSON 字段存储灵活数据）
- `learning_paths` — 学习路径（nodes/edges 为 JSON）
- `node_progress` — 节点学习进度
- `conversations` — 对话会话
- `messages` — 对话消息（含 agent_name 标记来源）
- `generated_resources` — 生成的学习资源

### 6.2 知识图谱结构（JSON in learning_paths）

```json
{
  "nodes": [{"id": "n1", "name": "变量与类型", "difficulty": 1, "prerequisites": []}],
  "edges": [{"source": "n1", "target": "n2", "relation": "prerequisite"}]
}
```

## 7. 预置数据

### 7.1 Python 编程知识图谱

预置一套完整的 Python 入门到进阶知识图谱（约 12 个节点）：

1. 变量与数据类型
2. 运算符与表达式
3. 条件语句
4. 循环结构
5. 函数定义
6. 列表与元组
7. 字典与集合
8. 字符串处理
9. 文件操作
10. 异常处理
11. 面向对象基础
12. 模块与包

### 7.2 演示场景

- 场景 1：零基础学生 → 完整路径
- 场景 2：有基础学生 → 跳过前 4 节点
- 场景 3：学习中遇到问题 → Tutor 答疑
- 场景 4：阶段测试 → Assessor 评估 → 路径调整

## 8. 非功能需求

- 响应时间：首 token < 2s（取决于 LLM API）
- 并发：支持单用户演示即可
- 安全：API Key 不落盘、不记日志
- 可复现：README 包含完整启动步骤
