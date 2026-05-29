/** WebSocket 连接管理 — Agent 事件流 */

import type { WSEvent } from '../types'
import { useAppStore } from '../stores/useAppStore'

type EventHandler = (event: WSEvent) => void

class AgentWebSocket {
  private ws: WebSocket | null = null
  private url: string
  private handlers: EventHandler[] = []
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(sessionId: string) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    this.url = `${protocol}//${host}/api/chat/ws/${sessionId}`
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url)
      this.ws.onopen = () => {
        useAppStore.getState().setWsConnected(true)
        resolve()
      }
      this.ws.onmessage = (evt) => {
        try {
          const data: WSEvent = JSON.parse(evt.data)
          this.handlers.forEach((h) => h(data))
        } catch { /* 忽略非 JSON */ }
      }
      this.ws.onerror = () => reject(new Error('WebSocket 连接失败'))
      this.ws.onclose = () => {
        useAppStore.getState().setWsConnected(false)
        this.reconnectTimer = setTimeout(() => {
          this.connect().catch(() => {})
        }, 3000)
      }
    })
  }

  send(message: string, llmConfig: { apiKey: string; baseUrl: string; model: string }) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket 未连接')
    }
    // 不发送 api_key，由后端从环境变量读取
    this.ws.send(JSON.stringify({
      message,
      llm_config: {
        base_url: llmConfig.baseUrl,
        model: llmConfig.model,
      },
    }))
  }

  onEvent(handler: EventHandler) {
    this.handlers.push(handler)
    return () => { this.handlers = this.handlers.filter((h) => h !== handler) }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
    this.handlers = []
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export default AgentWebSocket
