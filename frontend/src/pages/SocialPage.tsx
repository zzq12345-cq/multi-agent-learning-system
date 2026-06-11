import { useState } from 'react'
import Header from '../components/Header'
import ActivityFeed from '../components/ActivityFeed'
import Leaderboard from '../components/Leaderboard'
import BadgeWall from '../components/BadgeWall'
import { MessageCircle, Trophy, Award } from 'lucide-react'

export default function SocialPage() {
  const [tab, setTab] = useState<'feed' | 'leaderboard' | 'badges'>('feed')

  const tabs = [
    { id: 'feed' as const, label: '动态', icon: MessageCircle },
    { id: 'leaderboard' as const, label: '排行榜', icon: Trophy },
    { id: 'badges' as const, label: '我的徽章', icon: Award },
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 flex flex-col overflow-hidden max-w-3xl mx-auto w-full">
        {/* Tab 切换 */}
        <div className="flex border-b border-stone-200/50 bg-ivory/80 px-4">
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-medium transition-all border-b-2 ${
                  tab === t.id
                    ? 'text-stone-900 border-stone-900'
                    : 'text-stone-400 border-transparent hover:text-stone-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'feed' && <ActivityFeed />}
          {tab === 'leaderboard' && <Leaderboard />}
          {tab === 'badges' && <BadgeWall />}
        </div>
      </div>
    </div>
  )
}
