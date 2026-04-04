/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Background colors
        'bg-primary': 'rgba(var(--bg-primary-rgb), <alpha-value>)',
        'bg-secondary': 'rgba(var(--bg-secondary-rgb), <alpha-value>)',
        'bg-tertiary': 'rgba(var(--bg-tertiary-rgb), <alpha-value>)',

        // Text colors
        'text-primary': 'rgba(var(--text-primary-rgb), <alpha-value>)',
        'text-secondary': 'rgba(var(--text-secondary-rgb), <alpha-value>)',
        'text-tertiary': 'rgba(var(--text-tertiary-rgb), <alpha-value>)',

        // Border colors
        'border-primary': 'rgba(var(--border-primary-rgb), <alpha-value>)',
        'border-secondary': 'rgba(var(--border-secondary-rgb), <alpha-value>)',

        // Accent colors
        'accent-primary': 'rgba(var(--accent-primary-rgb), <alpha-value>)',
        'accent-secondary': 'rgba(var(--accent-secondary-rgb), <alpha-value>)',
        'accent-success': 'rgba(var(--accent-success-rgb), <alpha-value>)',
        'accent-warning': 'rgba(var(--accent-warning-rgb), <alpha-value>)',
        'accent-danger': 'rgba(var(--accent-danger-rgb), <alpha-value>)',

        // App custom palette
        'void': '#0A0A0C',
        'silver': '#F5F5F7',
        'volt': '#00FF9D',
        'cream': '#F9F5E8',
        'amethyst': '#9D4EDD',
        'success': '#00FF9D',
        'graphite': '#2A2A30',
        'dim': '#A0A0AA',
        'stellar': '#C8C8D0',
        'ink': '#17171E',
        'main': '#F5F5F7',
        'muted': '#A0A0AA',
        'danger': '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        serif: ['Playfair Display', 'ui-serif', 'Georgia'],
      },
      borderRadius: {
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        'glow-volt': '0 0 40px rgba(0, 255, 157, 0.3)',
        'glow-amethyst': '0 0 40px rgba(157, 78, 221, 0.3)',
        'glow-success': '0 0 40px rgba(0, 255, 157, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'blob': 'blob 7s infinite',
        'ping': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
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
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blob: {
          '0%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
          '33%': {
            transform: 'translate(30px, -50px) scale(1.1)',
          },
          '66%': {
            transform: 'translate(-20px, 20px) scale(0.9)',
          },
          '100%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
        },
        ping: {
          '75%, 100%': {
            transform: 'scale(2)',
            opacity: '0',
          },
        },
      },
      animationDelay: {
        '2000': '2000ms',
        '4000': '4000ms',
      },
    },
  },
  plugins: [],
}