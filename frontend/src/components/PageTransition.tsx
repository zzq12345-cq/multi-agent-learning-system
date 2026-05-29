/** 页面过渡动画 — 淡入效果 */

import { useEffect, useState } from 'react'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // 下一帧触发动画
    requestAnimationFrame(() => setVisible(true))
    return () => setVisible(false)
  }, [])

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
      }`}
      style={{ minHeight: '100vh' }}
    >
      {children}
    </div>
  )
}
