/** 全局状态管理 */

import { create } from 'zustand'
import type { ChatMessage, LearningPath, StudentProfile, AgentTrace, NodeState } from '../types'

interface AppState {
  // 用户认证
  user: { userId: string; username: string; token: string } | null
  setUser: (user: { userId: string; username: string; token: string } | null) => void
  logout: () => void

  sessionId: string
  setSessionId: (id: string) => void

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

  rightPanel: 'graph' | 'progress'
  setRightPanel: (panel: 'graph' | 'progress') => void

  wsConnected: boolean
  setWsConnected: (connected: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  user: (() => {
    const token = localStorage.getItem('auth_token')
    const username = localStorage.getItem('auth_username')
    const userId = localStorage.getItem('auth_user_id')
    if (token && username && userId) return { token, username, userId }
    return null
  })(),
  setUser: (user) => {
    if (user) {
      localStorage.setItem('auth_token', user.token)
      localStorage.setItem('auth_username', user.username)
      localStorage.setItem('auth_user_id', user.userId)
    } else {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_username')
      localStorage.removeItem('auth_user_id')
    }
    set({ user })
  },
  logout: () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_username')
    localStorage.removeItem('auth_user_id')
    set({ user: null })
  },

  sessionId: crypto.randomUUID(),
  setSessionId: (id) => set({ sessionId: id }),

  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateLastAssistantContent: (content) => set((s) => {
    const msgs = [...s.messages]
    let lastIdx = -1
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'assistant') { lastIdx = i; break }
    }
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

  rightPanel: 'graph',
  setRightPanel: (panel) => set({ rightPanel: panel }),

  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),
}))
