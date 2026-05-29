import Header from '../components/Header'
import AgentPanel from '../components/AgentPanel'
import ChatPanel from '../components/ChatPanel'
import KnowledgeGraph from '../components/KnowledgeGraph'

export default function LearningPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：Agent 面板 */}
        <div className="w-56 flex-shrink-0">
          <AgentPanel />
        </div>

        {/* 中间：对话 */}
        <div className="flex-1 border-r border-zinc-800/60">
          <ChatPanel />
        </div>

        {/* 右侧：知识图谱 */}
        <div className="w-96 flex-shrink-0">
          <KnowledgeGraph />
        </div>
      </div>
    </div>
  )
}
