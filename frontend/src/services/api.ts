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

/** 历史会话列表（按更新时间倒序） */
export async function listHistorySessions(userId: string) {
  const res = await fetch(`${BASE_URL}/history/sessions?user_id=${encodeURIComponent(userId)}`)
  if (!res.ok) return []
  const data = await res.json()
  return data.sessions || []
}

/** 读取单条历史会话完整内容（直接读磁盘，后端重启后依然可用） */
export async function getHistorySession(sessionId: string) {
  const res = await fetch(`${BASE_URL}/history/sessions/${sessionId}`)
  if (!res.ok) return null
  return res.json()
}

export async function deleteSession(sessionId: string) {
  const res = await fetch(`${BASE_URL}/chat/sessions/${sessionId}`, { method: 'DELETE' })
  return res.ok
}

export async function listGraphs() {
  const res = await fetch('/api/learning/graphs')
  if (!res.ok) return []
  const data = await res.json()
  return data.graphs || []
}

export async function getGraphByDomain(domain: string) {
  const res = await fetch(`/api/learning/graphs/${domain}`)
  if (!res.ok) return null
  return res.json()
}

export async function listSubjects() {
  const res = await fetch('/api/subjects')
  if (!res.ok) return []
  const data = await res.json()
  return data.subjects || []
}

export async function uploadDoc(domain: string, file: File) {
  const token = localStorage.getItem('auth_token') || ''
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`/api/subjects/${domain}/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || '上传失败')
  }
  return res.json()
}

export async function getDomainDocs(domain: string) {
  const res = await fetch(`/api/subjects/${domain}/docs`)
  if (!res.ok) return []
  const data = await res.json()
  return data.docs || []
}

export async function deleteDomainDoc(domain: string, filename: string) {
  const token = localStorage.getItem('auth_token') || ''
  const res = await fetch(`/api/subjects/${domain}/docs/${filename}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  })
  return res.ok
}
