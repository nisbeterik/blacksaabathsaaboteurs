/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base:    '#080008',
        surface: '#0f0818',
        raised:  '#160d22',
        hover:   '#1e1230',
        border:  '#2d1a3d',
        'text-hi':  '#f0e8f8',
        'text-lo':  '#9b87b0',
        'text-dim': '#6b5080',
        'col-blue':  '#7c3aed',
        'col-green': '#16a34a',
        'col-amber': '#c9a227',
        'col-red':   '#dc2626',
        'col-cyan':  '#a78bfa',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
