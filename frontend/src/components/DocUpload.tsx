import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { uploadDoc, getDomainDocs, deleteDomainDoc } from '../services/api'
import { Upload, FileText, Trash2 } from 'lucide-react'

export default function DocUpload() {
  const { learningPath } = useAppStore()
  const [docs, setDocs] = useState<{ filename: string; size: number }[]>([])
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const domain = learningPath?.domain || ''

  useEffect(() => {
    if (domain) {
      getDomainDocs(domain).then(setDocs)
    }
  }, [domain])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !domain) return

    setUploading(true)
    setMessage('')
    try {
      await uploadDoc(domain, file)
      setMessage(`✅ ${file.name} 已加入知识库`)
      getDomainDocs(domain).then(setDocs)
    } catch (err) {
      setMessage(`❌ ${err instanceof Error ? err.message : '上传失败'}`)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (filename: string) => {
    if (await deleteDomainDoc(domain, filename)) {
      setDocs(docs.filter(d => d.filename !== filename))
    }
  }

  if (!domain) {
    return (
      <div className="h-full flex items-center justify-center text-center px-6">
        <div>
          <Upload className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
          <p className="text-[10px] text-zinc-500">选择学科后可上传学习资料</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#f7f7f5]">
      {/* 上传区域 */}
      <div className="p-4 border-b border-zinc-200/50">
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-zinc-200 rounded-xl p-4 text-center cursor-pointer hover:border-zinc-400 hover:bg-white transition-all"
        >
          <Upload className="w-5 h-5 text-zinc-400 mx-auto mb-2" />
          <p className="text-[10px] text-zinc-500 font-medium">
            {uploading ? '上传中...' : '点击上传学习资料'}
          </p>
          <p className="text-[8px] text-zinc-400 mt-1">支持 PDF / Word / Markdown / TXT（≤10MB）</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.md,.txt,.markdown"
          onChange={handleUpload}
          className="hidden"
        />
        {message && (
          <p className={`text-[9px] mt-2 ${message.startsWith('✅') ? 'text-emerald-600' : 'text-red-500'}`}>
            {message}
          </p>
        )}
      </div>

      {/* 文档列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
          已上传 ({docs.length})
        </div>
        {docs.length === 0 ? (
          <p className="text-[9px] text-zinc-400">暂无文档，上传后 AI 将参考这些资料生成内容</p>
        ) : (
          <div className="space-y-1.5">
            {docs.map((doc) => (
              <div key={doc.filename} className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-zinc-200/60 bg-white">
                <FileText className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-zinc-700 font-medium truncate">{doc.filename}</p>
                  <p className="text-[8px] text-zinc-400">{(doc.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={() => handleDelete(doc.filename)}
                  className="p-1 text-zinc-300 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
