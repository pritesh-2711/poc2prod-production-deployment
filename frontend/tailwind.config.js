/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base surfaces
        surface: {
          base:    '#0C0E14',   // deepest background
          raised:  '#12151F',   // chat area
          overlay: '#181C2A',   // sidebar
          card:    '#1E2337',   // message cards, inputs
          border:  '#2A2F45',   // subtle dividers
        },
        // Brand / accent
        brand: {
          DEFAULT: '#5B6EF5',   // primary blue-indigo
          dim:     '#3D52D6',   // hover / pressed
          glow:    '#818CF8',   // soft highlights
          muted:   '#1E2337',   // very low emphasis background
        },
        // Text
        ink: {
          primary:   '#F1F5FB',
          secondary: '#8B95B0',
          muted:     '#545E7A',
          inverse:   '#0C0E14',
        },
        // Status
        success: '#34D399',
        warning: '#FBBF24',
        danger:  '#F87171',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'xl2': '1rem',
        '2xl2': '1.25rem',
      },
      animation: {
        'fade-in':  'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'typing': 'typing 1.2s steps(3, end) infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        typing:  { '0%, 100%': { content: '.' }, '33%': { content: '..' }, '66%': { content: '...' } },
      },
    },
  },
  plugins: [],
}
