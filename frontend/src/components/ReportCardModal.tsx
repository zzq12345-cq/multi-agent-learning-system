/** 学情报告卡 — 一页式学习报告弹层（演示收尾镜头） */

import { useEffect, useMemo, useState } from 'react'
import { FileText, Printer, Sparkles, X } from 'lucide-react'
import { useAppStore } from '../stores/useAppStore'
import { RadarChart } from './ProgressDashboard'

interface ReportMasteryItem {
  id: string
  name: string
  difficulty: number
  mastery: number
  current_mastery: number
  attempts: number
}

interface ReportData {
  username: string
  path_title: string
  domain: string
  estimated_hours: number
  generated_at: number
  total_nodes: number
  completed_nodes: number
  in_progress_nodes: number
  avg_score: number | null
  review_count: number
  mastery: ReportMasteryItem[]
  weak_points: Array<{ id: string; name: string; current_mastery: number }>
  ai_comment: string
}

/* 打印时只保留报告卡本体，隐藏遮罩与操作按钮 */
const PRINT_STYLES = `
@media print {
  body * { visibility: hidden; }
  .report-print-area, .report-print-area * { visibility: visible; }
  .report-print-area {
    position: absolute !important; left: 0 !important; top: 0 !important;
    width: 100% !important; max-height: none !important; overflow: visible !important;
    border: none !important; box-shadow: none !important; transform: none !important;
  }
  .report-no-print { display: none !important; }
}
`

export default function ReportCardModal({ onClose }: { onClose: () => void }) {
  const { sessionId, user } = useAppStore()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch(`/api/learning/report/${sessionId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive) {
          setReport(data?.report || null)
          setLoading(false)
        }
      })
      .catch(() => {
        if (alive) setLoading(false)
      })
    return () => { alive = false }
  }, [sessionId])

  // 按难度分组的掌握度雷达数据（复用进度看板的难度档位划分）
  const radarData = useMemo(() => {
    if (!report?.mastery?.length) return []
    const groups: Record<string, number[]> = {}
    report.mastery.forEach((item) => {
      const label = item.difficulty <= 1 ? '基础' : item.difficulty <= 2 ? '进阶' : item.difficulty <= 3 ? '中级' : '高级'
      if (!groups[label]) groups[label] = []
      groups[label].push(item.current_mastery)
    })
    return Object.entries(groups).map(([label, values]) => ({
      label,
      value: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    }))
  }, [report])

  const username = report?.username || user?.username || '学习者'

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <style>{PRINT_STYLES}</style>
      <div
        className="report-print-area paper-card rounded-2xl w-[640px] max-h-[88vh] overflow-y-auto p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {loading && (
          <div className="py-16 text-center">
            <FileText className="w-8 h-8 text-stone-300 mx-auto mb-3 animate-pulse" />
            <p className="text-xs text-stone-500">正在生成学习报告…</p>
          </div>
        )}

        {!loading && !report && (
          <div className="py-16 text-center">
            <FileText className="w-8 h-8 text-stone-300 mx-auto mb-3" />
            <p className="text-xs text-stone-500 font-medium">暂无学习数据</p>
            <p className="text-[10px] text-stone-400 mt-1">先完成学习路径规划后再生成报告</p>
            <button
              onClick={onClose}
              className="report-no-print mt-4 px-4 py-1.5 rounded-lg border border-stone-200 text-[11px] text-stone-600 hover:bg-stone-50 transition-colors"
            >
              关闭
            </button>
          </div>
        )}

        {!loading && report && (
          <ReportBody report={report} username={username} radarData={radarData} onClose={onClose} />
        )}
      </div>
    </div>
  )
}

function ReportBody({ report, username, radarData, onClose }: {
  report: ReportData
  username: string
  radarData: { label: string; value: number }[]
  onClose: () => void
}) {
  const dateText = new Date(report.generated_at * 1000).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div>
      {/* 标题区 */}
      <div className="flex items-start justify-between border-b border-stone-200/80 pb-4 mb-5">
        <div>
          <div className="text-[9px] font-bold text-primary-500 uppercase tracking-[0.2em] mb-1.5">
            Learning Report · 学情报告
          </div>
          <h2 className="font-display text-xl font-bold text-stone-900 tracking-tight">
            {username} 的学习报告
          </h2>
          <p className="text-[10px] text-stone-500 mt-1">
            {report.path_title || '个性化学习路径'} · {dateText}
          </p>
        </div>
        <button
          onClick={onClose}
          className="report-no-print text-stone-400 hover:text-stone-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 关键数据行 */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <KeyStat label="完成节点" value={`${report.completed_nodes}/${report.total_nodes}`} />
        <KeyStat label="平均分" value={report.avg_score != null ? `${report.avg_score}` : '—'} />
        <KeyStat label="待复习" value={`${report.review_count}`} />
      </div>

      {/* 掌握度雷达 */}
      {radarData.length >= 3 && (
        <div className="mb-5">
          <div className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-2">
            掌握度分布
          </div>
          <div className="flex justify-center bg-cream/60 rounded-xl border border-stone-200/60 p-3">
            <RadarChart data={radarData} />
          </div>
        </div>
      )}

      {/* 薄弱点列表 */}
      {report.weak_points.length > 0 && (
        <div className="mb-5">
          <div className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-2">
            薄弱知识点
          </div>
          <div className="space-y-1.5">
            {report.weak_points.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg border border-amber-200 bg-amber-50/50 text-[10px]"
              >
                <span className="text-amber-800 flex-1 truncate">{w.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1 bg-amber-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${w.current_mastery}%` }}
                    />
                  </div>
                  <span className="text-amber-600 font-mono w-9 text-right">
                    {Math.round(w.current_mastery)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI 评语 */}
      <div className="mb-6">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3 h-3 text-primary-500" />
          <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">AI 学习评语</span>
        </div>
        <p className="text-[11px] text-stone-700 leading-relaxed bg-oat/60 border-l-2 border-primary-300 rounded-r-lg px-4 py-3">
          {report.ai_comment}
        </p>
      </div>

      {/* 底部操作 */}
      <div className="report-no-print flex items-center justify-end gap-2 border-t border-stone-200/80 pt-4">
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-lg border border-stone-200 text-[11px] text-stone-600 hover:bg-stone-50 transition-colors"
        >
          关闭
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary-500 text-white text-[11px] font-medium hover:bg-primary-600 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          打印 / 保存
        </button>
      </div>
    </div>
  )
}

function KeyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl border border-stone-200/60 bg-cream/60 text-center">
      <div className="text-lg font-bold text-stone-900 font-display">{value}</div>
      <div className="text-[9px] text-stone-400 mt-0.5">{label}</div>
    </div>
  )
}
