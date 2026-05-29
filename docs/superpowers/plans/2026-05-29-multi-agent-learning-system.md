# 多智能体个性化学习系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于 LangGraph 的多 Agent 协作学习平台，支持用户自配 LLM Key，演示 Python 编程学习的完整闭环。

**Architecture:** FastAPI 后端通过 LangGraph StateGraph 编排 6 个 Agent（Coordinator/Profiler/Planner/Generator/Tutor/Assessor）。前端 React + ReactFlow 实现对话、知识图谱可视化和 Agent 协作面板。API Key 由前端存储并通过请求头传递。

**Tech Stack:** Python 3.11 / FastAPI / LangGraph / SQLite / React 18 / Vite / Tailwind / ReactFlow / Zustand

---

## File Structure

```
backend/
├── app/
│   ├── main.py                    # FastAPI 入口，CORS，路由注册
│   ├── config.py                  # 应用配置（数据库路径等，不含 LLM Key）
│   ├── deps.py                    # 依赖注入（从请求头提取 LLM 配置）
│   ├── models/
│   │   ├── __init__.py
│   │   └── models.py             # SQLAlchemy 数据模型
│   ├── db/
│   │   ├── __init__.py
│   │   └── database.py           # 数据库连接
│   ├── agents/
│   │   ├── __init__.py           # AgentState 定义 + get_llm（接受参数）
│   │   ├── coordinator.py        # 协调者
│   │   ├── profiler.py           # 画像师
│   │   ├── planner.py            # 规划师
│   │   ├── generator.py          # 生成器
│   │   ├── tutor.py              # 导师
│   │   ├── assessor.py           # 评估师
│   │   └── graph.py              # LangGraph 编排
│   ├── api/
│   │   ├── __init__.py
│   │   ├── chat.py               # 对话 API（REST + WebSocket）
│   │   └── learning.py           # 学习路径 API
│   └── knowledge/
│       └── python_graph.py       # 预置 Python 知识图谱
├── requirements.txt
├── Dockerfile
└── .env.example

frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main.tsx                  # 入口
│   ├── App.tsx                   # 路由
│   ├── index.css                 # 全局样式
│   ├── types/index.ts            # 类型定义
│   ├── services/api.ts           # API 调用
│   ├── stores/useAppStore.ts     # Zustand 状态
│   ├── components/
│   │   ├── ChatPanel.tsx         # 对话面板
│   │   ├── MessageBubble.tsx     # 消息气泡
│   │   ├── AgentPanel.tsx        # Agent 协作面板
│   │   ├── KnowledgeGraph.tsx    # 知识图谱（ReactFlow）
│   │   ├── SettingsModal.tsx     # API Key 设置弹窗
│   │   └── Header.tsx            # 顶部导航
│   └── pages/
│       ├── HomePage.tsx          # 首页
│       └── LearningPage.tsx      # 学习主页（三栏）
├── Dockerfile
└── nginx.conf

docker-compose.yml
README.md
```

---

## Task 1: 后端基础 — 依赖注入与 LLM 配置透传

**Files:**
- Create: `backend/app/deps.py`
- Modify: `backend/app/agents/__init__.py`
- Modify: `backend/app/config.py`

