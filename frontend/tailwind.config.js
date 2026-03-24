/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0e1324',
        cream: '#efe7d7',
        amber: '#b9893b',
        panel: '#141a2e',
        stroke: '#2a3457',
        muted: '#a6b0cf',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        serif: ['Fraunces', 'ui-serif', 'Georgia'],
      },
      boxShadow: {
        editorial: '0 20px 60px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
}
