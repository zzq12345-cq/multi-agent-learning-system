import { AGENTS } from '../types'
import { useAppStore } from '../stores/useAppStore'
import AgentFlowViz from './AgentFlowViz'
import DemoMode from './DemoMode'
import {
  Cpu, Sparkles, Compass, Wand2, BookOpen, ShieldCheck,
} from 'lucide-react'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  coordinator: Cpu,
  profiler: Sparkles,
  planner: Compass,
  generator: Wand2,
  tutor: BookOpen,
  assessor: ShieldCheck,
}

const AGENT_DESCRIPTIONS: Record<string, string> = {
  coordinator: '统筹全局，分配任务，协同各智能体工作。',
  profiler: '分析学习者特征，构建精准学习画像。',
  planner: '制定学习计划，规划最佳学习路径。',
  generator: '生成学习内容与练习，提供个性化资源。',
  tutor: '答疑解惑，提供指导与建议。',
  assessor: '评估学习效果，提供反馈与改进建议。',
}

export default function AgentPanel() {
  const { activeAgent } = useAppStore()
  const agents = Object.values(AGENTS)

  return (
    <div className="h-full flex flex-col bg-ivory border-r border-stone-200">
      <div className="p-4 border-b border-stone-100">
        <h3 className="text-xs font-bold text-stone-900">
          Agent 协作面板
        </h3>
      </div>

      {/* 演示模式 */}
      <DemoMode />

      {/* 协作流转动画 */}
      <div className="px-3 pt-3">
        <AgentFlowViz />
      </div>

      {/* Agent 列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {agents.map((agent) => {
          const isActive = activeAgent === agent.name
          const Icon = ICON_MAP[agent.name] || Cpu
          const description = AGENT_DESCRIPTIONS[agent.name] || agent.description

          return (
            <div
              key={agent.name}
              className={`p-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-primary-50 border-l-[3px] border-l-primary-500 border-y border-r border-y-primary-100 border-r-primary-100'
                  : 'bg-surface border border-stone-100 hover:bg-stone-50'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isActive ? 'bg-primary-500 text-white' : 'bg-primary-50 text-primary-500'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isActive ? 'text-stone-900' : 'text-stone-700'}`}>
                      {agent.displayName}
                    </span>
                    {isActive && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute h-full w-full rounded-full bg-primary-400 opacity-75" />
                        <span className="relative rounded-full h-2 w-2 bg-primary-500" />
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-stone-500 mt-0.5 leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
