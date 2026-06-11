import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage } from '../types'
import { AGENTS } from '../types'
import { Cpu, Sparkles, Compass, Wand2, BookOpen, ShieldCheck, User } from 'lucide-react'
import QuizCard from './QuizCard'

interface QuizQuestion {
  id: string
  question: string
  options: string[]
}

function parseQuizFromContent(content: string): QuizQuestion[] | null {
  // 检测是否包含测试题格式
  if (!content.includes('学习检测') && !content.includes('第 1 题') && !content.includes('第1题')) return null

  const questions: QuizQuestion[] = []
  // 匹配 "第 N 题" 模式
  const qBlocks = content.split(/\*\*第\s*\d+\s*题\*\*/)

  for (let i = 1; i < qBlocks.length; i++) {
    const block = qBlocks[i]
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)

    // 第一行是题目（可能包含类型标注如 (选择)）
    let question = lines[0]?.replace(/^\(.*?\)\s*/, '') || ''

    // 找选项（A. B. C. D. 开头的行）
    const options = lines.filter(l => /^[A-D][.．、]/.test(l))

    if (question && options.length >= 2) {
      questions.push({
        id: `q${i}`,
        question,
        options,
      })
    }
  }

  return questions.length > 0 ? questions : null
}

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
    <div className={`flex gap-3 items-start ${isUser ? 'flex-row-reverse' : ''} animate-[fadeSlideUp_0.3s_ease-out]`}>
      {/* 头像 */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${
          isUser 
            ? 'bg-stone-900 text-white shadow-sm'
            : 'bg-surface border border-stone-200 text-stone-500'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : AgentIcon ? (
          <AgentIcon className="w-4 h-4 text-stone-600" />
        ) : (
          <Sparkles className="w-4 h-4 text-stone-500" />
        )}
      </div>

      {/* 消息体 */}
      <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Agent 标签 */}
        {agent && !isUser && (
          <div className="mb-1 flex items-center gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold bg-stone-50 border border-stone-200 text-stone-600 rounded">
              {agent.displayName}
            </span>
            <span className="text-[8px] text-stone-400 font-mono">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* 内容 */}
        <div
          className={`px-3.5 py-2.5 rounded-xl leading-relaxed text-xs border ${
            isUser
              ? 'bg-oat border-stone-200 text-stone-900 rounded-tr-sm shadow-[0_1px_2px_rgba(0,0,0,0.01)]'
              : 'bg-surface border-stone-200/80 text-stone-800 rounded-tl-sm shadow-[0_1px_3px_rgba(0,0,0,0.01)]'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (() => {
            const quiz = parseQuizFromContent(message.content)
            if (quiz) {
              return (
                <QuizCard
                  questions={quiz}
                  onSubmit={(answers) => {
                    const answerText = quiz.map((q, i) =>
                      `第${i + 1}题我选 ${answers[q.id] || '?'}`
                    ).join('，')
                    window.dispatchEvent(new CustomEvent('graph-send-message', { detail: { message: answerText } }))
                  }}
                />
              )
            }
            return (
              <div className="markdown-content leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
