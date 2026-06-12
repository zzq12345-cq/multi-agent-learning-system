/** Agent 协作流转动画 — 实时展示 Agent 间协作过程 */

import { useAppStore } from '../stores/useAppStore'
import { AGENTS } from '../types'
import { Cpu, Sparkles, Compass, Wand2, BookOpen, ShieldCheck, Scale } from 'lucide-react'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  coordinator: Cpu,
  profiler: Sparkles,
  planner: Compass,
  generator: Wand2,
  tutor: BookOpen,
  assessor: ShieldCheck,
}

const AGENT_ORDER = ['coordinator', 'profiler', 'planner', 'generator', 'tutor', 'assessor']

export default function AgentFlowViz() {
  const { activeAgent, agentTraces } = useAppStore()

  const routes = agentTraces
    .filter((t) => t.action === 'route' && t.detail)
    .map((t) => {
      const parts = (t.detail || '').split(' → ')
      return { from: parts[0], to: parts[1], timestamp: t.timestamp, reasoning: t.reasoning }
    })

  const activatedAgents = new Set(agentTraces.map((t) => t.agent))
  const latestRoute = routes[routes.length - 1]

  // 出题互审标记：本轮存在 review 事件时在评估师节点旁显示（traces 每轮发送前清空）
  const reviewTraces = agentTraces.filter((t) => t.action === 'review')
  const latestReview = reviewTraces[reviewTraces.length - 1]

  // 解析置信度
  let confidence: number | null = null
  if (latestRoute?.reasoning) {
    try {
      const parsed = JSON.parse(latestRoute.reasoning)
      if (parsed.confidence !== undefined) {
        confidence = parsed.confidence
      }
    } catch {
      // 忽略解析错误
    }
  }

  return (
    <div className="relative w-full bg-cream rounded-xl border border-stone-200 p-3 overflow-hidden">
      {/* 置信度徽章 */}
      {confidence !== null && (
        <div className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-primary-500 text-white text-[9px] font-bold shadow-sm">
          置信度 {Math.round(confidence * 100)}%
        </div>
      )}

      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        {routes.map((route, i) => {
          const fromIdx = AGENT_ORDER.indexOf(route.from)
          const toIdx = AGENT_ORDER.indexOf(route.to)
          if (fromIdx < 0 || toIdx < 0) return null
          const spacing = 100 / (AGENT_ORDER.length + 1)
          const x1 = spacing * (fromIdx + 1)
          const x2 = spacing * (toIdx + 1)
          return (
            <line
              key={i}
              x1={`${x1}%`} y1="50%"
              x2={`${x2}%`} y2="50%"
              stroke={i === routes.length - 1 ? 'rgb(var(--p-500))' : 'rgb(var(--n-400))'}
              strokeWidth={i === routes.length - 1 ? 2 : 1}
              strokeDasharray="6,4"
              className={i === routes.length - 1 ? 'animate-[dash_1s_linear_infinite]' : ''}
              markerEnd="url(#arrow)"
            />
          )
        })}
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke="rgb(var(--p-300))" strokeWidth="1" />
          </marker>
        </defs>
      </svg>

      <div className="relative flex items-center justify-between gap-1 z-10">
        {AGENT_ORDER.map((name) => {
          const Icon = ICON_MAP[name] || Cpu
          const isActive = activeAgent === name
          const wasActivated = activatedAgents.has(name)

          return (
            <div key={name} className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`relative w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? 'border-primary-500 bg-primary-50 text-primary-600 shadow-[0_0_10px_rgb(var(--p-500)/0.25)] scale-110'
                    : wasActivated
                      ? 'border-primary-200 bg-primary-50 text-primary-500'
                      : 'border-stone-200 bg-surface text-stone-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {name === 'assessor' && latestReview && (
                  <span
                    className={`absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white shadow-sm ${
                      latestReview.detail === 'pass' ? 'bg-primary-500' : 'bg-amber-500'
                    }`}
                    title={latestReview.detail === 'pass' ? '同行评审通过' : '审查退回重出'}
                  >
                    <Scale className="w-2 h-2" />
                  </span>
                )}
                {isActive && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-500" />
                  </span>
                )}
              </div>
              <span className={`text-[8px] font-medium leading-none ${
                isActive ? 'text-primary-600' : wasActivated ? 'text-stone-700' : 'text-stone-400'
              }`}>
                {AGENTS[name]?.displayName || name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
