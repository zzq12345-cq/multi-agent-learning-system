/** 记忆曲线弹窗 */

import { X } from 'lucide-react'

interface MemoryCurveModalProps {
  nodeId: string
  nodeName: string
  masteryData: { mastery: number; last_review_ts: number; history?: Array<{ score: number; timestamp: number }> }
  onClose: () => void
}

const DECAY_RATE = 0.1

export default function MemoryCurveModal({ nodeName, masteryData, onClose }: MemoryCurveModalProps) {
  const history = masteryData.history || []

  if (history.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-surface rounded-2xl border-2 border-stone-200 p-6 w-[480px] shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-stone-900">{nodeName} - 记忆曲线</h3>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-stone-500">暂无历史数据</p>
        </div>
      </div>
    )
  }

  // 计算相对天数
  const firstTimestamp = history[0].timestamp
  const now = Date.now() / 1000

  const dataPoints = history.map(h => ({
    days: (h.timestamp - firstTimestamp) / 86400,
    score: h.score,
  }))

  // 添加当前衰减点
  const daysSinceLastReview = (now - masteryData.last_review_ts) / 86400
  const currentDecayed = Math.max(10, masteryData.mastery * Math.exp(-DECAY_RATE * daysSinceLastReview))
  const currentDays = (now - firstTimestamp) / 86400

  dataPoints.push({
    days: currentDays,
    score: currentDecayed,
  })

  // 预测下次复习时间
  const daysUntilThreshold = currentDecayed > 70
    ? Math.log(currentDecayed / 70) / DECAY_RATE
    : 0

  // SVG 绘图参数
  const width = 440
  const height = 240
  const padding = { top: 20, right: 20, bottom: 40, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const maxDays = Math.max(...dataPoints.map(p => p.days), 1)
  const xScale = (days: number) => padding.left + (days / maxDays) * chartWidth
  const yScale = (score: number) => padding.top + chartHeight - (score / 100) * chartHeight

  // 绘制路径
  const linePath = dataPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.days)} ${yScale(p.score)}`)
    .join(' ')

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface rounded-2xl border-2 border-stone-200 p-6 w-[520px] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-stone-900">{nodeName} - 记忆曲线</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <svg width={width} height={height} className="mb-4">
          {/* Y轴刻度 */}
          {[0, 25, 50, 75, 100].map(y => (
            <g key={y}>
              <line
                x1={padding.left}
                y1={yScale(y)}
                x2={width - padding.right}
                y2={yScale(y)}
                stroke="rgb(var(--n-200))"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
              <text
                x={padding.left - 8}
                y={yScale(y)}
                textAnchor="end"
                dominantBaseline="middle"
                className="text-[9px] fill-stone-400"
              >
                {y}
              </text>
            </g>
          ))}

          {/* X轴 */}
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="rgb(var(--n-300))"
            strokeWidth="2"
          />
          <text
            x={width / 2}
            y={height - 5}
            textAnchor="middle"
            className="text-[10px] fill-stone-500 font-medium"
          >
            天数（相对首次学习）
          </text>

          {/* Y轴 */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={height - padding.bottom}
            stroke="rgb(var(--n-300))"
            strokeWidth="2"
          />
          <text
            x={padding.left - 30}
            y={height / 2}
            textAnchor="middle"
            className="text-[10px] fill-stone-500 font-medium"
            transform={`rotate(-90 ${padding.left - 30} ${height / 2})`}
          >
            掌握度
          </text>

          {/* 阈值线 */}
          <line
            x1={padding.left}
            y1={yScale(70)}
            x2={width - padding.right}
            y2={yScale(70)}
            stroke="rgb(var(--p-400))"
            strokeWidth="1.5"
            strokeDasharray="6 3"
            opacity="0.6"
          />

          {/* 记忆曲线 */}
          <path
            d={linePath}
            fill="none"
            stroke="rgb(var(--p-500))"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 数据点 */}
          {dataPoints.slice(0, -1).map((p, i) => (
            <circle
              key={i}
              cx={xScale(p.days)}
              cy={yScale(p.score)}
              r="4"
              className="fill-primary-500"
            />
          ))}

          {/* 当前点（特殊样式）*/}
          <circle
            cx={xScale(dataPoints[dataPoints.length - 1].days)}
            cy={yScale(dataPoints[dataPoints.length - 1].score)}
            r="5"
            className="fill-amber-500 stroke-amber-600"
            strokeWidth="2"
          />
        </svg>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="px-3 py-2 rounded-lg bg-primary-50 border border-primary-200">
            <div className="text-stone-500 text-[10px] mb-0.5">当前掌握度</div>
            <div className="font-bold text-primary-600">{Math.round(currentDecayed)}%</div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-stone-50 border border-stone-200">
            <div className="text-stone-500 text-[10px] mb-0.5">测验次数</div>
            <div className="font-bold text-stone-700">{history.length} 次</div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 col-span-2">
            <div className="text-stone-500 text-[10px] mb-0.5">预计下次复习</div>
            <div className="font-bold text-amber-600">
              {daysUntilThreshold > 0 ? `${Math.ceil(daysUntilThreshold)} 天后` : '建议立即复习'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
