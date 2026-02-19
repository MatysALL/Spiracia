/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Medieval Sharp"', 'cursive'],
        body: ['"Nunito"', 'sans-serif'],
      },
      colors: {
        stone: {
          850: '#1c1917',
          950: '#0c0a09',
        },
        parchment: '#f5e6d3',
        tavern: '#8b4513',
        gold: '#d4af37',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
