import forms from '@tailwindcss/forms'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        elly: {
          surface: 'var(--surface)',
          surfaceStrong: 'var(--surface-strong)',
          surfaceMuted: 'var(--surface-muted)',
          glass: 'var(--glass-surface)',
          text: 'var(--text)',
          muted: 'var(--text-muted)',
          primary: 'var(--primary)',
          primarySoft: 'var(--primary-soft)',
          secondary: 'var(--secondary)',
          accent: 'var(--accent)',
          line: 'var(--line)',
          lineStrong: 'var(--line-strong)',
          success: 'var(--success)',
          successSoft: 'var(--success-soft)',
          warning: 'var(--warning)',
          warningSoft: 'var(--warning-soft)',
          danger: 'var(--danger)',
          dangerSoft: 'var(--danger-soft)',
        },
        // Light theme - Pastel purple and white
        light: {
          bg: '#dbeaff',
          text: '#241b36',
          primary: '#8b5cf6',
          secondary: '#ec8fd6',
          accent: '#517fdc',
          card: 'rgba(255, 255, 255, 0.54)',
          border: 'rgba(101, 94, 176, 0.34)',
        },
        // Dark theme - Neon purple, green, black
        dark: {
          bg: '#0f0f1e',
          text: '#e0d5ff',
          primary: '#a78bfa',
          secondary: '#67e8f9',
          accent: '#f0abfc',
          card: '#1a1a2e',
          border: 'rgba(175, 148, 255, 0.32)',
        },
        purple: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3d0066',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
    },
  },
  plugins: [
    forms,
  ],
}
