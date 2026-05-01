/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
      colors: {
        primary: '#000000',
        // Enhanced dark mode colors
        dark: {
          bg: '#0f172a',
          bgSecondary: '#1e293b',
          bgTertiary: '#334155',
          border: '#475569',
          text: '#f1f5f9',
          textSecondary: '#cbd5e1',
          textTertiary: '#94a3b8',
          accent: '#3b82f6',
          accentHover: '#2563eb',
        }
      },
      // Enhanced dark mode utilities
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
