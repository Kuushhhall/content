/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0e1324',
        cream: '#efe7d7',
        amber: '#b9893b',
        'amber-light': '#d4a94e',
        panel: '#141a2e',
        'panel-hover': '#1a2240',
        stroke: '#2a3457',
        'stroke-light': '#3a4a6f',
        muted: '#a6b0cf',
        'muted-dim': '#6b7599',
        success: '#34d399',
        'success-dim': '#065f46',
        danger: '#f87171',
        'danger-dim': '#7f1d1d',
        info: '#60a5fa',
        'info-dim': '#1e3a5f',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        serif: ['Fraunces', 'ui-serif', 'Georgia'],
      },
      boxShadow: {
        editorial: '0 20px 60px rgba(0,0,0,0.35)',
        'card': '0 4px 24px rgba(0,0,0,0.2)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.3)',
        'glow-amber': '0 0 20px rgba(185,137,59,0.15)',
        'glow-success': '0 0 20px rgba(52,211,153,0.15)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(185,137,59,0.08) 50%, transparent 100%)',
      },
      backgroundSize: {
        'shimmer': '200% 100%',
      },
    },
  },
  plugins: [],
}
