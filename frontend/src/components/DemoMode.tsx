/** 演示模式 — 剧本时间轴回放（不依赖后端 LLM，对冲现场翻车）
 *
 * 触发方式：URL 参数 ?demo=true，或快捷键 Shift+D 切换。
 * 点击章节按时间轴把剧本 WSEvent 通过 demo-ws-event 喂给 ChatPanel。
 */

import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppStore } from '../stores/useAppStore'
import { DEMO_CHAPTERS, type DemoChapter } from '../demo/demoScript'
import { Zap, Square, User, Compass, GraduationCap } from 'lucide-react'

const CHAPTER_ICONS = [User, Compass, GraduationCap]

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function dispatchPlayback(playing: boolean) {
  window.dispatchEvent(new CustomEvent('demo-playback', { detail: { playing } }))
}

export default function DemoMode() {
  const location = useLocation()
  const [kbVisible, setKbVisible] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  // 取消令牌：切换章节 / 手动停止 / 卸载时自增，使旧回放循环失效
  const playTokenRef = useRef(0)

  const visible = kbVisible || new URLSearchParams(location.search).get('demo') === 'true'

  // Shift+D 切换演示面板（输入框聚焦时不触发，避免干扰打字）
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) setKbVisible((v) => !v)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // 卸载时终止回放，避免悬挂的定时循环继续派发事件
  useEffect(() => () => { playTokenRef.current += 1 }, [])

  // 聊天输入区的停止按钮在回放期间联动停止回放
  useEffect(() => {
    const onStop = () => stopPlayback()
    window.addEventListener('demo-stop', onStop)
    return () => window.removeEventListener('demo-stop', onStop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!visible) return null

  const stopPlayback = () => {
    playTokenRef.current += 1
    setPlayingId(null)
    const store = useAppStore.getState()
    store.setLoading(false)
    store.setActiveAgent(null)
    store.clearStreamingContent()
    dispatchPlayback(false)
  }

  const playChapter = async (chapter: DemoChapter, index: number) => {
    // 真实回复在途（loading 且非回放产生）时拒绝启动，避免两路事件流互踩
    if (useAppStore.getState().isLoading && playingId === null) {
      setHint('请等待当前回复完成后再播放演示')
      setTimeout(() => setHint(null), 2500)
      return
    }
    const token = ++playTokenRef.current
    const store = useAppStore.getState()

    // 第一章从干净状态开始；后续章节在前文基础上续播
    if (index === 0) {
      store.clearMessages()
      store.setNodeStates([])
      store.setLearningPath(null)
      store.setProfile(null)
    }

    setPlayingId(chapter.id)
    dispatchPlayback(true)

    store.addMessage({ id: crypto.randomUUID(), role: 'user', content: chapter.userMessage, timestamp: Date.now() })
    store.setLoading(true)
    store.clearTraces()
    store.clearStreamingContent()

    for (const item of chapter.events) {
      await sleep(item.delay)
      if (playTokenRef.current !== token) return // 已被停止或切换章节
      // done 会复位 loading，下一段 agent 开播前重新点亮加载态
      if (item.event.type === 'agent_start') useAppStore.getState().setLoading(true)
      window.dispatchEvent(new CustomEvent('demo-ws-event', { detail: { ...item.event, timestamp: Date.now() } }))
    }

    if (playTokenRef.current === token) {
      setPlayingId(null)
      dispatchPlayback(false)
    }
  }

  return (
    <div className="p-3 border-b border-stone-200/50 bg-gradient-to-r from-amber-50/50 to-orange-50/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-amber-500" />
          <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">演示剧本</span>
        </div>
        {playingId && (
          <button
            onClick={stopPlayback}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[8px] font-bold hover:bg-amber-600 transition-colors active:scale-95"
            title="停止回放"
          >
            <span className="flex h-1 w-1 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-1 w-1 bg-white" />
            </span>
            回放中
            <Square className="w-2 h-2 fill-white" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {DEMO_CHAPTERS.map((chapter, i) => {
          const Icon = CHAPTER_ICONS[i] || Zap
          const isPlaying = playingId === chapter.id
          return (
            <button
              key={chapter.id}
              onClick={() => playChapter(chapter, i)}
              disabled={isPlaying}
              title={chapter.description}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-center active:scale-95 ${
                isPlaying
                  ? 'border-amber-400 bg-amber-50 cursor-default'
                  : 'border-amber-200/60 bg-surface hover:bg-amber-50 hover:border-amber-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[8px] font-medium text-stone-700">{i + 1}. {chapter.title}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-1.5 text-[8px] text-amber-600/70">
        {hint || '离线剧本回放 · 按章节顺序播放效果最佳'}
      </p>
    </div>
  )
}
