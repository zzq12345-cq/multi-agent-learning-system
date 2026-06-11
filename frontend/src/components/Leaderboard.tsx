import { useState, useEffect } from 'react'
import { Trophy } from 'lucide-react'

interface LeaderboardEntry {
  user_id: string
  username: string
  score: number
  completed: number
  avg_mastery: number
}

const RANK_STYLES = [
  'bg-amber-50 border-amber-200 text-amber-700',
  'bg-stone-50 border-stone-200 text-stone-600',
  'bg-orange-50 border-orange-200 text-orange-600',
]

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/social/leaderboard')
      .then(res => res.json())
      .then(data => setEntries(data.leaderboard || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="p-8 text-center text-xs text-stone-400">加载中...</div>
  }

  if (!entries.length) {
    return (
      <div className="p-8 text-center">
        <Trophy className="w-8 h-8 text-stone-300 mx-auto mb-3" />
        <p className="text-xs text-stone-500">暂无排行数据</p>
        <p className="text-[10px] text-stone-400 mt-1">完成学习后即可上榜</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-2">
      {entries.map((entry, i) => (
        <div
          key={entry.user_id}
          className={`flex items-center gap-3 p-3 rounded-xl border ${
            i < 3 ? RANK_STYLES[i] : 'border-stone-200/60 bg-surface'
          }`}
        >
          {/* 排名 */}
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold ${
            i === 0 ? 'bg-amber-200 text-amber-800' :
            i === 1 ? 'bg-stone-200 text-stone-700' :
            i === 2 ? 'bg-orange-200 text-orange-700' :
            'bg-stone-100 text-stone-500'
          }`}>
            {i + 1}
          </div>

          {/* 用户信息 */}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-stone-900">{entry.username}</div>
            <div className="text-[9px] text-stone-400 mt-0.5">
              完成 {entry.completed} 节点 · 掌握度 {entry.avg_mastery}%
            </div>
          </div>

          {/* 分数 */}
          <div className="text-right">
            <div className="text-sm font-bold text-stone-900">{entry.score}</div>
            <div className="text-[8px] text-stone-400">综合分</div>
          </div>
        </div>
      ))}
    </div>
  )
}