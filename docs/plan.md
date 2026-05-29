# 实现计划: 多智能体个性化学习系统 V1

## 里程碑规划（4 周）

### Week 1: 基础架构 + 核心 Agent
- [x] 项目脚手架（前后端）
- [ ] Agent 基础框架（LangGraph 状态机）
- [ ] Coordinator + Planner Agent 实现
- [ ] 基础 API 层
- [ ] 数据库 schema 设计

### Week 2: Agent 完善 + 前端核心页面
- [ ] Generator + Tutor + Assessor Agent
- [ ] 知识图谱数据结构与预置数据
- [ ] 前端：登录/注册、学习主页、对话界面
- [ ] WebSocket 流式对话

### Week 3: 个性化 + 可视化
- [ ] Profiler Agent + 学生画像系统
- [ ] 学习路径可视化（知识图谱）
- [ ] Agent 协作过程可视化
- [ ] 学习进度看板

### Week 4: 打磨 + 演示准备
- [ ] 端到端流程测试
- [ ] 演示场景设计与数据准备
- [ ] 性能优化（缓存、并发）
- [ ] 文档完善、部署脚本
- [ ] 7 分钟演示视频录制

## 模块依赖图

```
┌─────────────────────────────────────────────────┐
│                   Frontend (React)               │
│  ┌──────┐ ┌──────────┐ ┌────────┐ ┌─────────┐  │
│  │ Chat │ │ Learning │ │ Graph  │ │Dashboard│  │
│  │  UI  │ │   Path   │ │  Viz   │ │         │  │
│  └──┬───┘ └────┬─────┘ └───┬────┘ └────┬────┘  │
└─────┼──────────┼───────────┼───────────┼────────┘
      │ WebSocket│    REST   │   REST    │
┌─────┼──────────┼───────────┼───────────┼────────┐
│     ▼          ▼           ▼           ▼        │
│              API Gateway (FastAPI)               │
│  ┌─────────────────────────────────────────┐    │
│  │         Agent Orchestrator (LangGraph)   │    │
│  │  ┌────────┐ ┌────────┐ ┌──────────┐    │    │
│  │  │Profiler│ │Planner │ │Generator │    │    │
│  │  └────────┘ └────────┘ └──────────┘    │    │
│  │  ┌────────┐ ┌────────┐ ┌──────────┐    │    │
│  │  │ Tutor  │ │Assessor│ │Coordinator│   │    │
│  │  └────────┘ └────────┘ └──────────┘    │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │PostgreSQL│  │ ChromaDB │  │    Redis      │  │
│  │(用户/进度)│  │(知识向量) │  │  (缓存/会话) │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
└──────────────────────────────────────────────────┘
```

## 目录结构

```
A3-多智能体学习系统/
├── docs/                    # 文档
├── backend/                 # Python 后端
│   ├── app/
│   │   ├── main.py         # FastAPI 入口
│   │   ├── config.py       # 配置
│   │   ├── models/         # 数据模型
│   │   ├── api/            # API 路由
│   │   │   ├── chat.py     # 对话接口
│   │   │   ├── learning.py # 学习路径接口
│   │   │   ├── user.py     # 用户接口
│   │   │   └── dashboard.py# 数据看板接口
│   │   ├── agents/         # Agent 实现
│   │   │   ├── coordinator.py
│   │   │   ├── profiler.py
│   │   │   ├── planner.py
│   │   │   ├── generator.py
│   │   │   ├── tutor.py
│   │   │   ├── assessor.py
│   │   │   └── graph.py    # LangGraph 编排
│   │   ├── knowledge/      # 知识图谱
│   │   │   ├── graph.py    # 图谱数据结构
│   │   │   └── data/       # 预置知识图谱
│   │   ├── services/       # 业务逻辑
│   │   └── db/             # 数据库
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/               # React 前端
│   ├── src/
│   │   ├── components/     # 通用组件
│   │   ├── pages/          # 页面
│   │   ├── hooks/          # 自定义 hooks
│   │   ├── stores/         # Zustand stores
│   │   ├── services/       # API 调用
│   │   └── types/          # TypeScript 类型
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## 技术实现要点

### 1. LangGraph Agent 编排

使用 LangGraph 的 StateGraph 实现 Agent 协作：
- 定义全局 State（学生画像、当前任务、对话历史）
- 每个 Agent 是一个 Node
- 通过条件边（Conditional Edge）实现动态路由
- Coordinator 作为入口节点，根据意图分发

### 2. 知识图谱结构

```python
# 节点：知识点
KnowledgeNode:
  id, name, description, difficulty, prerequisites[], domain

# 边：依赖关系
KnowledgeEdge:
  source, target, relation_type (prerequisite/related/advanced)
```

### 3. 个性化算法

- 基于知识图谱的拓扑排序 + 学生已掌握节点 → 推荐下一步
- 难度自适应：根据评估结果动态调整
- 学习风格适配：视觉型/实践型/理论型 → 不同资源格式

### 4. 流式对话

- WebSocket 连接保持
- Agent 输出 token 级流式传输
- 支持中断和追问

## 当前执行：Week 1 Day 1

立即开始：
1. ✅ 创建项目脚手架
2. 🔄 后端 FastAPI 基础结构
3. 🔄 Agent 基础框架
4. ⏸ 前端 React 项目初始化
5. ⏸ 数据库 schema
