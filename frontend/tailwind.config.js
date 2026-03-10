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
          DEFAULT: 'rgb(var(--canvas) / <alpha-value>)',
          50: 'rgb(var(--canvas-50) / <alpha-value>)',
          100: 'rgb(var(--canvas-100) / <alpha-value>)',
          200: 'rgb(var(--canvas-200) / <alpha-value>)',
          300: 'rgb(var(--canvas-300) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          hover: 'rgb(var(--surface-hover) / <alpha-value>)',
          border: 'var(--surface-border)',
          'border-hover': 'var(--surface-border-hover)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          dim: 'rgb(var(--accent-dim) / <alpha-value>)',
          glow: 'var(--accent-glow)',
          'glow-strong': 'var(--accent-glow-strong)',
        },
        soil: {
          DEFAULT: 'rgb(var(--soil) / <alpha-value>)',
          dim: 'rgb(var(--soil-dim) / <alpha-value>)',
          glow: 'var(--soil-glow)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          dim: 'rgb(var(--danger-dim) / <alpha-value>)',
          glow: 'var(--danger-glow)',
        },
        text: {
          DEFAULT: 'rgb(var(--text) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
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
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        glow: 'var(--shadow-glow)',
        'glow-accent': 'var(--shadow-glow-accent)',
        'glow-danger': 'var(--danger-glow-shadow)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'modal-slide-up': 'modalSlideUp 0.3s ease-out',
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
        modalSlideUp: {
          '0%': { opacity: '0', transform: 'translate(-50%, calc(-50% + 12px))' },
          '100%': { opacity: '1', transform: 'translate(-50%, -50%)' },
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
