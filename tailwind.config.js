/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors
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
        // Background Layers
        base: '#0A0F1C', // Deepest, main background
        'level-1': '#111827', // Content areas
        'level-2': '#162032', // Cards, elevated surfaces
        'level-3': '#1F2937', // Hover states, interactive elements
        'level-4': '#2D3748', // Active states, popovers

        // Text Colors
        primary: '#F9FAFB', // Headlines, important content
        secondary: '#9CA3AF', // Body text, labels
        muted: '#6B7280', // Placeholders, hints

        // Status Colors
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',

        // Borders
        border: {
          DEFAULT: '#374151',
          active: 'rgba(255, 184, 28, 0.3)',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px', // Badges, tags
        md: '8px', // Inputs, small buttons
        lg: '12px', // Buttons, cards
        xl: '16px', // Feature cards
        '2xl': '24px', // Modals, hero elements
      },
      boxShadow: {
        'glow-gold': '0 0 40px rgba(255, 184, 28, 0.3)',
        'glow-teal': '0 0 40px rgba(23, 178, 178, 0.3)',
        'glow-focus': '0 0 0 3px rgba(255,184,28,0.1)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 184, 28, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 184, 28, 0.5)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
