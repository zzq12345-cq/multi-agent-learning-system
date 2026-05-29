# 轻量社交系统设计文档

## 概述

为多智能体学习系统增加轻量社交功能：排行榜 + 学习动态 Feed + 成就徽章 + 路径分享。目标是通过社交激励和信息共享提升用户学习动力。

## 架构

在现有系统上增加 `social` 模块，不改动 Agent/Chat 逻辑。在关键节点（完成学习、通过评估）时写入社交事件。

```
用户行为 → 事件写入（JSON 文件） → Social API → 前端展示
```

技术约束：不引入新依赖，用现有 JSON 文件存储。

## 后端模块

### backend/app/services/social.py

社交事件引擎，职责：
- 写入学习动态事件
- 查询动态列表（全局 / 个人）
- 计算排行榜（综合评分）
- 徽章条件判定
- 点赞计数

### backend/app/api/social.py

REST API 端点：
- `GET /api/social/feed` — 全局动态（最近 20 条）
- `GET /api/social/leaderboard` — 排行榜 Top 10
- `GET /api/social/badges/{user_id}` — 用户徽章列表
- `POST /api/social/share-path` — 分享学习路径
- `POST /api/social/like/{activity_id}` — 点赞

## 前端模块

### frontend/src/pages/SocialPage.tsx

社交主页面，三个 tab：
- 动态 Feed
- 排行榜
- 我的徽章

### frontend/src/components/Leaderboard.tsx

排行榜组件，展示 Top 10 用户的综合评分、完成节点数、头像。

### frontend/src/components/ActivityFeed.tsx

学习动态时间线，展示所有用户的学习事件，支持点赞。

### frontend/src/components/BadgeWall.tsx

徽章展示墙，已获得徽章高亮 + 未解锁徽章灰色 + 解锁条件提示。

## 数据模型

### Activity（学习动态）

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "username": "string",
  "type": "node_completed | path_created | assessment_passed | badge_earned | path_shared",
  "content": "描述文本",
  "metadata": {"node_name": "...", "score": 85, ...},
  "likes": 0,
  "liked_by": [],
  "timestamp": 1234567890
}
```

### 排行榜（实时计算）

综合评分公式：`完成节点数 × 0.4 + 平均掌握度 × 0.4 + 学习天数 × 0.2`

从各用户的 session 数据中聚合计算，不单独持久化。

### 徽章定义

| ID | 名称 | 图标 | 解锁条件 |
|----|------|------|----------|
| first_learn | 初学者 | 🌱 | 完成首次学习 |
| perfect_score | 满分达人 | 🎯 | 任一评估得分 ≥ 95 |
| path_master | 路径大师 | 🗺️ | 完成一条完整学习路径 |
| streak_3 | 坚持不懈 | 🔥 | 连续 3 天学习 |
| multi_subject | 全科学霸 | 🌟 | 在 2 个以上学科有学习记录 |

## 集成点

### 事件触发时机

在现有 Agent 流程的关键节点自动写入动态：
- `assessor_node` 评估通过时 → `assessment_passed`
- `planner_node` 生成路径时 → `path_created`
- `learning_engine.complete_node` 完成节点时 → `node_completed`
- 徽章解锁时 → `badge_earned`

### 前端路由

在 App.tsx 增加 `/social` 路由，Header 增加"社区"导航入口。

## 存储

`backend/data/social/activities.json` — 动态事件列表
`backend/data/social/badges.json` — 用户徽章记录

## 不做的事

- 不做实时推送（轮询或刷新获取）
- 不做私信/聊天
- 不做关注/粉丝关系
- 不做评论（只有点赞）
- 不引入新依赖
