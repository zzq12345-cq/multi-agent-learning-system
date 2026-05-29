import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './stores/useAppStore'
import HomePage from './pages/HomePage'
import LearningPage from './pages/LearningPage'
import SocialPage from './pages/SocialPage'
import AuthPage from './pages/AuthPage'
import PageTransition from './components/PageTransition'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user)
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<PageTransition><AuthPage /></PageTransition>} />
        <Route path="/" element={<ProtectedRoute><PageTransition><HomePage /></PageTransition></ProtectedRoute>} />
        <Route path="/learn" element={<ProtectedRoute><PageTransition><LearningPage /></PageTransition></ProtectedRoute>} />
        <Route path="/social" element={<ProtectedRoute><PageTransition><SocialPage /></PageTransition></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
