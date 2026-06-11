import { useState, useEffect } from 'react'
import Header from '../components/Header'
import AgentPanel from '../components/AgentPanel'
import ChatPanel from '../components/ChatPanel'
import KnowledgeGraph from '../components/KnowledgeGraph'
import ProgressDashboard from '../components/ProgressDashboard'
import SubjectSelector from '../components/SubjectSelector'
import DocUpload from '../components/DocUpload'
import { useAppStore } from '../stores/useAppStore'
import { Map, BarChart3, FileText, PanelLeft, PanelRight, ChevronsRight, ChevronsLeft, X } from 'lucide-react'

export default function LearningPage() {
  const { rightPanel, setRightPanel } = useAppStore()
  const [showLeftPanel, setShowLeftPanel] = useState(false)
  const [showRightPanel, setShowRightPanel] = useState(false)

  // 左侧面板拖拽宽度（默认 288 保证 6 个 Agent 完整可见，用户调整持久化）
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = Number(localStorage.getItem('left_panel_width'))
    return saved >= 200 && saved <= 480 ? saved : 288
  })
  const [isDragging, setIsDragging] = useState(false)

  // 右侧面板折叠
  const [rightCollapsed, setRightCollapsed] = useState(false)

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(480, Math.max(200, e.clientX))
      setLeftWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setLeftWidth((w) => {
        localStorage.setItem('left_panel_width', String(w))
        return w
      })
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-ivory">
      <Header />

      <div className="flex-1 flex overflow-hidden relative">
        {/* 左侧：Agent 面板 — 桌面端常驻，移动端 overlay */}
        <div className="hidden lg:block flex-shrink-0" style={{ width: leftWidth }}>
          <AgentPanel />
        </div>

        {/* 拖拽手柄 */}
        <div
          className="hidden lg:flex w-1 flex-shrink-0 cursor-col-resize items-center justify-center hover:bg-primary-100 active:bg-primary-200 transition-colors group"
          onMouseDown={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
        >
          <div className="w-0.5 h-8 bg-stone-300 rounded-full group-hover:bg-primary-400 transition-colors" />
        </div>

        {/* 移动端左侧 overlay */}
        {showLeftPanel && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="w-64 bg-surface shadow-xl h-full overflow-y-auto">
              <div className="flex justify-end p-2">
                <button onClick={() => setShowLeftPanel(false)} className="p-1 hover:bg-stone-100 rounded-lg">
                  <X className="w-4 h-4 text-stone-500" />
                </button>
              </div>
              <AgentPanel />
            </div>
            <div className="flex-1 bg-black/20" onClick={() => setShowLeftPanel(false)} />
          </div>
        )}

        {/* 中间：对话 */}
        <div className="flex-1 min-w-0 border-r border-stone-200 relative">
          {/* 移动端顶部工具栏 */}
          <div className="lg:hidden flex items-center justify-between px-3 py-2 border-b border-stone-200 bg-ivory">
            <button
              onClick={() => setShowLeftPanel(true)}
              className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-stone-400 font-medium">对话</span>
            <button
              onClick={() => setShowRightPanel(true)}
              className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500"
            >
              <PanelRight className="w-4 h-4" />
            </button>
          </div>
          <ChatPanel />
        </div>

        {/* 右侧面板折叠按钮 */}
        <button
          onClick={() => setRightCollapsed(!rightCollapsed)}
          className="hidden lg:flex w-5 flex-shrink-0 items-center justify-center hover:bg-stone-100 transition-colors border-l border-stone-200 cursor-pointer"
          title={rightCollapsed ? '展开面板' : '收起面板'}
        >
          {rightCollapsed ? <ChevronsLeft className="w-3 h-3 text-stone-400" /> : <ChevronsRight className="w-3 h-3 text-stone-400" />}
        </button>

        {/* 右侧：图谱/进度 — 桌面端常驻 */}
        {!rightCollapsed && (
        <div className="hidden lg:flex w-96 flex-shrink-0 flex-col bg-cream border-l border-stone-100">
          <SubjectSelector />
          <div className="flex border-b border-stone-200 bg-cream">
            <button
              onClick={() => setRightPanel('graph')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all ${
                rightPanel === 'graph' ? 'text-primary-600 border-b-2 border-primary-500' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              知识图谱
            </button>
            <button
              onClick={() => setRightPanel('progress')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all ${
                rightPanel === 'progress' ? 'text-primary-600 border-b-2 border-primary-500' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              学习进度
            </button>
            <button
              onClick={() => setRightPanel('docs')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all ${
                rightPanel === 'docs' ? 'text-primary-600 border-b-2 border-primary-500' : 'text-stone-400 hover:text-stone-600'
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
        )}

        {/* 移动端右侧 overlay */}
        {showRightPanel && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-row-reverse">
            <div className="w-80 bg-surface shadow-xl h-full overflow-y-auto flex flex-col">
              <div className="flex justify-start p-2">
                <button onClick={() => setShowRightPanel(false)} className="p-1 hover:bg-stone-100 rounded-lg">
                  <X className="w-4 h-4 text-stone-500" />
                </button>
              </div>
              <SubjectSelector />
              <div className="flex border-b border-stone-200">
                <button
                  onClick={() => setRightPanel('graph')}
                  className={`flex-1 py-2 text-xs font-medium ${rightPanel === 'graph' ? 'text-primary-600 border-b-2 border-primary-500' : 'text-stone-400'}`}
                >
                  知识图谱
                </button>
                <button
                  onClick={() => setRightPanel('progress')}
                  className={`flex-1 py-2 text-xs font-medium ${rightPanel === 'progress' ? 'text-primary-600 border-b-2 border-primary-500' : 'text-stone-400'}`}
                >
                  学习进度
                </button>
                <button
                  onClick={() => setRightPanel('docs')}
                  className={`flex-1 py-2 text-xs font-medium ${rightPanel === 'docs' ? 'text-primary-600 border-b-2 border-primary-500' : 'text-stone-400'}`}
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
