import { useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../stores/useAppStore'
import { Brain, Home } from 'lucide-react'
import ThemeSwitcher from './ThemeSwitcher'

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAppStore()

  return (
    <header className="h-14 px-5 flex items-center justify-between border-b border-stone-200 bg-ivory relative z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          onDoubleClick={() => { localStorage.setItem('demo_mode', 'true'); window.location.reload() }}
          className="flex items-center gap-2 group text-left active:scale-95 transition-transform"
        >
          <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-stone-900">
            智学多Agent系统
          </span>
        </button>

        <nav className="flex items-center gap-2 ml-4">
          <button
            onClick={() => navigate('/learn')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all border ${
              location.pathname === '/learn'
                ? 'bg-primary-50 text-primary-600 border-primary-300'
                : 'text-stone-500 border-transparent hover:bg-stone-100'
            }`}
          >
            学习
          </button>
          <button
            onClick={() => navigate('/social')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all border ${
              location.pathname === '/social'
                ? 'bg-primary-50 text-primary-600 border-primary-300'
                : 'text-stone-500 border-transparent hover:bg-stone-100'
            }`}
          >
            社区
          </button>
          <button
            onClick={() => navigate('/history')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all border ${
              location.pathname === '/history'
                ? 'bg-primary-50 text-primary-600 border-primary-300'
                : 'text-stone-500 border-transparent hover:bg-stone-100'
            }`}
          >
            历史
          </button>
          <button
            onClick={() => navigate('/profile')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all border ${
              location.pathname === '/profile'
                ? 'bg-primary-50 text-primary-600 border-primary-300'
                : 'text-stone-500 border-transparent hover:bg-stone-100'
            }`}
          >
            我的
          </button>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <ThemeSwitcher />
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-600">{user.username}</span>
            <button
              onClick={() => { logout(); window.location.href = '/auth' }}
              className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
            >
              退出
            </button>
          </div>
        )}
        <button
          onClick={() => navigate('/')}
          className="w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center text-stone-400 hover:text-stone-800 hover:border-stone-300 transition-all active:scale-95"
          title="首页"
        >
          <Home className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
