# Task 6: Agent 协作流转可视化（P0 核心亮点）

**Files:**
- Create: `frontend/src/components/AgentFlowViz.tsx`
- Modify: `frontend/src/components/AgentPanel.tsx`

---

- [ ] **Step 1: 创建 AgentFlowViz 组件**

创建 `frontend/src/components/AgentFlowViz.tsx`：

```typescript
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

// Agent 节点位置（横向排列）
const AGENT_ORDER = ['coordinator', 'profiler', 'planner', 'generator', 'tutor', 'assessor']

export default function AgentFlowViz() {
  const { activeAgent, agentTraces } = useAppStore()

  // 从轨迹中提取路由连线
  const routes = agentTraces
    .filter((t) => t.action === 'route' && t.detail)
    .map((t) => {
      const parts = (t.detail || '').split(' → ')
      return { from: parts[0], to: parts[1], timestamp: t.timestamp }
    })

  // 已激活过的 Agent
  const activatedAgents = new Set(agentTraces.map((t) => t.agent))

  return (
    <div className="relative w-full bg-zinc-50/50 rounded-xl border border-zinc-200/60 p-3 overflow-hidden">
      {/* SVG 连线层 */}
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

      {/* Agent 节点 */}
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
```

- [ ] **Step 2: 改造 AgentPanel 集成流转动画**

完整替换 `frontend/src/components/AgentPanel.tsx`：

```typescript
import { AGENTS } from '../types'
import { useAppStore } from '../stores/useAppStore'
import AgentFlowViz from './AgentFlowViz'
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
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/AgentFlowViz.tsx frontend/src/components/AgentPanel.tsx
git commit -m "feat: Agent 协作流转可视化（实时动画 + 轨迹时间线）"
```
