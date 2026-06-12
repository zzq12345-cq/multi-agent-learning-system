/** 学习进度看板 */

import { useMemo, useState } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { AlertTriangle, BarChart3, FileText, Target, Clock, TrendingUp } from 'lucide-react'
import MemoryCurveModal from './MemoryCurveModal'
import ReportCardModal from './ReportCardModal'
import { decayedMastery, needsReview } from '../utils/mastery'

export default function ProgressDashboard() {
  const { learningPath, nodeStates, profile, agentOutputs, masteryData } = useAppStore()
  const [selectedNode, setSelectedNode] = useState<{ id: string; name: string } | null>(null)
  const [showReport, setShowReport] = useState(false)

  const totalNodes = learningPath?.nodes?.length || 0
  const completedNodes = nodeStates.filter((n) => n.status === 'completed').length
  const progressPercent = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0

  const estimatedHours = learningPath?.estimated_hours || 0
  const completedHours = totalNodes > 0
    ? Math.round(estimatedHours * (completedNodes / totalNodes) * 10) / 10
    : 0

  // 计算需要复习的节点（掌握度衰减）
  const reviewNodes = useMemo(() => {
    if (!masteryData || !learningPath?.nodes) return []
    const now = Date.now() / 1000

    return learningPath.nodes
      .filter(node => {
        const data = masteryData[node.id]
        return !!data && needsReview(data.mastery, data.last_review_ts || now, now)
      })
      .map(node => {
        const data = masteryData[node.id]
        return {
          id: node.id,
          name: node.name,
          currentMastery: Math.round(decayedMastery(data.mastery, data.last_review_ts || now, now)),
        }
      })
  }, [masteryData, learningPath])

  // 计算雷达图数据（按难度分组统计掌握度）
  const radarData = useMemo(() => {
    if (!learningPath?.nodes) return []

    const dimensions: Record<string, { total: number; completed: number }> = {}

    learningPath.nodes.forEach((node) => {
      const dimLabel = node.difficulty <= 1 ? '基础' : node.difficulty <= 2 ? '进阶' : node.difficulty <= 3 ? '中级' : '高级'
      if (!dimensions[dimLabel]) dimensions[dimLabel] = { total: 0, completed: 0 }
      dimensions[dimLabel].total++

      const state = nodeStates.find(s => s.nodeId === node.id)
      if (state?.status === 'completed') dimensions[dimLabel].completed++
    })

    return Object.entries(dimensions).map(([label, { total, completed }]) => ({
      label,
      value: total > 0 ? Math.round((completed / total) * 100) : 0,
    }))
  }, [learningPath, nodeStates])

  return (
    <div className="h-full flex flex-col bg-cream overflow-y-auto">
      {/* 头部统计 */}
      <div className="p-4 border-b border-stone-200/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
            学习进度
          </h3>
          {learningPath && (
            <button
              onClick={() => setShowReport(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-primary-200 bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors text-[9px] font-medium"
              title="生成一页式学情报告"
            >
              <FileText className="w-3 h-3" />
              生成学习报告
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <StatCard
            icon={Target}
            label="完成进度"
            value={`${progressPercent}%`}
            sub={`${completedNodes}/${totalNodes} 节点`}
          />
          <StatCard
            icon={Clock}
            label="学习时长"
            value={`${completedHours}h`}
            sub={`共 ${estimatedHours}h`}
          />
          <StatCard
            icon={TrendingUp}
            label="当前水平"
            value={profile?.knowledge_level === 'advanced' ? '高级'
              : profile?.knowledge_level === 'intermediate' ? '中级' : '入门'}
            sub={profile?.learning_style || '待评估'}
          />
          <StatCard
            icon={BarChart3}
            label="Agent 协作"
            value={`${Object.keys(agentOutputs).length}`}
            sub="次调用"
          />
        </div>
      </div>

      {/* 能力雷达图 */}
      {learningPath?.nodes && learningPath.nodes.length > 0 && radarData.length > 0 && (
        <div className="px-4 pt-4">
          <div className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-2">
            能力分布
          </div>
          <div className="flex justify-center bg-surface rounded-xl border border-stone-200/60 p-3">
            <RadarChart data={radarData} />
          </div>
        </div>
      )}

      {/* 进度条 */}
      {totalNodes > 0 && (
        <div className="px-4 pt-4">
          <div className="flex justify-between text-[9px] text-stone-500 mb-1.5">
            <span>总体进度</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-primary-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* 遗忘预警 */}
      {reviewNodes.length > 0 && (
        <div className="px-4 pt-4">
          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-bold text-amber-700">遗忘预警</span>
            </div>
            <div className="space-y-1.5">
              {reviewNodes.map((node) => (
                <div key={node.id} className="flex items-center justify-between text-[9px]">
                  <span className="text-amber-800 flex-1 truncate">{node.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 bg-amber-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${node.currentMastery}%` }}
                      />
                    </div>
                    <span className="text-amber-600 font-mono w-8 text-right">
                      {node.currentMastery}%
                    </span>
                    {(masteryData[node.id]?.history?.length ?? 0) > 0 && (
                      <button
                        onClick={() => setSelectedNode({ id: node.id, name: node.name })}
                        className="w-5 h-5 rounded flex items-center justify-center bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors"
                        title="查看记忆曲线"
                      >
                        <TrendingUp className="w-3 h-3 text-amber-600" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[8px] text-amber-500 mt-2">
              这些知识点掌握度正在衰减，建议复习巩固
            </p>
          </div>
        </div>
      )}

      {/* 节点列表 */}
      {learningPath?.nodes && (
        <div className="px-4 pt-4 flex-1">
          <div className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-2">
            知识节点
          </div>
          <div className="space-y-1.5">
            {learningPath.nodes.map((node, i) => {
              const state = nodeStates.find((s) => s.nodeId === node.id)
              const status = state?.status || (i === 0 ? 'available' : 'locked')

              return (
                <div
                  key={node.id}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-[9px] ${
                    status === 'completed' ? 'border-primary-200 bg-primary-50/50 text-primary-700' :
                    status === 'in_progress' ? 'border-emerald-200 bg-emerald-50/50 text-emerald-700' :
                    status === 'available' ? 'border-stone-200 bg-surface text-stone-700' :
                    'border-stone-100 bg-stone-50 text-stone-400'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-md border flex items-center justify-center text-[7px] font-bold ${
                    status === 'completed' ? 'border-primary-300 bg-primary-100 text-primary-600' :
                    status === 'in_progress' ? 'border-emerald-300 bg-emerald-100 text-emerald-600' :
                    'border-stone-200 bg-stone-100 text-stone-400'
                  }`}>
                    {status === 'completed' ? '✓' : i + 1}
                  </span>
                  <span className="flex-1 truncate font-medium">{node.name}</span>
                  {state?.score != null && (
                    <span className="text-[8px] font-mono text-primary-500">{state.score}分</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
      {/* 空状态 */}
      {!learningPath && (
        <div className="flex-1 flex items-center justify-center text-center px-6">
          <div>
            <BarChart3 className="w-8 h-8 text-stone-300 mx-auto mb-3" />
            <p className="text-[10px] text-stone-500 font-medium">暂无学习数据</p>
            <p className="text-[9px] text-stone-400 mt-1">开始学习后这里会显示进度</p>
          </div>
        </div>
      )}

      {/* 记忆曲线弹窗 */}
      {selectedNode && masteryData[selectedNode.id] && (
        <MemoryCurveModal
          nodeId={selectedNode.id}
          nodeName={selectedNode.name}
          masteryData={masteryData[selectedNode.id]}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* 学情报告卡弹窗 */}
      {showReport && <ReportCardModal onClose={() => setShowReport(false)} />}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="p-2.5 rounded-xl border border-stone-200/60 bg-surface">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-stone-400" />
        <span className="text-[8px] text-stone-400 font-medium">{label}</span>
      </div>
      <div className="text-sm font-bold text-stone-900">{value}</div>
      <div className="text-[8px] text-stone-400 mt-0.5">{sub}</div>
    </div>
  )
}

/** 雷达图（供学情报告卡复用） */
export function RadarChart({ data }: { data: { label: string; value: number }[] }) {
  if (!data.length) return null

  const size = 160
  const center = size / 2
  const radius = 55
  const angleStep = (2 * Math.PI) / data.length

  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2
    const r = (value / 100) * radius
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) }
  }

  const gridLevels = [25, 50, 75, 100]

  const dataPoints = data.map((d, i) => getPoint(i, d.value))
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* 背景网格 */}
        {gridLevels.map((level) => {
          const points = data.map((_, i) => getPoint(i, level))
          const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
          return <path key={level} d={path} fill="none" className="stroke-stone-200" strokeWidth="0.5" />
        })}

        {/* 轴线 */}
        {data.map((_, i) => {
          const p = getPoint(i, 100)
          return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} className="stroke-stone-200" strokeWidth="0.5" />
        })}

        {/* 数据区域 */}
        <path d={dataPath} className="fill-primary-500/15 stroke-primary-500" strokeWidth="1.5" />

        {/* 数据点 */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" className="fill-primary-500" />
        ))}

        {/* 标签 */}
        {data.map((d, i) => {
          const labelPoint = getPoint(i, 120)
          return (
            <text
              key={i}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[8px] fill-stone-500"
            >
              {d.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
