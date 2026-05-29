import { useState } from 'react'
import { CheckCircle2, XCircle, ChevronRight } from 'lucide-react'

interface QuizQuestion {
  id: string
  question: string
  options: string[]
  answer?: string
}

interface QuizCardProps {
  questions: QuizQuestion[]
  onSubmit: (answers: Record<string, string>) => void
}

export default function QuizCard({ questions, onSubmit }: QuizCardProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const handleSelect = (qId: string, option: string) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [qId]: option }))
  }

  const handleSubmit = () => {
    if (Object.keys(answers).length < questions.length) return
    setSubmitted(true)
    onSubmit(answers)
  }

  const allAnswered = Object.keys(answers).length === questions.length

  return (
    <div className="space-y-4 my-2">
      <div className="flex items-center gap-2 text-blue-600">
        <span className="text-sm font-bold">📝 学习检测</span>
        <span className="text-[10px] text-gray-400">共 {questions.length} 题</span>
      </div>

      {questions.map((q, idx) => {
        const selected = answers[q.id]

        return (
          <div key={q.id} className="p-4 rounded-xl border border-gray-200 bg-white">
            <div className="text-xs font-medium text-gray-900 mb-3">
              <span className="text-blue-500 mr-1.5">{idx + 1}.</span>
              {q.question}
            </div>
            <div className="space-y-2">
              {q.options.map((opt) => {
                const optLetter = opt.charAt(0)
                const isSelected = selected === optLetter
                const isRight = submitted && q.answer === optLetter
                const isWrong = submitted && isSelected && q.answer !== optLetter

                return (
                  <button
                    key={opt}
                    onClick={() => handleSelect(q.id, optLetter)}
                    disabled={submitted}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all ${
                      isRight
                        ? 'border-green-300 bg-green-50 text-green-700'
                        : isWrong
                          ? 'border-red-300 bg-red-50 text-red-700'
                          : isSelected
                            ? 'border-blue-300 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{opt}</span>
                      {isRight && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {isWrong && <XCircle className="w-4 h-4 text-red-500" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          提交答案
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}

      {submitted && (
        <div className="text-center text-[11px] text-gray-500 py-2">
          ✅ 已提交，等待评估师评判...
        </div>
      )}
    </div>
  )
}
