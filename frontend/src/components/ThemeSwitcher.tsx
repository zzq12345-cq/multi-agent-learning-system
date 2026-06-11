import { useState } from 'react'
import { Palette, Check } from 'lucide-react'
import { THEMES, getTheme, applyTheme, ThemeId } from '../theme'

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>(getTheme())
  const [open, setOpen] = useState(false)

  const choose = (id: ThemeId) => {
    applyTheme(id)
    setTheme(id)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center text-stone-400 hover:text-stone-800 hover:border-stone-300 transition-all active:scale-95"
        title="切换主题"
        aria-label="切换主题"
      >
        <Palette className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-44 paper-card rounded-xl p-1.5 shadow-lg">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => choose(t.id)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-stone-100 transition-colors text-left cursor-pointer"
              >
                <span
                  className="w-4 h-4 rounded-full border border-stone-200 shrink-0"
                  style={{ background: t.swatch }}
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-medium text-stone-800">{t.name}</span>
                  <span className="block text-[10px] text-stone-400">{t.desc}</span>
                </span>
                {theme === t.id && <Check className="w-3.5 h-3.5 text-primary-500 shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
