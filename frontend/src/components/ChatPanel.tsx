import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { sendMessage } from '../services/api'
import MessageBubble from './MessageBubble'
import type { ChatMessage } from '../types'
import { Send, Sparkles, Terminal, HelpCircle, Brain } from 'lucide-react'

export default function ChatPanel() {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const {
    messages, addMessage, sessionId,
    isLoading, setLoading, setActiveAgent, setAgentOutputs,
    setLearningPath, setProfile,
  } = useAppStore()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }
    addMessage(userMsg)
    setInput('')
    setLoading(true)
    setActiveAgent('coordinator')

    try {
      const res = await sendMessage(text, sessionId)

      if (res.agent_name) setActiveAgent(res.agent_name)
      if (res.agent_outputs) setAgentOutputs(res.agent_outputs)
      if (res.learning_path) setLearningPath(res.learning_path)
      if (res.user_profile) setProfile(res.user_profile)

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.reply,
        agentName: res.agent_name || undefined,
        timestamp: Date.now(),
      }
      addMessage(aiMsg)
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ 错误：${err instanceof Error ? err.message : '请求失败，请检查 API 配置'}`,
        timestamp: Date.now(),
      }
      addMessage(errorMsg)
    } finally {
      setLoading(false)
      setActiveAgent(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hints = [
    { text: '我想学 Python 基础', icon: Terminal },
    { text: '请对我进行编程能力评估', icon: Sparkles },
    { text: '帮我规划前端开发学习路径', icon: HelpCircle },
  ]

  return (
    <div className="h-full flex flex-col bg-[#fcfcfb] relative overflow-hidden">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-xl bg-white border border-zinc-200 text-zinc-900 flex items-center justify-center mb-5 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_8px_24px_-8px_rgba(0,0,0,0.04)]">
              <Brain className="w-5 h-5" />
            </div>
            
            <h3 className="text-xs font-bold text-zinc-900 mb-1.5">欢迎使用多智能体智学终端</h3>
            <p className="text-[10px] text-zinc-400 max-w-xs mb-8 leading-relaxed">
              这里是多智能体协同的大脑控制中心。输入你的学习目标，智能体们将立刻协作，为你配置定制化学习网络。
            </p>

            <div className="grid grid-cols-1 gap-2 w-full">
              {hints.map((hint) => {
                const Icon = hint.icon
                return (
                  <button
                    key={hint.text}
                    onClick={() => { setInput(hint.text); }}
                    className="flex items-center gap-3 px-3.5 py-2.5 bg-white border border-zinc-200/80 rounded-xl hover:bg-zinc-50 hover:border-zinc-300 text-[10px] text-zinc-600 hover:text-zinc-900 transition-all text-left shadow-[0_1px_2px_rgba(0,0,0,0.01)] active:scale-[0.99] font-medium"
                  >
                    <Icon className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{hint.text}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div className="flex gap-3.5 items-start">
            <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center text-zinc-400 flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-zinc-500 animate-pulse" />
            </div>
            <div className="px-4 py-2.5 bg-white border border-zinc-250/60 rounded-2xl rounded-tl-sm shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex items-center min-h-[34px]">
              <div className="flex gap-1.5 items-center">
                <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="p-4 border-t border-zinc-200/50 bg-[#fcfcfb] relative z-20">
        <div className="max-w-3xl mx-auto flex gap-2.5 items-center bg-white border border-zinc-200/80 p-1.5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01),0_8px_30px_-10px_rgba(0,0,0,0.02)] focus-within:border-zinc-400/80 transition-all duration-200">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="与多 Agent 讨论... (Enter 发送, Shift+Enter 换行)"
            rows={1}
            className="flex-1 bg-transparent px-3 py-1.5 resize-none outline-none text-zinc-800 placeholder-zinc-400 text-xs leading-relaxed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white flex items-center justify-center transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 active:scale-95 flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
