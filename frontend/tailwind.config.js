/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#0c1117',
          50: '#111920',
          100: '#161f28',
          200: '#1c2732',
          300: '#24303d',
        },
        surface: {
          DEFAULT: '#182028',
          hover: '#1e2a34',
          border: 'rgba(148, 163, 184, 0.10)',
          'border-hover': 'rgba(148, 163, 184, 0.22)',
        },
        accent: {
          DEFAULT: '#34d399',
          dim: '#10b981',
          glow: 'rgba(52, 211, 153, 0.12)',
          'glow-strong': 'rgba(52, 211, 153, 0.25)',
        },
        soil: {
          DEFAULT: '#d97706',
          dim: '#b45309',
          glow: 'rgba(217, 119, 6, 0.12)',
        },
        danger: {
          DEFAULT: '#f87171',
          dim: '#ef4444',
          glow: 'rgba(248, 113, 113, 0.12)',
        },
        text: {
          DEFAULT: '#e8edf3',
          secondary: '#8899a6',
          muted: '#5c6f7e',
        },
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'Menlo', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        card: '0 2px 16px rgba(0, 0, 0, 0.35)',
        'card-hover': '0 4px 24px rgba(0, 0, 0, 0.45)',
        glow: '0 0 24px rgba(52, 211, 153, 0.08)',
        'glow-accent': '0 0 32px rgba(52, 211, 153, 0.15)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
