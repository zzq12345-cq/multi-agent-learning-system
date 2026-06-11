// 多主题系统：主题清单 + 应用/持久化逻辑
// 颜色变量定义在 index.css 的 [data-theme='*'] 块中
export type ThemeId = 'claude' | 'blue' | 'sage' | 'dark'

export interface ThemeMeta {
  id: ThemeId
  name: string
  desc: string
  /** 切换器里的预览色块（主色 → 背景色渐变） */
  swatch: string
}

export const THEMES: ThemeMeta[] = [
  { id: 'claude', name: '暖陶', desc: '奶油纸面 · 陶土橘', swatch: 'linear-gradient(135deg, #D97757 50%, #FAF9F5 50%)' },
  { id: 'blue', name: '清韵', desc: '清爽蓝 · 极简白', swatch: 'linear-gradient(135deg, #3B82F6 50%, #FBFBFA 50%)' },
  { id: 'sage', name: '黛竹', desc: '草木绿 · 宣纸青', swatch: 'linear-gradient(135deg, #74945F 50%, #F8F9F4 50%)' },
  { id: 'dark', name: '暗夜', desc: '暖黑 · 陶土橘', swatch: 'linear-gradient(135deg, #D97757 50%, #21201D 50%)' },
]

const STORAGE_KEY = 'app_theme'
const DEFAULT_THEME: ThemeId = 'claude'

export function getTheme(): ThemeId {
  const saved = localStorage.getItem(STORAGE_KEY)
  return THEMES.some((t) => t.id === saved) ? (saved as ThemeId) : DEFAULT_THEME
}

export function applyTheme(id: ThemeId) {
  document.documentElement.setAttribute('data-theme', id)
  localStorage.setItem(STORAGE_KEY, id)
}
