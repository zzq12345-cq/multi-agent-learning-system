import { useState, useEffect } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { listSubjects, getGraphByDomain } from '../services/api'
import { BookOpen, Code, Database, Sparkles } from 'lucide-react'

const DOMAIN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  python: Code,
  web: BookOpen,
  datastructure: Database,
}

interface SubjectInfo {
  domain: string
  title: string
  nodes_count: number
  source: string
  doc_count: number
}

export default function SubjectSelector() {
  const [subjects, setSubjects] = useState<SubjectInfo[]>([])
  const [activeDomain, setActiveDomain] = useState<string>('')
  const { setLearningPath, setNodeStates } = useAppStore()

  useEffect(() => {
    listSubjects().then((data) => {
      setSubjects(data)
      if (data.length > 0 && !activeDomain) setActiveDomain(data[0].domain)
    })
  }, [])

  // 每 10 秒刷新一次（捕获 Planner 新建的学科）
  useEffect(() => {
    const timer = setInterval(() => {
      listSubjects().then(setSubjects)
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  const handleSelect = async (domain: string) => {
    setActiveDomain(domain)
    const graph = await getGraphByDomain(domain)
    if (graph && !graph.error) {
      setLearningPath(graph)
      setNodeStates([])
    }
  }

  if (!subjects.length) return null

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-200/50 bg-white/50 overflow-x-auto">
      <span className="text-[9px] text-zinc-400 font-medium mr-1 flex-shrink-0">学科</span>
      {subjects.map((s) => {
        const Icon = DOMAIN_ICONS[s.domain] || Sparkles
        const isActive = activeDomain === s.domain
        return (
          <button
            key={s.domain}
            onClick={() => handleSelect(s.domain)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium transition-all flex-shrink-0 ${
              isActive
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700'
            }`}
            title={s.source === 'dynamic' ? '动态生成的学科' : '预置学科'}
          >
            <Icon className="w-3 h-3" />
            {s.title.length > 6 ? s.title.slice(0, 6) + '...' : s.title}
            {s.source === 'dynamic' && <span className="text-[7px] opacity-60">✨</span>}
          </button>
        )
      })}
    </div>
  )
}
