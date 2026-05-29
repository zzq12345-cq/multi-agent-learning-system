import { useNavigate } from 'react-router-dom'
import {
  Brain,
  ArrowRight,
  Cpu,
  Sparkles,
  Compass,
  Wand2,
  BookOpen,
  ShieldCheck
} from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()

  const handleStart = () => {
    navigate('/learn')
  }

  const agentCards = [
    { icon: Cpu, name: '协调者', desc: '统筹全局，分配任务，协同各智能体工作。', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { icon: Sparkles, name: '画像师', desc: '分析学习者特征，构建精准学习画像。', color: 'bg-purple-50 text-purple-600 border-purple-100' },
    { icon: Compass, name: '规划师', desc: '制定学习计划，规划最佳学习路径。', color: 'bg-green-50 text-green-600 border-green-100' },
    { icon: Wand2, name: '生成器', desc: '生成学习内容与练习，提供个性化资源。', color: 'bg-amber-50 text-amber-600 border-amber-100' },
    { icon: BookOpen, name: '导师', desc: '答疑解惑，提供指导与建议。', color: 'bg-rose-50 text-rose-600 border-rose-100' },
    { icon: ShieldCheck, name: '评估师', desc: '评估学习效果，提供反馈与改进建议。', color: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/30 to-white relative flex flex-col justify-between">
      {/* Header */}
      <header className="px-8 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-gray-900">
            智学多Agent系统
          </span>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-8 pt-12 pb-20 text-center relative z-10 flex-1 flex flex-col justify-center">
        <div className="mb-6 flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-medium bg-blue-50 border border-blue-100 text-blue-600 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            个性化多智能体自主协作网络
          </span>
        </div>

        <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight leading-[1.2] md:leading-[1.15]">
          基于大模型的个性化<br />
          <span className="text-blue-600">
            多智能体协同学习系统
          </span>
        </h2>

        <p className="text-sm md:text-base text-gray-500 mb-10 max-w-xl mx-auto font-normal leading-relaxed">
          6 位高度专业化的 AI 智能体深度协作，为你量身定制全链条学习路径。
          从学情评估到资源自动生成，从交互导师到动态成效检验，打造一体化学习闭环。
        </p>

        <div className="flex justify-center">
          <button
            onClick={handleStart}
            className="group px-7 py-3.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-full shadow-[0_4px_14px_rgba(59,130,246,0.3)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.4)] transition-all duration-200 flex items-center gap-2 active:scale-95"
          >
            开启学习引擎
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Agent 展示 */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {agentCards.map((agent) => {
            const IconComponent = agent.icon
            return (
              <div
                key={agent.name}
                className="group p-5 rounded-2xl border border-gray-100 bg-white hover:border-blue-200 shadow-sm hover:shadow-md text-left transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${agent.color}`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="font-bold text-gray-900 text-sm mb-1">{agent.name}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{agent.desc}</div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-gray-400 relative z-10 border-t border-gray-100">
        © 2026 智学多智能体个性化学习平台. All rights reserved.
      </footer>
    </div>
  )
}
