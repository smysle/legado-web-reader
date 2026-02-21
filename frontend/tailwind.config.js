/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sepia: {
          50: '#fdf8f0',
          100: '#f5e6d3',
          200: '#e8d0b3',
          300: '#d4b48a',
          400: '#c49b6b',
          500: '#b08050',
          600: '#96673e',
          700: '#7a5234',
          800: '#5e3f2a',
          900: '#4a3323',
        },
      },
    },
  },
  plugins: [],
}
