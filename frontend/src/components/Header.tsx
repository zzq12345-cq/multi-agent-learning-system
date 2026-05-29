import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/useAppStore'
import { Brain, Home, Settings } from 'lucide-react'
import { AGENTS } from '../types'

export default function Header() {
  const navigate = useNavigate()
  const { setShowSettings, activeAgent, user, logout } = useAppStore()

  // 获取当前活跃 Agent 的信息
  const activeAgentInfo = activeAgent ? AGENTS[activeAgent] : null

  return (
    <header className="h-14 px-5 flex items-center justify-between border-b border-zinc-200/60 bg-white/80 backdrop-blur-md relative z-30 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 group text-left active:scale-95 transition-transform"
        >
          <div className="p-1.5 bg-zinc-900 rounded-lg">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-zinc-900">
            智学多Agent系统
          </span>
        </button>
        
        {activeAgentInfo && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-bold bg-emerald-50 border border-emerald-200/50 text-emerald-800 rounded-full">
            <span className="w-1 h-1 rounded-full bg-emerald-600 animate-pulse" />
            <span>
              {activeAgentInfo.displayName} 运行中
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {user && (
          <div className="flex items-center gap-2 mr-2">
            <span className="text-[10px] text-zinc-500">{user.username}</span>
            <button
              onClick={() => { logout(); window.location.href = '/auth' }}
              className="text-[10px] text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              退出
            </button>
          </div>
        )}
        <button
          onClick={() => navigate('/')}
          className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-all active:scale-95"
          title="首页"
        >
          <Home className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-all active:scale-95"
          title="系统配置"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
