import Header from '../components/Header'
import AgentPanel from '../components/AgentPanel'
import ChatPanel from '../components/ChatPanel'
import KnowledgeGraph from '../components/KnowledgeGraph'
import ProgressDashboard from '../components/ProgressDashboard'
import { useAppStore } from '../stores/useAppStore'
import { Map, BarChart3 } from 'lucide-react'

export default function LearningPage() {
  const { rightPanel, setRightPanel } = useAppStore()

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：Agent 面板 */}
        <div className="w-56 flex-shrink-0">
          <AgentPanel />
        </div>

        {/* 中间：对话 */}
        <div className="flex-1 border-r border-zinc-200/60">
          <ChatPanel />
        </div>

        {/* 右侧：图谱/进度 tab */}
        <div className="w-96 flex-shrink-0 flex flex-col">
          {/* Tab 切换 */}
          <div className="flex border-b border-zinc-200/50 bg-white/50">
            <button
              onClick={() => setRightPanel('graph')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-medium transition-all ${
                rightPanel === 'graph'
                  ? 'text-zinc-900 border-b-2 border-zinc-900'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <Map className="w-3 h-3" />
              知识图谱
            </button>
            <button
              onClick={() => setRightPanel('progress')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-medium transition-all ${
                rightPanel === 'progress'
                  ? 'text-zinc-900 border-b-2 border-zinc-900'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              学习进度
            </button>
          </div>

          {/* 内容区 */}
          <div className="flex-1">
            {rightPanel === 'graph' ? <KnowledgeGraph /> : <ProgressDashboard />}
          </div>
        </div>
      </div>
    </div>
  )
}
