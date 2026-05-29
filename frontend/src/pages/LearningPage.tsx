import { useState } from 'react'
import Header from '../components/Header'
import AgentPanel from '../components/AgentPanel'
import ChatPanel from '../components/ChatPanel'
import KnowledgeGraph from '../components/KnowledgeGraph'
import ProgressDashboard from '../components/ProgressDashboard'
import SubjectSelector from '../components/SubjectSelector'
import DocUpload from '../components/DocUpload'
import { useAppStore } from '../stores/useAppStore'
import { Map, BarChart3, FileText, PanelLeft, PanelRight, X } from 'lucide-react'

export default function LearningPage() {
  const { rightPanel, setRightPanel } = useAppStore()
  const [showLeftPanel, setShowLeftPanel] = useState(false)
  const [showRightPanel, setShowRightPanel] = useState(false)

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
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
                <button onClick={() => setShowLeftPanel(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <AgentPanel />
            </div>
            <div className="flex-1 bg-black/20" onClick={() => setShowLeftPanel(false)} />
          </div>
        )}

        {/* 中间：对话 */}
        <div className="flex-1 min-w-0 border-r border-gray-200">
          {/* 移动端顶部工具栏 */}
          <div className="lg:hidden flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white">
            <button
              onClick={() => setShowLeftPanel(true)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 font-medium">对话</span>
            <button
              onClick={() => setShowRightPanel(true)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <PanelRight className="w-4 h-4" />
            </button>
          </div>
          <ChatPanel />
        </div>

        {/* 右侧：图谱/进度 — 桌面端常驻 */}
        <div className="hidden lg:flex w-96 flex-shrink-0 flex-col bg-white">
          <SubjectSelector />
          <div className="flex border-b border-gray-200 bg-white">
            <button
              onClick={() => setRightPanel('graph')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all ${
                rightPanel === 'graph' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              知识图谱
            </button>
            <button
              onClick={() => setRightPanel('progress')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all ${
                rightPanel === 'progress' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              学习进度
            </button>
            <button
              onClick={() => setRightPanel('docs')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all ${
                rightPanel === 'docs' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              资料
            </button>
          </div>
          <div className="flex-1 min-h-0">
            {rightPanel === 'graph' ? <KnowledgeGraph /> : rightPanel === 'progress' ? <ProgressDashboard /> : <DocUpload />}
          </div>
        </div>

        {/* 移动端右侧 overlay */}
        {showRightPanel && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-row-reverse">
            <div className="w-80 bg-white shadow-xl h-full overflow-y-auto flex flex-col">
              <div className="flex justify-start p-2">
                <button onClick={() => setShowRightPanel(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <SubjectSelector />
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setRightPanel('graph')}
                  className={`flex-1 py-2 text-xs font-medium ${rightPanel === 'graph' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-400'}`}
                >
                  知识图谱
                </button>
                <button
                  onClick={() => setRightPanel('progress')}
                  className={`flex-1 py-2 text-xs font-medium ${rightPanel === 'progress' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-400'}`}
                >
                  学习进度
                </button>
                <button
                  onClick={() => setRightPanel('docs')}
                  className={`flex-1 py-2 text-xs font-medium ${rightPanel === 'docs' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-400'}`}
                >
                  资料
                </button>
              </div>
              <div className="flex-1">
                {rightPanel === 'graph' ? <KnowledgeGraph /> : rightPanel === 'progress' ? <ProgressDashboard /> : <DocUpload />}
              </div>
            </div>
            <div className="flex-1 bg-black/20" onClick={() => setShowRightPanel(false)} />
          </div>
        )}
      </div>
    </div>
  )
}
