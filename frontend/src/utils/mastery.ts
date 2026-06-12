/** 掌握度遗忘曲线工具 — 公式与后端 app/services/mastery.py 保持一致 */

export const DECAY_RATE = 0.1 // 衰减速率（按天）
export const MIN_MASTERY = 10 // 最低掌握度（不会完全遗忘）
export const REVIEW_THRESHOLD = 70 // 复习阈值（衰减后低于此建议复习）

/** 计算衰减后的掌握度：M(t) = max(MIN, M0 * e^(-λt))，t 以天为单位 */
export function decayedMastery(
  mastery: number,
  lastReviewTs: number,
  nowTs: number = Date.now() / 1000,
): number {
  const days = (nowTs - lastReviewTs) / 86400
  if (days <= 0) return mastery
  const decayed = mastery * Math.exp(-DECAY_RATE * days)
  return Math.max(MIN_MASTERY, Math.round(decayed * 10) / 10)
}

/** 是否需要复习：曾经掌握（≥阈值）但衰减后已低于阈值 */
export function needsReview(
  mastery: number,
  lastReviewTs: number,
  nowTs: number = Date.now() / 1000,
): boolean {
  return mastery >= REVIEW_THRESHOLD && decayedMastery(mastery, lastReviewTs, nowTs) < REVIEW_THRESHOLD
}

/** 距掌握度衰减到复习阈值还有多少天（已低于阈值返回 0） */
export function daysUntilReview(currentMastery: number): number {
  if (currentMastery <= REVIEW_THRESHOLD) return 0
  return Math.log(currentMastery / REVIEW_THRESHOLD) / DECAY_RATE
}
