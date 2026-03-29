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
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
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
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
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
      },
    },
  },
  plugins: [],
}