/** 全局状态管理 */

import { create } from 'zustand'
import type { ChatMessage, LearningPath, StudentProfile } from '../types'

interface AppState {
  // 会话
  sessionId: string
  setSessionId: (id: string) => void

  // LLM 配置
  llmConfig: { apiKey: string; baseUrl: string; model: string }
  setLlmConfig: (config: { apiKey: string; baseUrl: string; model: string }) => void
  isConfigured: () => boolean

  // 消息
  messages: ChatMessage[]
  addMessage: (msg: ChatMessage) => void
  clearMessages: () => void

  // 加载状态
  isLoading: boolean
  setLoading: (loading: boolean) => void

  // 当前活跃 Agent
  activeAgent: string | null
  setActiveAgent: (agent: string | null) => void

  // Agent 协作记录
  agentOutputs: Record<string, string>
  setAgentOutputs: (outputs: Record<string, string>) => void

  // 学习路径
  learningPath: LearningPath | null
  setLearningPath: (path: LearningPath | null) => void

  // 学生画像
  profile: StudentProfile | null
  setProfile: (profile: StudentProfile | null) => void

  // 设置弹窗
  showSettings: boolean
  setShowSettings: (show: boolean) => void
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
  clearMessages: () => set({ messages: [] }),

  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  activeAgent: null,
  setActiveAgent: (agent) => set({ activeAgent: agent }),

  agentOutputs: {},
  setAgentOutputs: (outputs) => set({ agentOutputs: outputs }),

  learningPath: null,
  setLearningPath: (path) => set({ learningPath: path }),

  profile: null,
  setProfile: (profile) => set({ profile: profile }),

  showSettings: false,
  setShowSettings: (show) => set({ showSettings: show }),
}))
