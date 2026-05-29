# 多智能体学习系统优化 — 总览

**Goal:** 将系统从 MVP 升级为比赛演示级别

**Architecture:** WebSocket 事件流 + Agent 协作可视化 + 知识图谱联动 + 会话持久化 + 链式协作

**Tech Stack:** Python/FastAPI/LangGraph + React/TypeScript/Zustand/ReactFlow/Tailwind

---

## 任务拆分（按优先级）

| # | 任务 | 优先级 | 文件 |
|---|------|--------|------|
| 1 | 类型定义与 AgentState 扩展 | P0 | [task-01.md](tasks/task-01-types.md) |
| 2 | Agent 图链式协作 | P2 | [task-02.md](tasks/task-02-chain-graph.md) |
| 3 | WebSocket 事件流后端 | P1 | [task-03.md](tasks/task-03-ws-backend.md) |
| 4 | 前端 WebSocket 服务 + Store | P1 | [task-04.md](tasks/task-04-ws-frontend.md) |
| 5 | ChatPanel 流式对话 | P1 | [task-05.md](tasks/task-05-chat-stream.md) |
| 6 | Agent 协作流转可视化 | P0 | [task-06.md](tasks/task-06-agent-viz.md) |
| 7 | 知识图谱节点状态联动 | P1 | [task-07.md](tasks/task-07-graph-states.md) |
| 8 | 会话持久化 | P1 | [task-08.md](tasks/task-08-persistence.md) |
| 9 | 学习进度看板 | P2 | [task-09.md](tasks/task-09-dashboard.md) |
| 10 | 补充学科知识图谱 | P2 | [task-10.md](tasks/task-10-extra-graphs.md) |

## 执行顺序

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

依赖关系：Task 3-6 依赖 Task 1；Task 5 依赖 Task 4；Task 6 依赖 Task 4
