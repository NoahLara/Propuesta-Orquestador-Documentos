/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f1f7fc',
          100: '#e0eef9',
          200: '#c0dcf1',
          300: '#90c1e3',
          400: '#5a9fce',
          500: '#3582b3',
          600: '#276795',
          700: '#215479',
          800: '#1c4563',
          900: '#0f3b5f',
          950: '#082642',
        },
        accent: {
          50: '#fff8ed',
          100: '#ffefd4',
          200: '#ffdba8',
          300: '#ffc071',
          400: '#ff9c38',
          500: '#f28500',
          600: '#d97300',
          700: '#b45a02',
          800: '#92470a',
          900: '#783b0c',
        },
        ink: {
          900: '#0b1f33',
          700: '#28425c',
          500: '#536e88',
          400: '#6b8299',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04)',
        lift: '0 12px 32px -16px rgba(15, 23, 42, 0.22)',
        focus: '0 0 0 3px rgba(15, 59, 95, 0.12)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(18px) scale(0.99)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'grow-x': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out both',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
        'grow-x': 'grow-x 0.6s ease-out both',
      },
    },
  },
  plugins: [],
};
