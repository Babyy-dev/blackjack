/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Big Shoulders Display"', '"Arial Narrow"', 'sans-serif'],
        body: ['"DM Sans"', '"Segoe UI"', 'sans-serif'],
      },
      colors: {
        casino: {
          black: 'var(--color-black)',
          white: 'var(--color-white)',
          gold: 'var(--color-gold)',
          red: 'var(--color-red)',
          cyan: 'var(--color-cyan)',
          darkCyan: 'var(--color-dark-cyan)',
        },
      },
      boxShadow: {
        glow: '0 0 25px rgba(255, 217, 0, 0.35)',
      },
      backgroundImage: {
        'casino-radial': 'radial-gradient(circle at top, rgba(255,217,0,0.15), transparent 55%)',
      },
    },
  },
  plugins: [],
}
