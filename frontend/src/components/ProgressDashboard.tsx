/** 学习进度看板 */

import { useMemo } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { AlertTriangle, BarChart3, Target, Clock, TrendingUp } from 'lucide-react'

export default function ProgressDashboard() {
  const { learningPath, nodeStates, profile, agentOutputs, masteryData } = useAppStore()

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
    const DECAY_RATE = 0.1
    const THRESHOLD = 70

    return learningPath.nodes
      .filter(node => {
        const data = masteryData[node.id]
        if (!data || data.mastery < THRESHOLD) return false
        const days = (now - (data.last_review_ts || now)) / 86400
        const decayed = data.mastery * Math.exp(-DECAY_RATE * days)
        return decayed < THRESHOLD
      })
      .map(node => {
        const data = masteryData[node.id]
        const days = (now - (data.last_review_ts || now)) / 86400
        const currentMastery = Math.round(
          data.mastery * Math.exp(-DECAY_RATE * days)
        )
        return {
          id: node.id,
          name: node.name,
          currentMastery: Math.max(10, currentMastery),
        }
      })
  }, [masteryData, learningPath])

  return (
    <div className="h-full flex flex-col bg-[#f7f7f5] overflow-y-auto">
      {/* 头部统计 */}
      <div className="p-4 border-b border-zinc-200/50">
        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3">
          学习进度
        </h3>

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
      {/* 进度条 */}
      {totalNodes > 0 && (
        <div className="px-4 pt-4">
          <div className="flex justify-between text-[9px] text-zinc-500 mb-1.5">
            <span>总体进度</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-indigo-500 rounded-full transition-all duration-500"
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
                  <span className="text-amber-800">{node.name}</span>
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
          <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
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
                    status === 'completed' ? 'border-indigo-200 bg-indigo-50/50 text-indigo-700' :
                    status === 'in_progress' ? 'border-emerald-200 bg-emerald-50/50 text-emerald-700' :
                    status === 'available' ? 'border-zinc-200 bg-white text-zinc-700' :
                    'border-zinc-100 bg-zinc-50 text-zinc-400'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-md border flex items-center justify-center text-[7px] font-bold ${
                    status === 'completed' ? 'border-indigo-300 bg-indigo-100 text-indigo-600' :
                    status === 'in_progress' ? 'border-emerald-300 bg-emerald-100 text-emerald-600' :
                    'border-zinc-200 bg-zinc-100 text-zinc-400'
                  }`}>
                    {status === 'completed' ? '✓' : i + 1}
                  </span>
                  <span className="flex-1 truncate font-medium">{node.name}</span>
                  {state?.score != null && (
                    <span className="text-[8px] font-mono text-indigo-500">{state.score}分</span>
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
            <BarChart3 className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
            <p className="text-[10px] text-zinc-500 font-medium">暂无学习数据</p>
            <p className="text-[9px] text-zinc-400 mt-1">开始学习后这里会显示进度</p>
          </div>
        </div>
      )}
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
    <div className="p-2.5 rounded-xl border border-zinc-200/60 bg-white">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-zinc-400" />
        <span className="text-[8px] text-zinc-400 font-medium">{label}</span>
      </div>
      <div className="text-sm font-bold text-zinc-900">{value}</div>
      <div className="text-[8px] text-zinc-400 mt-0.5">{sub}</div>
    </div>
  )
}
