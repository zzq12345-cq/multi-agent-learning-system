# 智学多Agent — 个性化学习多智能体系统

> 中国软件杯 A3 赛题：基于大模型的个性化资源生成与学习多智能体系统开发

## 系统简介

本系统通过 6 个专业化 AI Agent 协作，为学生提供个性化学习体验：

| Agent | 职责 |
|-------|------|
| 🎯 协调者 | 意图识别，任务分发 |
| 📊 画像师 | 学生能力评估 |
| 🗺️ 规划师 | 个性化学习路径规划 |
| 📝 生成器 | 学习资源生成 |
| 👨‍🏫 导师 | 实时答疑解惑 |
| ✅ 评估师 | 学习效果评估 |

## 快速启动

### 方式一：Docker Compose（推荐）

```bash
docker compose up --build
```

访问 http://localhost 即可使用。

### 方式二：本地开发

**后端：**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**前端：**

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

## 使用说明

1. 首次使用需配置 LLM API Key（点击右上角「设置」）
2. 支持 DeepSeek、OpenAI、通义千问等兼容 OpenAI 接口的模型
3. API Key 仅存储在浏览器本地，不会上传到服务器

## 技术栈

- **后端**: Python 3.11 / FastAPI / LangGraph
- **前端**: React 18 / TypeScript / Vite / Tailwind CSS / ReactFlow
- **AI**: LangChain + OpenAI 兼容接口
- **部署**: Docker Compose

## 项目结构

```
├── backend/          # Python 后端
│   ├── app/
│   │   ├── agents/  # 6 个 Agent 实现
│   │   ├── api/     # REST API
│   │   └── knowledge/ # 预置知识图谱
│   └── requirements.txt
├── frontend/         # React 前端
│   ├── src/
│   │   ├── components/  # UI 组件
│   │   ├── pages/       # 页面
│   │   ├── stores/      # 状态管理
│   │   └── services/    # API 调用
│   └── package.json
├── docker-compose.yml
└── README.md
```

## 演示场景

1. **零基础学生**：完整评估 → 生成 Python 入门路径 → 逐节点学习
2. **有基础学生**：快速评估 → 跳过基础 → 从进阶内容开始
3. **学习答疑**：针对具体知识点提问 → 导师苏格拉底式引导
4. **阶段测试**：评估师出题 → 评判答案 → 识别薄弱点 → 调整路径
