import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { listSubjects, getGraphByDomain } from '../services/api'
import { BookOpen, Code, Database, Sparkles, ChevronDown, Search, Check } from 'lucide-react'

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
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { setLearningPath, setNodeStates, activeDomain, setActiveDomain } = useAppStore()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listSubjects().then((data) => {
      setSubjects(data)
      if (data.length > 0 && !activeDomain) setActiveDomain(data[0].domain)
    })
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      listSubjects().then(setSubjects)
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = async (domain: string) => {
    setActiveDomain(domain)
    setOpen(false)
    setSearch('')
    const graph = await getGraphByDomain(domain)
    if (graph && !graph.error) {
      setLearningPath(graph)
      setNodeStates([])
    }
  }

  const activeSubject = subjects.find((s) => s.domain === activeDomain)
  const ActiveIcon = activeSubject ? (DOMAIN_ICONS[activeSubject.domain] || Sparkles) : Sparkles

  const filtered = subjects.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.domain.toLowerCase().includes(search.toLowerCase())
  )

  if (!subjects.length) return null

  return (
    <div className="relative px-3 py-2.5 border-b border-stone-200 bg-surface" ref={dropdownRef}>
      {/* 触发按钮 */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-stone-200 bg-surface hover:border-primary-300 transition-all text-left"
      >
        <ActiveIcon className="w-4 h-4 text-primary-500" />
        <span className="flex-1 text-xs font-medium text-stone-800 truncate">
          {activeSubject?.title || '选择学科'}
        </span>
        {activeSubject?.source === 'dynamic' && <span className="text-[8px]">✨</span>}
        <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* 下拉面板 */}
      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-surface border border-stone-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* 搜索框 */}
          <div className="p-2 border-b border-stone-100">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-50 rounded-lg">
              <Search className="w-3.5 h-3.5 text-stone-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索学科..."
                autoFocus
                className="flex-1 bg-transparent text-xs text-stone-800 placeholder-stone-400 outline-none"
              />
            </div>
          </div>

          {/* 学科列表 */}
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-stone-400 text-center">
                无匹配学科，在对话中说出想学的内容即可创建
              </div>
            ) : (
              filtered.map((s) => {
                const Icon = DOMAIN_ICONS[s.domain] || Sparkles
                const isActive = activeDomain === s.domain
                return (
                  <button
                    key={s.domain}
                    onClick={() => handleSelect(s.domain)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors ${
                      isActive ? 'bg-primary-50' : 'hover:bg-stone-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-primary-500' : 'text-stone-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={`text-xs font-medium truncate ${isActive ? 'text-primary-600' : 'text-stone-700'}`}>
                          {s.title}
                        </span>
                        {s.source === 'dynamic' && <span className="text-[8px]">✨</span>}
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {s.nodes_count} 节点{s.doc_count > 0 ? ` · ${s.doc_count} 文档` : ''}
                      </span>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-primary-500" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
