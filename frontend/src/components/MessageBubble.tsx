import { useEffect, useRef, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import mermaid from 'mermaid'
import type { ChatMessage } from '../types'
import { AGENTS } from '../types'
import { Cpu, Sparkles, Compass, Wand2, BookOpen, ShieldCheck, User } from 'lucide-react'
import QuizCard from './QuizCard'

// 初始化 mermaid（中性主题，四套主题下可读；抑制错误 DOM 输出）
mermaid.initialize({ startOnLoad: false, theme: 'neutral', suppressErrorRendering: true })

interface QuizQuestion {
  id: string
  question: string
  options: string[]
}

/** 根据 Agent 类型和内容生成快捷回复建议 */
function getSuggestedReplies(agentName: string | undefined, content: string): string[] {
  if (!agentName) return []

  switch (agentName) {
    case 'planner':
      if (content.includes('路径已生成') || content.includes('学习节点')) {
        return ['开始学习', '调整路径', '测试一下']
      }
      if (content.includes('自适应调整')) {
        return ['开始补强', '跳过补强', '查看进度']
      }
      return []

    case 'generator':
      return ['继续下一个知识点', '测试一下', '再详细讲讲']

    case 'tutor':
      return ['我理解了，继续', '还是不太懂', '举个例子']

    case 'assessor':
      if (content.includes('评估结果')) {
        return ['继续学习', '复习薄弱点', '再测一次']
      }
      return []

    case 'profiler':
      if (content.includes('画像') || content.includes('评估完成')) {
        return ['开始规划学习路径', '我想学 Python', '我想学前端']
      }
      return []

    case 'coordinator':
      return []

    default:
      return []
  }
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
  isLast?: boolean
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  coordinator: Cpu,
  profiler: Sparkles,
  planner: Compass,
  generator: Wand2,
  tutor: BookOpen,
  assessor: ShieldCheck,
}

export default function MessageBubble({ message, isLast }: Props) {
  const isUser = message.role === 'user'
  const agent = message.agentName ? AGENTS[message.agentName] : null
  const AgentIcon = agent ? ICON_MAP[message.agentName || ''] || Sparkles : null
  const mermaidRef = useRef<HTMLDivElement>(null)

  // 快捷回复按钮（仅最后一条 AI 消息显示）
  const suggestions = useMemo(() => {
    if (isUser || !isLast) return []
    return getSuggestedReplies(message.agentName, message.content)
  }, [isUser, isLast, message.agentName, message.content])

  const handleSuggestionClick = (text: string) => {
    window.dispatchEvent(new CustomEvent('graph-send-message', { detail: { message: text } }))
  }

  useEffect(() => {
    if (!isUser && mermaidRef.current) {
      const codes = mermaidRef.current.querySelectorAll('code.language-mermaid')
      codes.forEach(async (code, i) => {
        const parent = code.parentElement
        if (!parent || parent.querySelector('.mermaid-diagram')) return
        const raw = code.textContent || ''
        if (!raw.trim()) return
        try {
          const id = `mermaid-${message.timestamp}-${i}-${Math.random().toString(36).slice(2, 6)}`
          const { svg } = await mermaid.render(id, raw)
          const container = document.createElement('div')
          container.className = 'mermaid-diagram my-3'
          container.innerHTML = svg
          parent.replaceChild(container, code)
        } catch (e) {
          // suppressErrorRendering 已阻止 mermaid 插入错误节点
          // 仅清理可能残留的临时渲染容器（id 以 "d" 前缀 + 我们的 id 命名）
          console.warn('Mermaid 渲染失败:', e)
          const tempId = `dmermaid-${message.timestamp}-${i}`
          document.getElementById(tempId)?.remove()
        }
      })
    }
  }, [message.content, isUser, message.timestamp])

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
      <div className={`flex flex-col ${isUser ? 'items-end max-w-[80%]' : 'items-start w-[80%]'}`}>
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
          className={`px-3.5 py-2.5 rounded-xl leading-relaxed text-xs border w-full overflow-hidden ${
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
              <div ref={mermaidRef} className="markdown-content leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            )
          })()}
        </div>

        {/* 快捷回复按钮 */}
        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestions.map((text) => (
              <button
                key={text}
                onClick={() => handleSuggestionClick(text)}
                className="px-2.5 py-1 text-[10px] font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-full hover:bg-primary-100 hover:border-primary-300 transition-colors"
              >
                {text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
