# Task 1: 类型定义与 AgentState 扩展

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `backend/app/agents/__init__.py`

---

- [ ] **Step 1: 前端增加 WebSocket 事件类型**

在 `frontend/src/types/index.ts` 末尾追加：

```typescript
// ===== WebSocket 事件 =====

export type WSEventType =
  | 'agent_start'
  | 'agent_end'
  | 'token'
  | 'route'
  | 'done'
  | 'error'

export interface WSEvent {
  type: WSEventType
  agent?: string
  content?: string
  route_from?: string
  route_to?: string
  agent_outputs?: Record<string, string>
  learning_path?: LearningPath | null
  user_profile?: StudentProfile | null
  error?: string
  timestamp?: number
}

export interface AgentTrace {
  agent: string
  action: 'start' | 'end' | 'route'
  timestamp: number
  detail?: string
}

export type NodeStatus = 'locked' | 'available' | 'in_progress' | 'completed'

export interface NodeState {
  nodeId: string
  status: NodeStatus
  score?: number
}
```

- [ ] **Step 2: 后端 AgentState 增加 event_log**

在 `backend/app/agents/__init__.py` 的 `AgentState` 类末尾增加一行：

```python
    event_log: list  # Agent 协作事件日志
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/types/index.ts backend/app/agents/__init__.py
git commit -m "feat: 定义 WebSocket 事件协议与 AgentState 扩展"
```
