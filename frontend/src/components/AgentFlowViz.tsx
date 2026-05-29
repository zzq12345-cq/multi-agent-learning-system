/** Agent 协作流转动画 — 实时展示 Agent 间协作过程 */

import { useAppStore } from '../stores/useAppStore'
import { AGENTS } from '../types'
import { Cpu, Sparkles, Compass, Wand2, BookOpen, ShieldCheck } from 'lucide-react'

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
      return { from: parts[0], to: parts[1], timestamp: t.timestamp }
    })

  const activatedAgents = new Set(agentTraces.map((t) => t.agent))

  return (
    <div className="relative w-full bg-zinc-50/50 rounded-xl border border-zinc-200/60 p-3 overflow-hidden">
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
              stroke="#a1a1aa"
              strokeWidth="1"
              strokeDasharray="4,3"
              markerEnd="url(#arrow)"
            />
          )
        })}
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke="#a1a1aa" strokeWidth="1" />
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
                className={`relative w-7 h-7 rounded-lg border flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-[0_0_10px_rgba(16,185,129,0.3)] scale-110'
                    : wasActivated
                      ? 'border-zinc-300 bg-white text-zinc-600'
                      : 'border-zinc-200 bg-zinc-50/80 text-zinc-300'
                }`}
              >
                <Icon className="w-3 h-3" />
                {isActive && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                )}
              </div>
              <span className={`text-[7px] font-medium leading-none ${
                isActive ? 'text-emerald-700' : wasActivated ? 'text-zinc-600' : 'text-zinc-400'
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
