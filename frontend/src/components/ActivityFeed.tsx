import { useState, useEffect } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { Heart, BookOpen, Award, Share2, Target, MessageCircle } from 'lucide-react'

interface Activity {
  id: string
  user_id: string
  username: string
  type: string
  content: string
  metadata: Record<string, unknown>
  likes: number
  liked_by: string[]
  timestamp: number
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  node_completed: BookOpen,
  path_created: Target,
  assessment_passed: Award,
  badge_earned: Award,
  path_shared: Share2,
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const user = useAppStore((s) => s.user)

  useEffect(() => {
    fetch('/api/social/feed?limit=20')
      .then(res => res.json())
      .then(data => setActivities(data.activities || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleLike = async (activityId: string) => {
    if (!user) return
    const token = localStorage.getItem('auth_token') || ''
    const res = await fetch(`/api/social/like/${activityId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })
    if (res.ok) {
      setActivities(prev => prev.map(a =>
        a.id === activityId
          ? { ...a, likes: a.likes + 1, liked_by: [...a.liked_by, user.userId] }
          : a
      ))
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-zinc-400">加载中...</div>
  }

  if (!activities.length) {
    return (
      <div className="p-8 text-center">
        <MessageCircle className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
        <p className="text-xs text-zinc-500">暂无学习动态</p>
        <p className="text-[10px] text-zinc-400 mt-1">开始学习后，你的进度会出现在这里</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      {activities.map((activity) => {
        const Icon = TYPE_ICONS[activity.type] || BookOpen
        const isLiked = user && activity.liked_by.includes(user.userId)
        const timeStr = new Date(activity.timestamp * 1000).toLocaleString('zh-CN', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })

        return (
          <div key={activity.id} className="p-3.5 rounded-xl border border-zinc-200/60 bg-white">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200/60 flex items-center justify-center text-zinc-500 flex-shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-zinc-900">{activity.username}</span>
                  <span className="text-[9px] text-zinc-400">{timeStr}</span>
                </div>
                <p className="text-[11px] text-zinc-600 mt-0.5">{activity.content}</p>
                <button
                  onClick={() => !isLiked && handleLike(activity.id)}
                  className={`mt-2 flex items-center gap-1 text-[10px] transition-colors ${
                    isLiked ? 'text-red-400' : 'text-zinc-400 hover:text-red-400'
                  }`}
                >
                  <Heart className={`w-3 h-3 ${isLiked ? 'fill-red-400' : ''}`} />
                  {activity.likes > 0 && <span>{activity.likes}</span>}
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
