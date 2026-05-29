import { useState } from 'react'
import Header from '../components/Header'
import AgentPanel from '../components/AgentPanel'
import ChatPanel from '../components/ChatPanel'
import KnowledgeGraph from '../components/KnowledgeGraph'
import ProgressDashboard from '../components/ProgressDashboard'
import SubjectSelector from '../components/SubjectSelector'
import { useAppStore } from '../stores/useAppStore'
import { Map, BarChart3, PanelLeft, PanelRight, X } from 'lucide-react'

export default function LearningPage() {
  const { rightPanel, setRightPanel } = useAppStore()
  const [showLeftPanel, setShowLeftPanel] = useState(false)
  const [showRightPanel, setShowRightPanel] = useState(false)

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden relative">
        {/* 左侧：Agent 面板 — 桌面端常驻，移动端 overlay */}
        <div className="hidden lg:block w-56 flex-shrink-0">
          <AgentPanel />
        </div>

        {/* 移动端左侧 overlay */}
        {showLeftPanel && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="w-64 bg-white shadow-xl h-full overflow-y-auto">
              <div className="flex justify-end p-2">
                <button onClick={() => setShowLeftPanel(false)} className="p-1 hover:bg-zinc-100 rounded-lg">
                  <X className="w-4 h-4 text-zinc-500" />
                </button>
              </div>
              <AgentPanel />
            </div>
            <div className="flex-1 bg-black/20" onClick={() => setShowLeftPanel(false)} />
          </div>
        )}

        {/* 中间：对话 */}
        <div className="flex-1 min-w-0 border-r border-zinc-200/60">
          {/* 移动端顶部工具栏 */}
          <div className="lg:hidden flex items-center justify-between px-3 py-2 border-b border-zinc-200/50 bg-white/80">
            <button
              onClick={() => setShowLeftPanel(true)}
              className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] text-zinc-400 font-medium">对话</span>
            <button
              onClick={() => setShowRightPanel(true)}
              className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500"
            >
              <PanelRight className="w-4 h-4" />
            </button>
          </div>
          <ChatPanel />
        </div>

        {/* 右侧：图谱/进度 — 桌面端常驻 */}
        <div className="hidden lg:flex w-96 flex-shrink-0 flex-col">
          <SubjectSelector />
          <div className="flex border-b border-zinc-200/50 bg-white/50">
            <button
              onClick={() => setRightPanel('graph')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-medium transition-all ${
                rightPanel === 'graph' ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <Map className="w-3 h-3" />
              知识图谱
            </button>
            <button
              onClick={() => setRightPanel('progress')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-medium transition-all ${
                rightPanel === 'progress' ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              学习进度
            </button>
          </div>
          <div className="flex-1">
            {rightPanel === 'graph' ? <KnowledgeGraph /> : <ProgressDashboard />}
          </div>
        </div>

        {/* 移动端右侧 overlay */}
        {showRightPanel && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-row-reverse">
            <div className="w-80 bg-white shadow-xl h-full overflow-y-auto flex flex-col">
              <div className="flex justify-start p-2">
                <button onClick={() => setShowRightPanel(false)} className="p-1 hover:bg-zinc-100 rounded-lg">
                  <X className="w-4 h-4 text-zinc-500" />
                </button>
              </div>
              <SubjectSelector />
              <div className="flex border-b border-zinc-200/50">
                <button
                  onClick={() => setRightPanel('graph')}
                  className={`flex-1 py-2 text-[10px] font-medium ${rightPanel === 'graph' ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-400'}`}
                >
                  知识图谱
                </button>
                <button
                  onClick={() => setRightPanel('progress')}
                  className={`flex-1 py-2 text-[10px] font-medium ${rightPanel === 'progress' ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-400'}`}
                >
                  学习进度
                </button>
              </div>
              <div className="flex-1">
                {rightPanel === 'graph' ? <KnowledgeGraph /> : <ProgressDashboard />}
              </div>
            </div>
            <div className="flex-1 bg-black/20" onClick={() => setShowRightPanel(false)} />
          </div>
        )}
      </div>
    </div>
  )
}
