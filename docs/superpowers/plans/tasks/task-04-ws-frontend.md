# Task 4: 前端 WebSocket 服务 + Store 扩展

**Files:**
- Create: `frontend/src/services/websocket.ts`
- Modify: `frontend/src/stores/useAppStore.ts`

---

- [ ] **Step 1: 创建 WebSocket 服务**

创建 `frontend/src/services/websocket.ts`：

```typescript
/** WebSocket 连接管理 — Agent 事件流 */

import type { WSEvent } from '../types'

type EventHandler = (event: WSEvent) => void

class AgentWebSocket {
  private ws: WebSocket | null = null
  private url: string
  private handlers: EventHandler[] = []
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(sessionId: string) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    this.url = `${protocol}//${host}/api/chat/ws/${sessionId}`
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url)
      this.ws.onopen = () => resolve()
      this.ws.onmessage = (evt) => {
        try {
          const data: WSEvent = JSON.parse(evt.data)
          this.handlers.forEach((h) => h(data))
        } catch { /* 忽略非 JSON */ }
      }
      this.ws.onerror = () => reject(new Error('WebSocket 连接失败'))
      this.ws.onclose = () => {
        this.reconnectTimer = setTimeout(() => {
          this.connect().catch(() => {})
        }, 3000)
      }
    })
  }

  send(message: string, llmConfig: { apiKey: string; baseUrl: string; model: string }) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket 未连接')
    }
    this.ws.send(JSON.stringify({
      message,
      llm_config: {
        api_key: llmConfig.apiKey,
        base_url: llmConfig.baseUrl,
        model: llmConfig.model,
      },
    }))
  }

  onEvent(handler: EventHandler) {
    this.handlers.push(handler)
    return () => { this.handlers = this.handlers.filter((h) => h !== handler) }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
    this.handlers = []
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export default AgentWebSocket
```

- [ ] **Step 2: 扩展 Store**

完整替换 `frontend/src/stores/useAppStore.ts`：

```typescript
/** 全局状态管理 */

import { create } from 'zustand'
import type { ChatMessage, LearningPath, StudentProfile, AgentTrace, NodeState } from '../types'

interface AppState {
  sessionId: string
  setSessionId: (id: string) => void

  llmConfig: { apiKey: string; baseUrl: string; model: string }
  setLlmConfig: (config: { apiKey: string; baseUrl: string; model: string }) => void
  isConfigured: () => boolean

  messages: ChatMessage[]
  addMessage: (msg: ChatMessage) => void
  updateLastAssistantContent: (content: string) => void
  clearMessages: () => void

  isLoading: boolean
  setLoading: (loading: boolean) => void

  activeAgent: string | null
  setActiveAgent: (agent: string | null) => void

  agentOutputs: Record<string, string>
  setAgentOutputs: (outputs: Record<string, string>) => void

  agentTraces: AgentTrace[]
  addTrace: (trace: AgentTrace) => void
  clearTraces: () => void

  streamingContent: string
  appendStreamingContent: (chunk: string) => void
  clearStreamingContent: () => void

  learningPath: LearningPath | null
  setLearningPath: (path: LearningPath | null) => void

  nodeStates: NodeState[]
  setNodeStates: (states: NodeState[]) => void
  updateNodeState: (nodeId: string, status: NodeState['status'], score?: number) => void

  profile: StudentProfile | null
  setProfile: (profile: StudentProfile | null) => void

  showSettings: boolean
  setShowSettings: (show: boolean) => void

  rightPanel: 'graph' | 'progress'
  setRightPanel: (panel: 'graph' | 'progress') => void
}

export const useAppStore = create<AppState>((set, get) => ({
  sessionId: crypto.randomUUID(),
  setSessionId: (id) => set({ sessionId: id }),

  llmConfig: {
    apiKey: localStorage.getItem('llm_api_key') || '',
    baseUrl: localStorage.getItem('llm_base_url') || 'https://api.deepseek.com/v1',
    model: localStorage.getItem('llm_model') || 'deepseek-chat',
  },
  setLlmConfig: (config) => {
    localStorage.setItem('llm_api_key', config.apiKey)
    localStorage.setItem('llm_base_url', config.baseUrl)
    localStorage.setItem('llm_model', config.model)
    set({ llmConfig: config })
  },
  isConfigured: () => !!get().llmConfig.apiKey,

  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateLastAssistantContent: (content) => set((s) => {
    const msgs = [...s.messages]
    const lastIdx = msgs.findLastIndex((m) => m.role === 'assistant')
    if (lastIdx >= 0) msgs[lastIdx] = { ...msgs[lastIdx], content }
    return { messages: msgs }
  }),
  clearMessages: () => set({ messages: [] }),

  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  activeAgent: null,
  setActiveAgent: (agent) => set({ activeAgent: agent }),

  agentOutputs: {},
  setAgentOutputs: (outputs) => set({ agentOutputs: outputs }),

  agentTraces: [],
  addTrace: (trace) => set((s) => ({ agentTraces: [...s.agentTraces, trace] })),
  clearTraces: () => set({ agentTraces: [] }),

  streamingContent: '',
  appendStreamingContent: (chunk) => set((s) => ({
    streamingContent: s.streamingContent + chunk,
  })),
  clearStreamingContent: () => set({ streamingContent: '' }),

  learningPath: null,
  setLearningPath: (path) => set({ learningPath: path }),

  nodeStates: [],
  setNodeStates: (states) => set({ nodeStates: states }),
  updateNodeState: (nodeId, status, score) => set((s) => {
    const states = [...s.nodeStates]
    const idx = states.findIndex((n) => n.nodeId === nodeId)
    if (idx >= 0) {
      states[idx] = { ...states[idx], status, score: score ?? states[idx].score }
    } else {
      states.push({ nodeId, status, score })
    }
    return { nodeStates: states }
  }),

  profile: null,
  setProfile: (profile) => set({ profile }),

  showSettings: false,
  setShowSettings: (show) => set({ showSettings: show }),

  rightPanel: 'graph',
  setRightPanel: (panel) => set({ rightPanel: panel }),
}))
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/services/websocket.ts frontend/src/stores/useAppStore.ts
git commit -m "feat: WebSocket 服务 + Store 扩展（协作轨迹、流式、进度）"
```
