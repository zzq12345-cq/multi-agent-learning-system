/** 演示模式 — 预设场景快捷入口 */

import { useState } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { Zap, User, GraduationCap, Code } from 'lucide-react'

const DEMO_SCENARIOS = [
  {
    id: 'beginner',
    icon: User,
    label: '零基础学生',
    description: '完全没有编程经验，想学 Python',
    messages: [
      '你好，我是一个完全没有编程经验的大学生，想从零开始学 Python，请先评估一下我的水平',
    ],
    profile: { knowledge_level: 'beginner', learning_style: 'practical', goals: ['学习 Python 基础'] },
  },
  {
    id: 'intermediate',
    icon: Code,
    label: '有基础学生',
    description: '会基本语法，想学数据结构',
    messages: [
      '我已经学过 Python 基础语法，会写循环和函数，现在想系统学习数据结构与算法',
    ],
    profile: { knowledge_level: 'intermediate', learning_style: 'theoretical', goals: ['掌握数据结构'] },
  },
  {
    id: 'assessment',
    icon: GraduationCap,
    label: '测试评估流程',
    description: '触发完整的学→测→调闭环',
    messages: [
      '帮我规划 Python 学习路径',
    ],
    profile: { knowledge_level: 'beginner', learning_style: 'balanced', goals: ['Python 全栈'] },
  },
]

export default function DemoMode() {
  const {
    setProfile, clearMessages, setNodeStates, setLearningPath,
  } = useAppStore()

  const [visible] = useState(() => {
    return window.location.search.includes('demo=true') || localStorage.getItem('demo_mode') === 'true'
  })

  if (!visible) return null

  const handleScenario = (scenario: typeof DEMO_SCENARIOS[0]) => {
    // 重置状态
    clearMessages()
    setNodeStates([])
    setLearningPath(null)
    setProfile(scenario.profile)

    // 统一由 ChatPanel 的 graph-send-message 监听器入栈消息并发送，避免双写
    window.dispatchEvent(new CustomEvent('graph-send-message', { detail: { message: scenario.messages[0] } }))
  }

  return (
    <div className="p-3 border-b border-stone-200/50 bg-gradient-to-r from-amber-50/50 to-orange-50/50">
      <div className="flex items-center gap-1.5 mb-2">
        <Zap className="w-3 h-3 text-amber-500" />
        <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">演示模式</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {DEMO_SCENARIOS.map((s) => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              onClick={() => handleScenario(s)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg border border-amber-200/60 bg-surface hover:bg-amber-50 hover:border-amber-300 transition-all text-center active:scale-95"
            >
              <Icon className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[8px] font-medium text-stone-700">{s.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
