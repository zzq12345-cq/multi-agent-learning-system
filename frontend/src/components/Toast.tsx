import { useEffect } from 'react'
import { CheckCircle2, XCircle, Info } from 'lucide-react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  duration?: number
  onClose: () => void
}

export default function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const icons = { success: CheckCircle2, error: XCircle, info: Info }
  const colors = {
    success: 'bg-green-50 border-green-200 text-green-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-primary-50 border-primary-200 text-primary-700',
  }
  const Icon = icons[type]

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-lg animate-[fadeSlideUp_0.3s_ease-out] ${colors[type]}`}>
      <Icon className="w-4 h-4" />
      <span className="text-xs font-medium">{message}</span>
    </div>
  )
}
