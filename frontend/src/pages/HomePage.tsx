import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

const AGENTS = [
  { id: 'coordinator', name: '协调者', x: 50, y: 20 },
  { id: 'profiler', name: '画像师', x: 20, y: 45 },
  { id: 'planner', name: '规划师', x: 80, y: 45 },
  { id: 'generator', name: '生成器', x: 15, y: 75 },
  { id: 'tutor', name: '导师', x: 50, y: 80 },
  { id: 'assessor', name: '评估师', x: 85, y: 75 },
]

const EDGES = [
  [0, 1], [0, 2], [0, 4],
  [1, 3], [1, 4],
  [2, 4], [2, 5],
  [3, 4],
  [4, 5],
  [1, 2],
]

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden flex flex-col">
      {/* 背景粒子效果 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="px-8 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-blue-500/20 border border-blue-400/30 rounded-full flex items-center justify-center backdrop-blur-sm">
            <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <span className="text-base font-bold text-white/90">智学多Agent系统</span>
        </div>
        <button
          onClick={() => navigate('/learn')}
          className="px-4 py-2 text-xs text-blue-300 border border-blue-500/30 rounded-full hover:bg-blue-500/10 transition-all"
        >
          进入系统
        </button>
      </header>

      {/* 主内容 */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4">
        {/* 网络拓扑图 */}
        <div className="relative w-full max-w-lg aspect-square mb-8">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* 连线 */}
            {EDGES.map(([from, to], i) => {
              const a = AGENTS[from]
              const b = AGENTS[to]
              return (
                <g key={`edge-${i}`}>
                  <line
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke="url(#lineGradient)"
                    strokeWidth="0.3"
                    opacity="0.4"
                  />
                  {/* 流光粒子 */}
                  <circle r="0.6" fill="#60a5fa" opacity="0.8">
                    <animateMotion
                      dur={`${2 + i * 0.3}s`}
                      repeatCount="indefinite"
                      path={`M${a.x},${a.y} L${b.x},${b.y}`}
                    />
                  </circle>
                </g>
              )
            })}

            {/* 渐变定义 */}
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6" />
              </linearGradient>
              <radialGradient id="nodeGlow">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* 节点 */}
            {AGENTS.map((agent, i) => (
              <g key={agent.id}>
                {/* 光晕 */}
                <circle cx={agent.x} cy={agent.y} r="5" fill="url(#nodeGlow)">
                  <animate attributeName="r" values="4;6;4" dur={`${2 + i * 0.2}s`} repeatCount="indefinite" />
                </circle>
                {/* 节点圆 */}
                <circle
                  cx={agent.x} cy={agent.y} r="2.5"
                  fill="#1e293b"
                  stroke="#3b82f6"
                  strokeWidth="0.4"
                />
                {/* 内部小圆 */}
                <circle cx={agent.x} cy={agent.y} r="1" fill="#60a5fa" opacity="0.8">
                  <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" begin={`${i * 0.3}s`} />
                </circle>
                {/* 名称 */}
                <text
                  x={agent.x}
                  y={agent.y + 5.5}
                  textAnchor="middle"
                  className="text-[2.5px] fill-blue-300/80 font-medium"
                >
                  {agent.name}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* 文案 */}
        <div className="text-center max-w-lg">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
            多智能体协同
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> 学习系统</span>
          </h1>
          <p className="text-sm text-blue-200/60 mb-8 leading-relaxed max-w-md mx-auto">
            6 位 AI 智能体实时协作，为你构建个性化学习网络。
            从能力评估到路径规划，从资源生成到效果检验，全链路智能驱动。
          </p>
          <button
            onClick={() => navigate('/learn')}
            className="group px-8 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-sm font-semibold rounded-full shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] transition-all duration-300 flex items-center gap-2 mx-auto"
          >
            开启学习引擎
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* 底部特性标签 */}
        <div className="flex flex-wrap justify-center gap-3 mt-12">
          {['个性化路径', '知识图谱', '遗忘曲线', '实时协作', 'RAG 增强', '多学科'].map(tag => (
            <span key={tag} className="px-3 py-1 text-[10px] text-blue-300/70 border border-blue-500/20 rounded-full bg-blue-500/5">
              {tag}
            </span>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[10px] text-blue-300/30 relative z-10">
        © 2026 智学多智能体个性化学习平台
      </footer>
    </div>
  )
}
