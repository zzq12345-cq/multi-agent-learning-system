import { AGENTS } from '../types'
import { useAppStore } from '../stores/useAppStore'
import { 
  Cpu, 
  Sparkles, 
  Compass, 
  Wand2, 
  BookOpen, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react'

// 映射 Agent 图标
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  coordinator: Cpu,
  profiler: Sparkles,
  planner: Compass,
  generator: Wand2,
  tutor: BookOpen,
  assessor: ShieldCheck,
}

export default function AgentPanel() {
  const { activeAgent, agentOutputs } = useAppStore()
  const agents = Object.values(AGENTS)

  return (
    <div className="h-full flex flex-col bg-white/20 border-r border-zinc-200/60 backdrop-blur-md">
      <div className="p-4 border-b border-zinc-200/50">
        <h3 className="text-[10px] font-bold tracking-wider uppercase text-zinc-400">Agent 协作面板</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {agents.map((agent) => {
          const isActive = activeAgent === agent.name
          const output = agentOutputs[agent.name]
          const Icon = ICON_MAP[agent.name] || Cpu

          return (
            <div
              key={agent.name}
              className={`p-3.5 rounded-xl border relative transition-all duration-200 ${
                isActive
                  ? 'border-zinc-950 bg-zinc-50 border-l-3 border-l-emerald-600 shadow-[0_4px_12px_rgba(0,0,0,0.02)]'
                  : output
                    ? 'border-zinc-200/80 bg-zinc-50/20'
                    : 'border-zinc-200/50 bg-white hover:border-zinc-300 shadow-[0_1px_3px_rgba(0,0,0,0.01)]'
              }`}
            >
              <div className="flex items-start gap-3 relative z-10">
                <div 
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
                    isActive 
                      ? 'border-zinc-300 bg-white text-zinc-900'
                      : output
                        ? 'border-zinc-200 bg-zinc-50 text-zinc-500'
                        : 'border-zinc-200/60 bg-zinc-50/40 text-zinc-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold ${isActive ? 'text-zinc-900' : 'text-zinc-700'}`}>
                      {agent.displayName}
                    </span>
                    {isActive && (
                      <span className="flex h-1 w-1 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1 w-1 bg-emerald-600"></span>
                      </span>
                    )}
                    {output && !isActive && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </div>
                  <div className="text-[9px] text-zinc-400 mt-1 truncate leading-normal">
                    {agent.description}
                  </div>
                </div>
              </div>

              {output && (
                <div className="mt-2.5 pt-2 border-t border-zinc-100 text-[9px] text-zinc-500 font-mono line-clamp-2 leading-relaxed">
                  {output}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Agent 协作流程图 */}
      <div className="p-4 border-t border-zinc-200/50">
        <div className="text-[9px] tracking-wider uppercase text-zinc-400 mb-3 font-bold">决策链路</div>
        <div className="flex items-center justify-between gap-1 text-[9px] bg-zinc-50 border border-zinc-200/60 p-2.5 rounded-xl font-mono text-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
          <span className="px-1.5 py-0.5 bg-white border border-zinc-200 text-zinc-700 rounded shadow-[0_1px_2px_rgba(0,0,0,0.02)]">调度仓</span>
          <span className="text-zinc-300">→</span>
          <span className="px-1.5 py-0.5 bg-white border border-zinc-200 text-zinc-700 rounded shadow-[0_1px_2px_rgba(0,0,0,0.02)]">分析组</span>
          <span className="text-zinc-300">→</span>
          <span className="px-1.5 py-0.5 bg-white border border-zinc-200 text-zinc-700 rounded shadow-[0_1px_2px_rgba(0,0,0,0.02)]">输出网</span>
        </div>
      </div>
    </div>
  )
}
