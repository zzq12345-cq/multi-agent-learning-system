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
    { icon: Cpu, name: '协调者', desc: '任务智能分发与调度' },
    { icon: Sparkles, name: '画像师', desc: '全方位评估学生知识水平' },
    { icon: Compass, name: '规划师', desc: '动态定制最优学习路径' },
    { icon: Wand2, name: '生成器', desc: '按需生成个性化学习资源' },
    { icon: BookOpen, name: '导师', desc: '交互式苏格拉底式答疑解惑' },
    { icon: ShieldCheck, name: '评估师', desc: '多维检验及巩固学习效果' },
  ]

  return (
    <div className="min-h-screen bg-grid-pattern relative flex flex-col justify-between">
      {/* Header */}
      <header className="px-8 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-zinc-900 rounded-lg shadow-sm">
            <Brain className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-zinc-900">
            智学多Agent系统
          </span>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-8 pt-16 pb-24 text-center relative z-10 flex-1 flex flex-col justify-center">
        <div className="mb-6 flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold bg-zinc-100 border border-zinc-200/60 text-zinc-600 rounded-full tracking-wide">
            <span className="w-1 h-1 rounded-full bg-zinc-800" />
            个性化多智能体自主协作网络
          </span>
        </div>

        <h2 className="text-4xl md:text-5xl font-extrabold text-zinc-900 mb-6 tracking-tight leading-[1.2] md:leading-[1.15]">
          基于大模型的个性化<br />
          <span className="text-zinc-800 font-bold bg-clip-text">
            多智能体协同学习系统
          </span>
        </h2>

        <p className="text-sm md:text-base text-zinc-500 mb-10 max-w-xl mx-auto font-normal leading-relaxed">
          6 位高度专业化的 AI 智能体深度协作，为你量身定制全链条学习路径。
          从学情评估到资源自动生成，从交互导师到动态成效检验，打造未来感的一体化学习闭环。
        </p>

        <div className="flex justify-center">
          <button
            onClick={handleStart}
            className="group px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-200 flex items-center gap-2 active:scale-95"
          >
            开启学习引擎
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Agent 展示 */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-3 gap-5 max-w-3xl mx-auto">
          {agentCards.map((agent) => {
            const IconComponent = agent.icon
            return (
              <div
                key={agent.name}
                className="group p-5 rounded-xl border border-zinc-200/50 bg-white hover:border-zinc-300 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_8px_30px_-10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.01),0_12px_40px_-12px_rgba(0,0,0,0.03)] text-left transition-all duration-250 hover:-translate-y-0.5"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-200/50 flex items-center justify-center mb-3 text-zinc-500 group-hover:text-zinc-800 transition-colors">
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="font-bold text-zinc-900 text-xs mb-1">{agent.name}</div>
                <div className="text-[10px] text-zinc-500 leading-normal font-normal">{agent.desc}</div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-[10px] text-zinc-400 relative z-10 border-t border-zinc-200/30 font-mono">
        © 2026 智学多智能体个性化学习平台. All rights reserved.
      </footer>
    </div>
  )
}
