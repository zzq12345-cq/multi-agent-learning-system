import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/useAppStore'
import { Brain, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setUser } = useAppStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || (isLogin ? '用户名或密码错误' : '注册失败'))
      }

      const data = await res.json()
      setUser({ userId: data.user_id, username: data.username, token: data.token })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream to-ivory flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 bg-primary-500 rounded-full items-center justify-center shadow-sm mb-4">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-lg font-bold text-stone-900">智学多Agent系统</h1>
          <p className="text-xs text-stone-400 mt-1">个性化多智能体协同学习平台</p>
        </div>

        {/* Tab 切换 */}
        <div className="flex mb-6 bg-stone-100 rounded-lg p-0.5">
          <button
            onClick={() => { setIsLogin(true); setError('') }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-all ${
              isLogin ? 'bg-surface text-stone-900 shadow-sm' : 'text-stone-500'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            登录
          </button>
          <button
            onClick={() => { setIsLogin(false); setError('') }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-all ${
              !isLogin ? 'bg-surface text-stone-900 shadow-sm' : 'text-stone-500'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            注册
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-medium text-stone-500 uppercase tracking-wider mb-1.5">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入用户名"
              required
              minLength={2}
              className="w-full px-3.5 py-2.5 bg-surface border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 outline-none focus:border-stone-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-stone-500 uppercase tracking-wider mb-1.5">
              密码
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码"
                required
                minLength={4}
                className="w-full px-3.5 py-2.5 pr-10 bg-surface border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 outline-none focus:border-stone-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[10px] text-red-600">
              {error}
            </div>
          )}

          {/* 记住我 */}
          {isLogin && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-stone-300 accent-primary-500 focus:ring-primary-500"
              />
              <span className="text-[10px] text-stone-500">记住我</span>
            </label>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium rounded-xl transition-all disabled:opacity-50 active:scale-[0.98] shadow-[0_4px_12px_rgb(var(--p-500)/0.25)]"
          >
            {loading ? '处理中...' : isLogin ? '登录' : '注册'}
          </button>
        </form>

        {/* 底部提示 */}
        <p className="text-center text-[10px] text-stone-400 mt-6">
          {isLogin ? '没有账号？' : '已有账号？'}
          <button
            onClick={() => { setIsLogin(!isLogin); setError('') }}
            className="text-primary-600 font-medium ml-1 hover:underline"
          >
            {isLogin ? '立即注册' : '去登录'}
          </button>
        </p>
      </div>
    </div>
  )
}


