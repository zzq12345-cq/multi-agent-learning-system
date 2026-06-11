import { useState } from 'react'
import Header from '../components/Header'
import ActivityFeed from '../components/ActivityFeed'
import Leaderboard from '../components/Leaderboard'
import BadgeWall from '../components/BadgeWall'
import { MessageCircle, Trophy, Award, Bot } from 'lucide-react'

// 4 位 AI 学伴人设（与后端 id 前缀 ai- 对应），仅作介绍展示
const AI_COMPANIONS = [
  { id: 'ai-xiaozhu', name: '小竹', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  { id: 'ai-ayuan', name: '阿源', color: 'bg-sky-500/15 text-sky-600 border-sky-500/30' },
  { id: 'ai-nova', name: 'Nova', color: 'bg-violet-500/15 text-violet-600 border-violet-500/30' },
  { id: 'ai-susu', name: '苏苏', color: 'bg-rose-500/15 text-rose-600 border-rose-500/30' },
]

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
        {/* AI 学伴介绍条：明确标注为产品特性，互动由系统实时生成 */}
        <div className="mx-4 mt-3 mb-1 px-3.5 py-2.5 rounded-2xl paper-card flex items-center gap-3">
          <div className="flex -space-x-1.5 flex-shrink-0">
            {AI_COMPANIONS.map((c) => (
              <div
                key={c.id}
                title={c.name}
                className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold ring-2 ring-surface ${c.color}`}
              >
                {c.name.charAt(0)}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-stone-500 leading-relaxed min-w-0">
            <span className="inline-flex items-center gap-1 font-bold text-stone-700 mr-1">
              <Bot className="w-3 h-3 text-primary-600" />
              AI 学伴
            </span>
            小竹、阿源、Nova、苏苏 4 位 AI 学伴与你同行学习，它们的进度和互动由系统实时生成
          </p>
        </div>

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
