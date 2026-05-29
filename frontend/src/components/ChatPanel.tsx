import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/useAppStore'
import AgentWebSocket from '../services/websocket'
import MessageBubble from './MessageBubble'
import ReviewReminder from './ReviewReminder'
import OnboardingGuide from './OnboardingGuide'
import { AGENTS } from '../types'
import type { WSEvent } from '../types'
import { Send, Code, BarChart3, RefreshCw, Brain, Square, ChevronRight } from 'lucide-react'

// Agent 协作进度内联组件
function AgentProgressInline() {
  const { activeAgent, agentTraces } = useAppStore()

  const AGENT_ACTIONS: Record<string, string> = {
    coordinator: '分析意图...',
    profiler: '评估学习水平...',
    planner: '规划学习路径...',
    generator: '生成学习资源...',
    tutor: '组织回答...',
    assessor: '准备评估...',
  }

  const currentAction = activeAgent ? AGENT_ACTIONS[activeAgent] || '处理中...' : '思考中...'
  const agentName = activeAgent ? (AGENTS[activeAgent]?.displayName || activeAgent) : ''

  // 获取最新的 reasoning
  const latestReasoning = agentTraces
    .filter(t => t.action === 'route' && t.reasoning)
    .slice(-1)[0]?.reasoning

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="flex h-1.5 w-1.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
        </span>
        <span className="text-[10px] text-gray-600 font-medium">
          {agentName && <span className="text-gray-900">{agentName}</span>}
          {agentName && ' · '}
          {currentAction}
        </span>
      </div>
      {latestReasoning && (
        <div className="text-[9px] text-gray-400 pl-3.5 italic">
          {latestReasoning}
        </div>
      )}
      {agentTraces.length > 1 && (
        <div className="flex items-center gap-1 text-[8px] text-gray-400 font-mono pl-3.5">
          {agentTraces
            .filter(t => t.action === 'start')
            .slice(-4)
            .map((t, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span>&rarr;</span>}
                <span className={t.agent === activeAgent ? 'text-blue-600' : ''}>{AGENTS[t.agent]?.displayName || t.agent}</span>
              </span>
            ))}
        </div>
      )}
    </div>
  )
}

export default function ChatPanel() {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const wsRef = useRef<AgentWebSocket | null>(null)

  const {
    messages, addMessage, sessionId,
    isLoading, setLoading, setActiveAgent, setAgentOutputs,
    setLearningPath, setProfile,
    clearTraces,
    streamingContent, clearStreamingContent,
    wsConnected,
  } = useAppStore()

  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 120) + 'px'
    }
  }, [input])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    const ws = new AgentWebSocket(sessionId)
    wsRef.current = ws
    ws.onEvent(handleWSEvent)
    ws.connect().catch(() => {
      console.warn('WebSocket 连接失败，回退到 REST')
    })
    return () => { ws.disconnect() }
  }, [sessionId])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.message) {
        // 将答案作为用户消息添加到聊天记录
        const store = useAppStore.getState()
        store.addMessage({
          id: crypto.randomUUID(),
          role: 'user',
          content: detail.message,
          timestamp: Date.now(),
        })
        store.setLoading(true)
        store.clearTraces()
        store.clearStreamingContent()

        if (wsRef.current?.connected) {
          wsRef.current.send(detail.message)
        }
      }
    }
    window.addEventListener('graph-send-message', handler)
    return () => window.removeEventListener('graph-send-message', handler)
  }, [])

  const handleWSEvent = useCallback((event: WSEvent) => {
    const store = useAppStore.getState()
    switch (event.type) {
      case 'agent_start':
        store.setActiveAgent(event.agent || null)
        store.addTrace({
          agent: event.agent || '',
          action: 'start',
          timestamp: event.timestamp || Date.now(),
        })
        break

      case 'agent_end':
        store.addTrace({
          agent: event.agent || '',
          action: 'end',
          timestamp: event.timestamp || Date.now(),
        })
        break

      case 'route':
        store.addTrace({
          agent: event.route_to || '',
          action: 'route',
          timestamp: event.timestamp || Date.now(),
          detail: `${event.route_from} → ${event.route_to}`,
          reasoning: event.reasoning,
        })
        break

      case 'token':
        store.appendStreamingContent(event.content || '')
        break

      case 'done': {
        const finalContent = event.content || store.streamingContent
        if (finalContent) {
          store.addMessage({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: finalContent,
            agentName: event.agent || undefined,
            timestamp: Date.now(),
          })
        }
        if (event.agent_outputs) store.setAgentOutputs(event.agent_outputs)
        if (event.learning_path) store.setLearningPath(event.learning_path)
        if (event.user_profile) store.setProfile(event.user_profile)
        if (event.node_states) {
          const states = Object.entries(event.node_states).map(([nodeId, s]) => ({
            nodeId,
            status: s.status as any,
            score: s.score ?? undefined,
          }))
          store.setNodeStates(states)
        }
        if (event.mastery_data) {
          store.setMasteryData(event.mastery_data)
        }
        store.setActiveAgent(null)
        store.setLoading(false)
        store.clearStreamingContent()
        break
      }

      case 'error':
        store.addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `错误：${event.error || '未知错误'}`,
          timestamp: Date.now(),
        })
        store.setLoading(false)
        store.setActiveAgent(null)
        store.clearStreamingContent()
        break
    }
  }, [])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading) return

    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    })
    setInput('')
    setLoading(true)
    clearTraces()
    clearStreamingContent()

    if (wsRef.current?.connected) {
      wsRef.current.send(text)
    } else {
      try {
        const { sendMessage } = await import('../services/api')
        const res = await sendMessage(text, sessionId)
        if (res.agent_outputs) setAgentOutputs(res.agent_outputs)
        if (res.learning_path) setLearningPath(res.learning_path)
        if (res.user_profile) setProfile(res.user_profile)
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: res.reply,
          agentName: res.agent_name || undefined,
          timestamp: Date.now(),
        })
      } catch (err) {
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `${err instanceof Error ? err.message : '请求失败'}`,
          timestamp: Date.now(),
        })
      } finally {
        setLoading(false)
        setActiveAgent(null)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hints = [
    { text: '我想学 Python 基础', icon: Code },
    { text: '请对我进行编程能力评估', icon: BarChart3 },
    { text: '帮我规划前端开发学习路径', icon: RefreshCw },
  ]

  return (
    <div className="h-full flex flex-col bg-white relative overflow-hidden">
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <ReviewReminder />
        {messages.length === 0 && <OnboardingGuide />}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center mb-5">
              <Brain className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">欢迎使用多智能体智学终端</h3>
            <p className="text-sm text-gray-500 max-w-xs mb-8 leading-relaxed">
              输入你的学习目标，智能体们将协作为你定制学习方案。
            </p>
            <div className="grid grid-cols-1 gap-3 w-full">
              {hints.map((hint) => {
                const Icon = hint.icon
                return (
                  <button
                    key={hint.text}
                    onClick={() => setInput(hint.text)}
                    className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 text-sm text-gray-700 hover:text-gray-900 transition-all text-left active:scale-[0.99]"
                  >
                    <Icon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="flex-1">{hint.text}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && streamingContent && (
          <MessageBubble
            message={{ id: 'streaming', role: 'assistant', content: streamingContent, timestamp: Date.now() }}
          />
        )}

        {isLoading && !streamingContent && (
          <div className="flex gap-3.5 items-start">
            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-500 flex-shrink-0">
              <Brain className="w-4 h-4 animate-pulse" />
            </div>
            <div className="px-4 py-2.5 bg-white border border-gray-200 rounded-2xl rounded-tl-sm shadow-sm min-h-[34px]">
              <AgentProgressInline />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {!wsConnected && messages.length > 0 && (
        <div className="px-4 py-1.5 bg-amber-50 border-t border-amber-200 text-[9px] text-amber-700 text-center">
          连接已断开，正在重连... (消息将通过备用通道发送)
        </div>
      )}

      <div className="p-4 border-t border-gray-100 bg-white relative z-20">
        <div className="max-w-3xl mx-auto flex gap-2.5 items-center bg-white border border-gray-200 p-1.5 rounded-full shadow-sm focus-within:border-blue-300 transition-all duration-200">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="与多 Agent 讨论..."
            rows={1}
            className="flex-1 bg-transparent px-4 py-1.5 resize-none outline-none text-gray-800 placeholder-gray-400 text-sm leading-relaxed max-h-[120px] overflow-y-auto"
          />
          {isLoading ? (
            <button
              onClick={() => {
                wsRef.current?.cancel()
                setLoading(false)
                setActiveAgent(null)
                clearStreamingContent()
              }}
              className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
              title="取消"
            >
              <Square className="w-3 h-3 fill-white" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-all disabled:opacity-30 active:scale-95 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-center mt-1.5">
          <span className="text-[9px] text-gray-300">Enter 发送 · Shift+Enter 换行</span>
        </div>
      </div>
    </div>
  )
}
