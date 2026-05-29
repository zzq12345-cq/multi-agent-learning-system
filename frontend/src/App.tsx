import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LearningPage from './pages/LearningPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/learn" element={<LearningPage />} />
      </Routes>
    </BrowserRouter>
  )
}
