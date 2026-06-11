import { useState, useEffect } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { Award } from 'lucide-react'

interface Badge {
  id: string
  name: string
  icon: string
  description: string
  earned: boolean
}

export default function BadgeWall() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const user = useAppStore((s) => s.user)

  useEffect(() => {
    if (!user) return
    fetch(`/api/social/badges/${user.userId}`)
      .then(res => res.json())
      .then(data => setBadges(data.badges || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  if (loading) {
    return <div className="p-8 text-center text-xs text-stone-400">加载中...</div>
  }

  const earned = badges.filter(b => b.earned)
  const locked = badges.filter(b => !b.earned)

  return (
    <div className="p-4">
      {/* 已获得 */}
      {earned.length > 0 && (
        <div className="mb-6">
          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-3">
            已获得 ({earned.length})
          </div>
          <div className="grid grid-cols-3 gap-3">
            {earned.map(badge => (
              <div key={badge.id} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-primary-200 bg-primary-50/50">
                <span className="text-2xl">{badge.icon}</span>
                <span className="text-[10px] font-bold text-primary-700">{badge.name}</span>
                <span className="text-[8px] text-primary-500 text-center">{badge.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 未解锁 */}
      {locked.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-3">
            未解锁 ({locked.length})
          </div>
          <div className="grid grid-cols-3 gap-3">
            {locked.map(badge => (
              <div key={badge.id} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-stone-200 bg-stone-50/50 opacity-60">
                <span className="text-2xl grayscale">{badge.icon}</span>
                <span className="text-[10px] font-medium text-stone-500">{badge.name}</span>
                <span className="text-[8px] text-stone-400 text-center">{badge.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {!badges.length && (
        <div className="text-center py-8">
          <Award className="w-8 h-8 text-stone-300 mx-auto mb-3" />
          <p className="text-xs text-stone-500">开始学习解锁徽章</p>
        </div>
      )}
    </div>
  )
}