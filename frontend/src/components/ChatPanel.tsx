import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/useAppStore'
import AgentWebSocket from '../services/websocket'
import MessageBubble from './MessageBubble'
import ReviewReminder from './ReviewReminder'
import OnboardingGuide from './OnboardingGuide'
import Toast from './Toast'
import { AGENTS } from '../types'
import type { WSEvent } from '../types'
import { Send, Code, BarChart3, RefreshCw, Brain, Square, ChevronRight, ShieldCheck } from 'lucide-react'

// 出题互审系统卡片 — 评估师出题后由审查层审题，全程可视
function PeerReviewCard({ content }: { content: string }) {
  let data: { verdict: string; issues: string[]; round: number }
  try {
    data = JSON.parse(content)
  } catch {
    return null
  }
  const passed = data.verdict === 'pass'
  return (
    <div className="flex gap-3.5 items-start">
      <div className="w-8 h-8 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center text-primary-500 flex-shrink-0">
        <ShieldCheck className="w-4 h-4" />
      </div>
      <div className="max-w-[78%] px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-2xl rounded-tl-sm shadow-sm">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[10px] font-bold text-primary-600">质量互审 · 第 {data.round} 轮</span>
          {passed ? (
            <span className="px-1.5 py-0.5 rounded-full bg-primary-500 text-white text-[9px] font-bold">已通过同行评审 ✓</span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-bold">退回重出</span>
          )}
        </div>
        {(data.issues || []).length > 0 && (
          <ul className="space-y-0.5">
            {data.issues.map((issue, i) => (
              <li key={i} className="text-[10px] text-stone-600 flex items-start gap-1.5 leading-relaxed">
                <span className="text-primary-400 flex-shrink-0">•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        )}
        {passed && (data.issues || []).length === 0 && (
          <p className="text-[10px] text-stone-500 leading-relaxed">
            {data.round > 1
              ? '已按审查意见重新出题，直接放行。'
              : '审查层已核对题目答案、难度与表述，未发现问题。'}
          </p>
        )}
      </div>
    </div>
  )
}

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
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary-500" />
        </span>
        <span className="text-[10px] text-stone-600 font-medium">
          {agentName && <span className="text-stone-900">{agentName}</span>}
          {agentName && ' · '}
          {currentAction}
        </span>
      </div>
      {latestReasoning && (
        <div className="text-[9px] text-stone-400 pl-3.5 italic">
          {latestReasoning}
        </div>
      )}
      {agentTraces.length > 1 && (
        <div className="flex items-center gap-1 text-[8px] text-stone-400 font-mono pl-3.5">
          {agentTraces
            .filter(t => t.action === 'start')
            .slice(-4)
            .map((t, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span>&rarr;</span>}
                <span className={t.agent === activeAgent ? 'text-primary-600' : ''}>{AGENTS[t.agent]?.displayName || t.agent}</span>
              </span>
            ))}
        </div>
      )}
    </div>
  )
}

export default function ChatPanel() {
  const [input, setInput] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [demoPlaying, setDemoPlaying] = useState(false)
  // ref 镜像：供 deps=[] 的 graph-send-message 监听器读取实时回放状态
  const demoPlayingRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
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

  // 断点续学：页面加载时恢复上次会话状态
  const resumedRef = useRef(false)
  useEffect(() => {
    if (resumedRef.current) return
    resumedRef.current = true
    const store = useAppStore.getState()
    // 只有当前没有消息时才尝试恢复（避免覆盖已在进行中的会话）
    if (store.messages.length > 0) return
    import('../services/api').then(({ getHistorySession }) => {
      getHistorySession(sessionId).then((data) => {
        if (!data || !data.exists) return
        const msgs = (data.messages || []).map((m: any) => ({
          id: crypto.randomUUID(),
          role: m.role as 'user' | 'assistant',
          content: m.content,
          agentName: m.name || undefined,
          timestamp: Date.now(),
        }))
        if (msgs.length > 0) store.setMessages(msgs)
        if (data.learning_path?.title) store.setLearningPath(data.learning_path)
        if (data.node_states && Object.keys(data.node_states).length > 0) {
          const states = Object.entries(data.node_states).map(([nodeId, s]: [string, any]) => ({
            nodeId,
            status: s.status,
            score: s.score ?? undefined,
          }))
          store.setNodeStates(states)
        }
        if (data.mastery_data && Object.keys(data.mastery_data).length > 0) {
          store.setMasteryData(data.mastery_data)
        }
      }).catch(() => {})
    })
  }, [sessionId])

  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 120) + 'px'
    }
  }, [input])

  // 自动滚动：直接设置容器 scrollTop（流式期间瞬时滚动，避免 smooth
  // 动画被高频 token 反复打断造成页面上下弹跳）；用户向上翻看（距底
  // 部超过阈值）时不抢滚动条
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceToBottom < 120) {
      el.scrollTop = el.scrollHeight
    }
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
        const store = useAppStore.getState()
        // 演示回放期间拦截真实发送（如回放出的 QuizCard 被点击提交），仅本地记录
        if (demoPlayingRef.current) {
          store.addMessage({
            id: crypto.randomUUID(),
            role: 'user',
            content: detail.message,
            timestamp: Date.now(),
          })
          setToast('演示回放中，作答仅本地记录')
          return
        }
        // WS 未连接时明确提示并复位 loading，避免消息静默丢失、加载动画卡死
        if (!wsRef.current?.connected) {
          store.setLoading(false)
          setToast('连接已断开，消息未发送，请稍后重试')
          return
        }
        // 将答案作为用户消息添加到聊天记录
        store.addMessage({
          id: crypto.randomUUID(),
          role: 'user',
          content: detail.message,
          timestamp: Date.now(),
        })
        store.setLoading(true)
        store.clearTraces()
        store.clearStreamingContent()

        wsRef.current.send(detail.message)
      }
    }
    window.addEventListener('graph-send-message', handler)
    return () => window.removeEventListener('graph-send-message', handler)
  }, [])

  // WebSocket 断开时复位加载状态，避免流式回复中途断线导致 isLoading 卡死
  // （演示回放期间事件不走 WS，断线不应中断回放）
  useEffect(() => {
    if (!wsConnected && !demoPlaying && useAppStore.getState().isLoading) {
      setLoading(false)
      setActiveAgent(null)
      clearStreamingContent()
      setToast('连接中断，本次回复未完成')
    }
  }, [wsConnected, demoPlaying])

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

      case 'review_verdict':
        // 出题互审：插入「质量互审」系统卡片，并在协作图上打审查标记
        store.addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: JSON.stringify({
            verdict: event.verdict || 'pass',
            issues: event.issues || [],
            round: event.round || 1,
          }),
          agentName: 'peer_review',
          timestamp: event.timestamp || Date.now(),
        })
        store.addTrace({
          agent: 'assessor',
          action: 'review',
          timestamp: event.timestamp || Date.now(),
          detail: event.verdict || 'pass',
        })
        break

      case 'system_notice':
        store.addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: event.content || '',
          agentName: 'system',
          timestamp: Date.now(),
        })
        break

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

  // 演示模式：剧本事件经 demo-ws-event 喂入，复用 handleWSEvent 管线；
  // demo-playback 标记回放状态，用于显示徽标并抑制断线提示
  useEffect(() => {
    const onDemoEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as WSEvent | undefined
      if (detail?.type) handleWSEvent(detail)
    }
    const onDemoPlayback = (e: Event) => {
      const playing = Boolean((e as CustomEvent).detail?.playing)
      demoPlayingRef.current = playing
      setDemoPlaying(playing)
    }
    window.addEventListener('demo-ws-event', onDemoEvent)
    window.addEventListener('demo-playback', onDemoPlayback)
    return () => {
      window.removeEventListener('demo-ws-event', onDemoEvent)
      window.removeEventListener('demo-playback', onDemoPlayback)
    }
  }, [handleWSEvent])

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
    <div className="h-full flex flex-col bg-ivory relative overflow-hidden">
      {/* 演示回放徽标 */}
      {demoPlaying && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[9px] font-bold shadow-md pointer-events-none">
          <span className="flex h-1.5 w-1.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
          </span>
          演示回放中
        </div>
      )}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-5 space-y-5">
        <ReviewReminder />
        {messages.length === 0 && <OnboardingGuide />}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-primary-500 text-white flex items-center justify-center mb-5">
              <Brain className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-2">欢迎使用多智能体智学终端</h3>
            <p className="text-sm text-stone-500 max-w-xs mb-8 leading-relaxed">
              输入你的学习目标，智能体们将协作为你定制学习方案。
            </p>
            <div className="grid grid-cols-1 gap-3 w-full">
              {hints.map((hint) => {
                const Icon = hint.icon
                return (
                  <button
                    key={hint.text}
                    onClick={() => setInput(hint.text)}
                    className="flex items-center gap-3 px-4 py-3 bg-surface border border-stone-200 rounded-xl hover:bg-stone-50 hover:border-stone-300 text-sm text-stone-700 hover:text-stone-900 transition-all text-left active:scale-[0.99]"
                  >
                    <Icon className="w-4 h-4 text-primary-500 flex-shrink-0" />
                    <span className="flex-1">{hint.text}</span>
                    <ChevronRight className="w-4 h-4 text-stone-300 flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          msg.agentName === 'peer_review'
            ? <PeerReviewCard key={msg.id} content={msg.content} />
            : <MessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && streamingContent && (
          <MessageBubble
            message={{ id: 'streaming', role: 'assistant', content: streamingContent, timestamp: Date.now() }}
          />
        )}

        {isLoading && !streamingContent && (
          <div className="flex gap-3.5 items-start">
            <div className="w-8 h-8 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center text-primary-500 flex-shrink-0">
              <Brain className="w-4 h-4 animate-pulse" />
            </div>
            <div className="px-4 py-2.5 bg-surface border border-stone-200 rounded-2xl rounded-tl-sm shadow-sm min-h-[34px]">
              <AgentProgressInline />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {!wsConnected && !demoPlaying && messages.length > 0 && (
        <div className="px-4 py-1.5 bg-amber-50 border-t border-amber-200 text-[9px] text-amber-700 text-center">
          连接已断开，正在尝试重连…
        </div>
      )}

      <div className="p-4 border-t border-stone-100 bg-ivory relative z-20">
        <div className="max-w-3xl mx-auto flex gap-2.5 items-center bg-surface border border-stone-200 p-1.5 rounded-full shadow-sm focus-within:border-primary-300 transition-all duration-200">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="与多 Agent 讨论..."
            rows={1}
            className="flex-1 bg-transparent px-4 py-1.5 resize-none outline-none text-stone-800 placeholder-stone-400 text-sm leading-relaxed max-h-[120px] overflow-y-auto"
          />
          {isLoading ? (
            <button
              onClick={() => {
                // 回放期间停止按钮联动停止演示回放
                if (demoPlaying) {
                  window.dispatchEvent(new Event('demo-stop'))
                  return
                }
                wsRef.current?.cancel()
                setLoading(false)
                setActiveAgent(null)
                clearStreamingContent()
              }}
              className="w-8 h-8 rounded-xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
              title="取消"
            >
              <Square className="w-3 h-3 fill-white" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-8 h-8 rounded-xl bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center transition-all disabled:opacity-30 active:scale-95 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-center mt-1.5">
          <span className="text-[9px] text-stone-300">Enter 发送 · Shift+Enter 换行</span>
        </div>
      </div>

      {toast && <Toast message={toast} type="error" onClose={() => setToast(null)} />}
    </div>
  )
}
