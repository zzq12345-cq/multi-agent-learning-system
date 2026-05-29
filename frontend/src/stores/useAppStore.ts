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

  wsConnected: boolean
  setWsConnected: (connected: boolean) => void
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

  showSettings: false,
  setShowSettings: (show) => set({ showSettings: show }),

  rightPanel: 'graph',
  setRightPanel: (panel) => set({ rightPanel: panel }),

  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),
}))
