/** 智能复习提醒 — 基于遗忘曲线的主动推送 */

import { useState, useMemo } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { Brain, X, RefreshCw } from 'lucide-react'
import { decayedMastery, needsReview } from '../utils/mastery'

export default function ReviewReminder() {
  const { masteryData, learningPath } = useAppStore()
  const [dismissed, setDismissed] = useState(false)

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
        const currentMastery = Math.round(decayedMastery(data.mastery, data.last_review_ts || now, now))
        return { id: node.id, name: node.name, currentMastery, originalMastery: Math.round(data.mastery) }
      })
      .slice(0, 3)
  }, [masteryData, learningPath])

  if (dismissed || reviewNodes.length === 0) return null

  const handleReview = (nodeName: string) => {
    window.dispatchEvent(new CustomEvent('graph-send-message', {
      detail: { message: `请为「${nodeName}」生成 2-3 道快速测验题` }
    }))
    setDismissed(true)
  }

  return (
    <div className="mx-4 mt-3 p-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 animate-[fadeSlideUp_0.3s_ease-out]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
            <Brain className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <span className="text-xs font-bold text-amber-800">今日复习建议</span>
            <p className="text-[10px] text-amber-600">以下知识点掌握度正在衰减</p>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {reviewNodes.map(node => (
          <button
            key={node.id}
            onClick={() => handleReview(node.name)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface border border-amber-100 hover:border-amber-300 transition-all text-left"
          >
            <div>
              <span className="text-[11px] font-medium text-stone-800">{node.name}</span>
              <span className="text-[9px] text-amber-500 ml-2">{node.originalMastery}% → {node.currentMastery}%</span>
            </div>
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
          </button>
        ))}
      </div>
    </div>
  )
}
