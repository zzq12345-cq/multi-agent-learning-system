import { useState, useEffect } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { Heart, BookOpen, Award, Share2, Target, MessageCircle, Bot } from 'lucide-react'
import type { FeedActivity } from '../types'

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  node_completed: BookOpen,
  path_created: Target,
  assessment_passed: Award,
  badge_earned: Award,
  path_shared: Share2,
}

/** AI 学伴徽章：明确标注虚拟角色，与真实用户区分 */
function AiBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full bg-primary-100 border border-primary-200 text-primary-700 text-[9px] font-medium flex-shrink-0">
      <Bot className="w-2.5 h-2.5" />
      AI 学伴
    </span>
  )
}

const MINUTE = 60
const HOUR = 3600
const DAY = 86400

/** 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前 */
function formatRelative(ts: number): string {
  const diff = Math.max(0, Math.floor(Date.now() / 1000 - ts))
  if (diff < MINUTE) return '刚刚'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} 分钟前`
  if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时前`
  return `${Math.floor(diff / DAY)} 天前`
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<FeedActivity[]>([])
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
    return <div className="p-8 text-center text-xs text-stone-400">加载中...</div>
  }

  if (!activities.length) {
    return (
      <div className="p-8 text-center">
        <MessageCircle className="w-8 h-8 text-stone-300 mx-auto mb-3" />
        <p className="text-xs text-stone-500">暂无学习动态</p>
        <p className="text-[10px] text-stone-400 mt-1">完成一个知识点测试，你的学习动态会出现在这里</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      {activities.map((activity) => {
        const Icon = TYPE_ICONS[activity.type] || BookOpen
        const isLiked = user && activity.liked_by.includes(user.userId)
        const comments = activity.comments ?? []
        const timeStr = new Date(activity.timestamp * 1000).toLocaleString('zh-CN', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })

        return (
          <div key={activity.id} className="p-3.5 rounded-xl border border-stone-200/60 bg-surface">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200/60 flex items-center justify-center text-stone-500 flex-shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-stone-900">{activity.username}</span>
                  {activity.is_ai && <AiBadge />}
                  <span className="text-[9px] text-stone-400">{timeStr}</span>
                </div>
                <p className="text-[11px] text-stone-600 mt-0.5">{activity.content}</p>
                <button
                  onClick={() => !isLiked && handleLike(activity.id)}
                  className={`mt-2 flex items-center gap-1 text-[10px] transition-colors ${
                    isLiked ? 'text-rose-400' : 'text-stone-400 hover:text-rose-400'
                  }`}
                >
                  <Heart className={`w-3 h-3 ${isLiked ? 'fill-rose-400' : ''}`} />
                  {activity.likes > 0 && <span>{activity.likes}</span>}
                </button>

                {/* 评论区：无评论不渲染 */}
                {comments.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-stone-200/60 space-y-2">
                    {comments.map((c, ci) => (
                      <div key={ci} className="flex items-start gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                          c.is_ai ? 'bg-primary-100 text-primary-700' : 'bg-stone-100 text-stone-500'
                        }`}>
                          {c.author_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-stone-700">{c.author_name}</span>
                            {c.is_ai && <AiBadge />}
                            <span className="text-[9px] text-stone-400">{formatRelative(c.timestamp)}</span>
                          </div>
                          <p className="text-[10px] text-stone-600 mt-0.5 leading-relaxed break-words">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
