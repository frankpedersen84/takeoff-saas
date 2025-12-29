/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#FFB81C',
          dark: '#E5A200',
          light: '#FFD470',
        },
        teal: {
          DEFAULT: '#17B2B2',
          dark: '#0E8F8F',
          light: '#4DD4D4',
        },
        bg: {
          primary: '#0A0F1C',
          secondary: '#111827',
          tertiary: '#1F2937',
          card: '#162032',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 184, 28, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 184, 28, 0.5)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
