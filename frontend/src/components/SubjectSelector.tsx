import { useState, useEffect } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { listGraphs, getGraphByDomain } from '../services/api'
import { BookOpen, Code, Database } from 'lucide-react'

const DOMAIN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  python: Code,
  web: BookOpen,
  datastructure: Database,
}

const DOMAIN_LABELS: Record<string, string> = {
  python: 'Python',
  web: 'Web 前端',
  datastructure: '数据结构',
}

interface GraphInfo {
  domain: string
  title: string
  nodes_count: number
}

export default function SubjectSelector() {
  const [graphs, setGraphs] = useState<GraphInfo[]>([])
  const [activeDomain, setActiveDomain] = useState<string>('python')
  const { setLearningPath, setNodeStates } = useAppStore()

  useEffect(() => {
    listGraphs().then(setGraphs)
  }, [])

  const handleSelect = async (domain: string) => {
    setActiveDomain(domain)
    const graph = await getGraphByDomain(domain)
    if (graph && !graph.error) {
      setLearningPath(graph)
      setNodeStates([]) // 重置节点状态
    }
  }

  if (!graphs.length) return null

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-200/50 bg-white/50">
      <span className="text-[9px] text-zinc-400 font-medium mr-1">学科</span>
      {graphs.map((g) => {
        const Icon = DOMAIN_ICONS[g.domain] || BookOpen
        const isActive = activeDomain === g.domain
        return (
          <button
            key={g.domain}
            onClick={() => handleSelect(g.domain)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium transition-all ${
              isActive
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700'
            }`}
          >
            <Icon className="w-3 h-3" />
            {DOMAIN_LABELS[g.domain] || g.domain}
          </button>
        )
      })}
    </div>
  )
}
