/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "volt": "rgba(var(--volt-rgb), <alpha-value>)",
        "volt-light": "rgba(var(--volt-light-rgb), <alpha-value>)",
        "void": "rgba(var(--void-rgb), <alpha-value>)",
        "stellar": "rgba(var(--stellar-rgb), <alpha-value>)",
        "graphite": "rgba(var(--graphite-rgb), <alpha-value>)",
        "amethyst": "rgba(var(--amethyst-rgb), <alpha-value>)",
        "amethyst-light": "rgba(var(--amethyst-light-rgb), <alpha-value>)",
        "silver": "rgba(var(--silver-rgb), <alpha-value>)",
        "dim": "rgba(var(--dim-rgb), <alpha-value>)",
        "success": "rgba(var(--success-rgb), <alpha-value>)",
        "danger": "rgba(var(--danger-rgb), <alpha-value>)",
        "info": "rgba(var(--info-rgb), <alpha-value>)",
        "warning": "rgba(var(--warning-rgb), <alpha-value>)",
        "ink": "rgba(var(--ink-rgb), <alpha-value>)",
        "cream": "rgba(var(--cream-rgb), <alpha-value>)",
        "panel": "rgba(var(--panel-rgb), <alpha-value>)",
        "stroke": "rgba(var(--stroke-rgb), <alpha-value>)",
        "muted": "rgba(var(--muted-rgb), <alpha-value>)",
        "test": "#ff0000"
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        serif: ['Fraunces', 'ui-serif', 'Georgia'],
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        'glow-volt': 'var(--shadow-glow-volt)',
        'glow-amethyst': 'var(--shadow-glow-amethyst)',
        'glow-success': 'var(--shadow-glow-success)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'shimmer': 'shimmer 2s linear infinite',
        'blob': 'blob 7s infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      },
    },
  },
  plugins: [],
}
