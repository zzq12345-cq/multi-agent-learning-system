import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Trash2, Plus, Clock, Map, History } from 'lucide-react'
import Header from '../components/Header'
import { useAppStore } from '../stores/useAppStore'
import { listHistorySessions, getHistorySession, deleteSession } from '../services/api'
import type { ChatMessage, NodeState } from '../types'

interface SessionItem {
  session_id: string
  title: string
  message_count: number
  path_title: string
  updated_at: number
}

function formatTime(ts: number): string {
  const diff = Date.now() / 1000 - ts
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`
  return new Date(ts * 1000).toLocaleDateString('zh-CN')
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const { user, sessionId, setSessionId, setMessages, clearMessages, setLearningPath, setNodeStates, setMasteryData } = useAppStore()
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    listHistorySessions(user.userId)
      .then(setSessions)
      .finally(() => setLoading(false))
  }, [user])

  const handleContinue = async (id: string) => {
    setBusyId(id)
    try {
      const data = await getHistorySession(id)
      if (!data) return
      const msgs: ChatMessage[] = (data.messages || []).map(
        (m: { role: 'user' | 'assistant'; content: string; name?: string }, i: number) => ({
          id: `${id}-${i}`,
          role: m.role,
          content: m.content,
          agentName: m.name || undefined,
          timestamp: Date.now(),
        })
      )
      setSessionId(id)
      setMessages(msgs)
      setLearningPath(data.learning_path?.nodes?.length ? data.learning_path : null)
      const states: NodeState[] = Object.entries(data.node_states || {}).map(
        ([nodeId, st]) => {
          const s = st as { status?: string; score?: number }
          return { nodeId, status: (s.status || 'locked') as NodeState['status'], score: s.score }
        }
      )
      setNodeStates(states)
      setMasteryData(data.mastery_data || {})
      navigate('/learn')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除这条会话记录吗？删除后不可恢复。')) return
    const ok = await deleteSession(id)
    if (ok) setSessions((list) => list.filter((s) => s.session_id !== id))
  }

  const handleNewChat = () => {
    setSessionId(crypto.randomUUID())
    clearMessages()
    setLearningPath(null)
    setNodeStates([])
    navigate('/learn')
  }

  return (
    <div className="min-h-screen flex flex-col bg-ivory">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-stone-900 flex items-center gap-2">
              <History className="w-5 h-5 text-primary-500" />
              历史会话
            </h1>
            <p className="text-xs text-stone-400 mt-1">共 {sessions.length} 条记录，点击任意会话继续学习</p>
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium rounded-xl transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            新对话
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="paper-card rounded-2xl p-5 animate-pulse">
                <div className="h-3.5 bg-stone-100 rounded w-2/3 mb-3" />
                <div className="h-2.5 bg-stone-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="paper-card rounded-2xl py-16 text-center">
            <MessageSquare className="w-8 h-8 text-stone-300 mx-auto mb-3" />
            <p className="text-sm text-stone-500 mb-1">还没有历史会话</p>
            <p className="text-xs text-stone-400">开始一次对话后，记录会自动保存在这里</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div
                key={s.session_id}
                onClick={() => busyId !== s.session_id && handleContinue(s.session_id)}
                className={`paper-card rounded-2xl p-5 cursor-pointer group ${
                  s.session_id === sessionId ? 'border-primary-300' : ''
                } ${busyId === s.session_id ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-stone-800 truncate mb-1.5">
                      {s.title}
                      {s.session_id === sessionId && (
                        <span className="ml-2 text-[10px] font-medium text-primary-600 bg-primary-50 border border-primary-100 px-1.5 py-0.5 rounded-full">当前</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-stone-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(s.updated_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {s.message_count} 条消息
                      </span>
                      {s.path_title && (
                        <span className="flex items-center gap-1 truncate">
                          <Map className="w-3 h-3" />
                          {s.path_title}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(s.session_id) }}
                    className="p-1.5 rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    title="删除会话"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
