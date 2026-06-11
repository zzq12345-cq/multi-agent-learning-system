import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../stores/useAppStore'
import Header from '../components/Header'
import { Camera, Award, BarChart3, Key, LogOut, Trash2 } from 'lucide-react'

export default function ProfilePage() {
  const { user, logout, nodeStates, learningPath, masteryData } = useAppStore()

  const completedNodes = nodeStates.filter(n => n.status === 'completed').length
  const totalSubjects = learningPath ? 1 : 0
  const avgMastery = (() => {
    const values = Object.values(masteryData).map(d => d.mastery).filter(m => m > 0)
    return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0
  })()
  const [profile, setProfile] = useState<{
    user_id: string
    username: string
    avatar: string
    created_at: string
  } | null>(null)
  const [badges, setBadges] = useState<
    { id: string; name: string; icon: string; earned: boolean }[]
  >([])
  const [showChangePwd, setShowChangePwd] = useState(false)
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const token = localStorage.getItem('auth_token') || ''

  useEffect(() => {
    fetch('/api/auth/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setProfile)
      .catch(() => {})

    if (user) {
      fetch(`/api/social/badges/${user.userId}`)
        .then((r) => r.json())
        .then((d) => setBadges(d.badges || []))
        .catch(() => {})
    }
  }, [user, token])

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/auth/avatar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    if (res.ok) {
      const data = await res.json()
      setProfile((p) => (p ? { ...p, avatar: data.avatar } : p))
      setMessage('头像更新成功')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleChangePwd = async () => {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        old_password: oldPwd,
        new_password: newPwd,
      }),
    })
    if (res.ok) {
      setMessage('密码修改成功')
      setShowChangePwd(false)
      setOldPwd('')
      setNewPwd('')
    } else {
      const err = await res.json().catch(() => ({}))
      setMessage(err.detail || '修改失败')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const handleClearData = () => {
    if (confirm('确定清除所有学习记录？此操作不可恢复。')) {
      useAppStore.getState().clearMessages()
      useAppStore.getState().setLearningPath(null)
      useAppStore.getState().setNodeStates([])
      useAppStore.getState().setMasteryData({})
      setMessage('学习记录已清除')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleLogout = () => {
    logout()
    window.location.href = '/auth'
  }

  const earnedBadges = badges.filter((b) => b.earned)

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 overflow-y-auto bg-ivory">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* 基本信息 */}
          <div className="bg-surface rounded-2xl border border-stone-100 p-6 mb-4 shadow-sm">
            <div className="flex items-center gap-5">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full bg-primary-100 border-2 border-primary-200 flex items-center justify-center overflow-hidden">
                  {profile?.avatar ? (
                    <img
                      src={profile.avatar}
                      alt="头像"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-primary-500">
                      {user?.username?.[0]?.toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center text-white shadow-md hover:bg-primary-600 transition-colors"
                  aria-label="上传头像"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">
                  {user?.username}
                </h2>
                <p className="text-xs text-stone-400 mt-1">
                  注册时间：
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('zh-CN')
                    : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* 学习统计 */}
          <div className="bg-surface rounded-2xl border border-stone-100 p-6 mb-4 shadow-sm">
            <h3 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary-500" />
              学习统计
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatItem label="完成节点" value={String(completedNodes)} />
              <StatItem label="学习学科" value={String(totalSubjects)} />
              <StatItem label="平均掌握度" value={avgMastery > 0 ? `${avgMastery}%` : '0%'} />
              <StatItem label="学习时长" value="—" />
            </div>
          </div>
          {/* 我的徽章 */}
          <div className="bg-surface rounded-2xl border border-stone-100 p-6 mb-4 shadow-sm">
            <h3 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-primary-500" />
              我的徽章 ({earnedBadges.length})
            </h3>
            {earnedBadges.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {earnedBadges.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-2 px-3 py-2 bg-primary-50 border border-primary-100 rounded-xl"
                  >
                    <span className="text-lg">{b.icon}</span>
                    <span className="text-xs font-medium text-primary-700">
                      {b.name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400">
                暂无徽章，开始学习解锁成就
              </p>
            )}
          </div>

          {/* 账号设置 */}
          <div className="bg-surface rounded-2xl border border-stone-100 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
              <Key className="w-4 h-4 text-primary-500" />
              账号设置
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowChangePwd(!showChangePwd)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-stone-100 hover:bg-stone-50 transition-colors"
              >
                <span className="text-xs text-stone-700 font-medium">
                  修改密码
                </span>
                <Key className="w-3.5 h-3.5 text-stone-400" />
              </button>
              {showChangePwd && (
                <div className="px-4 py-3 bg-cream rounded-xl space-y-2">
                  <input
                    type="password"
                    placeholder="原密码"
                    value={oldPwd}
                    onChange={(e) => setOldPwd(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs outline-none focus:border-primary-400"
                  />
                  <input
                    type="password"
                    placeholder="新密码（至少 4 位）"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs outline-none focus:border-primary-400"
                  />
                  <button
                    onClick={handleChangePwd}
                    disabled={!oldPwd || newPwd.length < 4}
                    className="px-4 py-2 bg-primary-500 text-white text-xs rounded-lg disabled:opacity-50"
                  >
                    确认修改
                  </button>
                </div>
              )}

              <button
                onClick={handleClearData}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-stone-100 hover:bg-red-50 transition-colors"
              >
                <span className="text-xs text-stone-700 font-medium">
                  清除学习记录
                </span>
                <Trash2 className="w-3.5 h-3.5 text-stone-400" />
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-red-100 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <span className="text-xs text-red-600 font-medium">
                  退出登录
                </span>
                <LogOut className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          </div>

          {/* 消息提示 */}
          {message && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-stone-900 text-white text-xs rounded-full shadow-lg">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-3 bg-cream rounded-xl">
      <div className="text-lg font-bold text-stone-900">{value}</div>
      <div className="text-[10px] text-stone-400 mt-0.5">{label}</div>
    </div>
  )
}
