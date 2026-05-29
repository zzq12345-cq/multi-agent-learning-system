import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage } from '../types'
import { AGENTS } from '../types'
import { Cpu, Sparkles, Compass, Wand2, BookOpen, ShieldCheck, User } from 'lucide-react'

interface Props {
  message: ChatMessage
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  coordinator: Cpu,
  profiler: Sparkles,
  planner: Compass,
  generator: Wand2,
  tutor: BookOpen,
  assessor: ShieldCheck,
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'
  const agent = message.agentName ? AGENTS[message.agentName] : null
  const AgentIcon = agent ? ICON_MAP[message.agentName || ''] || Sparkles : null

  return (
    <div className={`flex gap-3 items-start ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* 头像 */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${
          isUser 
            ? 'bg-zinc-900 text-white shadow-sm' 
            : 'bg-white border border-zinc-200 text-zinc-500'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : AgentIcon ? (
          <AgentIcon className="w-4 h-4 text-zinc-600" />
        ) : (
          <Sparkles className="w-4 h-4 text-zinc-500" />
        )}
      </div>

      {/* 消息体 */}
      <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Agent 标签 */}
        {agent && !isUser && (
          <div className="mb-1 flex items-center gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold bg-zinc-50 border border-zinc-200 text-zinc-600 rounded">
              {agent.displayName}
            </span>
            <span className="text-[8px] text-zinc-400 font-mono">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* 内容 */}
        <div
          className={`px-3.5 py-2.5 rounded-xl leading-relaxed text-xs border ${
            isUser
              ? 'bg-zinc-100 border-zinc-200 text-zinc-900 rounded-tr-sm shadow-[0_1px_2px_rgba(0,0,0,0.01)]'
              : 'bg-white border-zinc-200/80 text-zinc-800 rounded-tl-sm shadow-[0_1px_3px_rgba(0,0,0,0.01)]'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className="markdown-content leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
