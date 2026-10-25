/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Noto Sans SC"', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'sans-serif'],
      },
      colors: {
        paper: {
          50: '#faf8f5',    // 暖米色纸质感主底色 (Light mode primary)
          100: '#f5f2ec',   // 纸质浅层背景 / 悬浮
          200: '#e8e4dc',   // 纸质柔和边框
          300: '#d7d1c5',   // 分割线
          400: '#a8a29e',   // 辅助说明文字
          500: '#78716c',   // 次要文字
          700: '#44403c',   // 加深强调
          800: '#292524',   // 深色背景次层
          850: '#221f1d',
          900: '#1c1918',   // 暗黑模式卡片表面色 (Dark mode surface)
          950: '#141413',   // 暗黑模式主底色 (Dark mode background)
        },
      },
    },
  },
  plugins: [],
}
