import { AGENTS } from '../types'
import { useAppStore } from '../stores/useAppStore'
import AgentFlowViz from './AgentFlowViz'
import DemoMode from './DemoMode'
import {
  Cpu, Sparkles, Compass, Wand2, BookOpen, ShieldCheck, CheckCircle2,
} from 'lucide-react'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  coordinator: Cpu,
  profiler: Sparkles,
  planner: Compass,
  generator: Wand2,
  tutor: BookOpen,
  assessor: ShieldCheck,
}

export default function AgentPanel() {
  const { activeAgent, agentOutputs, agentTraces } = useAppStore()
  const agents = Object.values(AGENTS)

  return (
    <div className="h-full flex flex-col bg-white/20 border-r border-zinc-200/60 backdrop-blur-md">
      <div className="p-4 border-b border-zinc-200/50">
        <h3 className="text-[10px] font-bold tracking-wider uppercase text-zinc-400">
          Agent 协作面板
        </h3>
      </div>

      {/* 演示模式 */}
      <DemoMode />

      {/* 协作流转动画 */}
      <div className="px-3 pt-3">
        <AgentFlowViz />
      </div>

      {/* 协作轨迹时间线 */}
      {agentTraces.length > 0 && (
        <div className="px-4 pt-3">
          <div className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
            协作轨迹
          </div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {agentTraces.slice(-8).map((trace, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[8px]">
                <span className={`w-1 h-1 rounded-full flex-shrink-0 ${
                  trace.action === 'start' ? 'bg-emerald-400' :
                  trace.action === 'route' ? 'bg-blue-400' : 'bg-zinc-300'
                }`} />
                <span className="text-zinc-500 font-mono truncate">
                  {trace.action === 'route'
                    ? trace.detail
                    : `${AGENTS[trace.agent]?.displayName || trace.agent} ${trace.action === 'start' ? '启动' : '完成'}`
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent 列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {agents.map((agent) => {
          const isActive = activeAgent === agent.name
          const output = agentOutputs[agent.name]
          const Icon = ICON_MAP[agent.name] || Cpu

          return (
            <div
              key={agent.name}
              className={`p-2.5 rounded-xl border transition-all duration-200 ${
                isActive
                  ? 'border-zinc-900 bg-zinc-50 shadow-[0_2px_8px_rgba(0,0,0,0.03)]'
                  : output
                    ? 'border-zinc-200/80 bg-zinc-50/30'
                    : 'border-zinc-200/50 bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-md border flex items-center justify-center ${
                  isActive ? 'border-zinc-300 bg-white text-zinc-900'
                    : output ? 'border-zinc-200 bg-zinc-50 text-zinc-500'
                    : 'border-zinc-200/60 text-zinc-400'
                }`}>
                  <Icon className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold ${isActive ? 'text-zinc-900' : 'text-zinc-700'}`}>
                      {agent.displayName}
                    </span>
                    {isActive && (
                      <span className="flex h-1.5 w-1.5 relative">
                        <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-500 opacity-75" />
                        <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-600" />
                      </span>
                    )}
                    {output && !isActive && <CheckCircle2 className="w-3 h-3 text-zinc-400" />}
                  </div>
                  {output && <div className="text-[8px] text-zinc-500 mt-0.5 truncate">{output}</div>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
