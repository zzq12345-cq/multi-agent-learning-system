/** 引导式首次体验 */

import { useState, useEffect } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { Sparkles, ArrowRight, X } from 'lucide-react'

const STEPS = [
  { title: '选择学科', desc: '在右侧面板选择你想学习的学科，或直接在对话中说出来' },
  { title: '建立画像', desc: '系统会通过对话了解你的水平和学习风格' },
  { title: '生成路径', desc: 'AI 规划师为你定制个性化学习路径' },
  { title: '开始学习', desc: '点击知识图谱节点或在对话中提问，开始学习之旅' },
]

export default function OnboardingGuide() {
  const [visible, setVisible] = useState(false)
  const { messages } = useAppStore()

  useEffect(() => {
    // 只在首次（无消息历史且未关闭过）时显示
    const dismissed = localStorage.getItem('onboarding_dismissed')
    if (!dismissed && messages.length === 0) {
      setVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    setVisible(false)
    localStorage.setItem('onboarding_dismissed', 'true')
  }

  if (!visible) return null

  return (
    <div className="mx-4 mb-4 p-4 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 animate-[fadeSlideUp_0.3s_ease-out]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-xs font-bold text-blue-800">快速开始</span>
        </div>
        <button onClick={handleDismiss} className="text-blue-400 hover:text-blue-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/60">
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <div>
              <div className="text-[10px] font-bold text-gray-800">{step.title}</div>
              <div className="text-[9px] text-gray-500 leading-relaxed">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleDismiss}
        className="mt-3 w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-medium rounded-lg transition-all flex items-center justify-center gap-1"
      >
        我知道了，开始学习
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}
