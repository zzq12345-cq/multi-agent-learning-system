import { useState } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { Key, Globe, Cpu, Settings2, X } from 'lucide-react'

export default function SettingsModal() {
  const { llmConfig, setLlmConfig, setShowSettings } = useAppStore()
  const [form, setForm] = useState({ ...llmConfig })

  const handleSave = () => {
    setLlmConfig(form)
    setShowSettings(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/15 backdrop-blur-sm">
      <div className="bg-white border border-zinc-200 shadow-[0_20px_50px_rgba(0,0,0,0.04)] rounded-2xl w-full max-w-md p-6 mx-4 relative overflow-hidden">
        
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-zinc-50 border border-zinc-200 text-zinc-600 rounded-lg">
              <Settings2 className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-zinc-900">LLM 引擎参数配置</h3>
          </div>
          <button 
            onClick={() => setShowSettings(false)}
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg transition-colors hover:bg-zinc-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <p className="text-[9px] text-zinc-400 mb-6 leading-relaxed">
          配置你的大语言模型 API。支持 DeepSeek、OpenAI 等标准兼容接口。密钥保存在你浏览器的本地缓存中，不会泄露给任何第三方。
        </p>

        <div className="space-y-4.5">
          <div>
            <label className="flex items-center gap-1.5 text-[9px] font-bold tracking-wider uppercase text-zinc-500 mb-1.5">
              <Key className="w-3 h-3 text-zinc-400" />
              API Key *
            </label>
            <input
              type="password"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder="请输入 sk-..."
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-900/40 focus:bg-white transition-all duration-200"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[9px] font-bold tracking-wider uppercase text-zinc-500 mb-1.5">
              <Globe className="w-3 h-3 text-zinc-400" />
              Base URL
            </label>
            <input
              type="text"
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              placeholder="https://api.deepseek.com/v1"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-900/40 focus:bg-white transition-all duration-200"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[9px] font-bold tracking-wider uppercase text-zinc-500 mb-1.5">
              <Cpu className="w-3 h-3 text-zinc-400" />
              模型选择
            </label>
            <div className="relative">
              <select
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-zinc-900/40 focus:bg-white transition-all duration-200 appearance-none"
              >
                <option value="deepseek-chat" className="bg-white">DeepSeek Chat</option>
                <option value="deepseek-reasoner" className="bg-white">DeepSeek Reasoner</option>
                <option value="gpt-4o" className="bg-white">GPT-4o</option>
                <option value="gpt-4o-mini" className="bg-white">GPT-4o Mini</option>
                <option value="qwen-plus" className="bg-white">通义千问 Plus</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
                <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={() => setShowSettings(false)}
            className="flex-1 px-4 py-2.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-all duration-200 active:scale-95"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!form.apiKey}
            className="flex-1 px-4 py-2.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed active:scale-95"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  )
}
