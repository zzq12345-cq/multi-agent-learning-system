/** API 服务层 */

import type { ChatResponse } from '../types'

const BASE_URL = '/api'

export async function sendMessage(
  message: string,
  sessionId: string,
): Promise<ChatResponse> {
  const res = await fetch(`${BASE_URL}/chat/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '请求失败' }))
    throw new Error(err.detail || `API error: ${res.status}`)
  }
  return res.json()
}

export async function getPythonGraph() {
  const res = await fetch(`${BASE_URL}/chat/knowledge/python`)
  if (!res.ok) return null
  return res.json()
}

export async function getSession(sessionId: string) {
  const res = await fetch(`${BASE_URL}/chat/sessions/${sessionId}`)
  if (!res.ok) return null
  return res.json()
}
