/** @type {import('tailwindcss').Config} */
// 颜色全部映射到 CSS 变量（RGB 三元组），由 index.css 的 [data-theme='*'] 切换主题
const v = (name) => `rgb(var(${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 主题主色（默认暖陶 = Claude 陶土橘 #D97757）
        primary: {
          50: v('--p-50'),
          100: v('--p-100'),
          200: v('--p-200'),
          300: v('--p-300'),
          400: v('--p-400'),
          500: v('--p-500'),
          600: v('--p-600'),
          700: v('--p-700'),
          800: v('--p-800'),
          900: v('--p-900'),
        },
        // 中性色随主题切换（覆盖内置 stone）
        stone: {
          50: v('--n-50'),
          100: v('--n-100'),
          200: v('--n-200'),
          300: v('--n-300'),
          400: v('--n-400'),
          500: v('--n-500'),
          600: v('--n-600'),
          700: v('--n-700'),
          800: v('--n-800'),
          900: v('--n-900'),
        },
        // 面层 token：surface=卡片/弹层，ivory=页面底，cream=次级面板，oat=用户气泡
        surface: v('--surface'),
        ivory: v('--bg'),
        cream: v('--cream'),
        oat: v('--oat'),
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Source Serif 4', 'Noto Serif SC', 'Georgia', 'serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
