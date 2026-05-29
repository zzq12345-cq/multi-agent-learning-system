import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './stores/useAppStore'
import HomePage from './pages/HomePage'
import LearningPage from './pages/LearningPage'
import AuthPage from './pages/AuthPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user)
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/learn" element={<ProtectedRoute><LearningPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
