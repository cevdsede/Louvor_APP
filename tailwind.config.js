/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1e3a8a',
          accent: '#eab308',
          navy: '#1e3a8a',
          gold: '#eab308'
        },
        'brand-gold': '#eab308'
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem'
      },
      animation: {
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-delay-150': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.15s',
        'pulse-delay-300': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.3s'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' }
        }
      }
    },
  },
  plugins: [],
}
