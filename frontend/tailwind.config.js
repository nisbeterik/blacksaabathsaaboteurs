/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base:    '#f4f5f7',
        surface: '#ffffff',
        raised:  '#ffffff',
        hover:   '#eaedf2',
        border:  '#d2d8e0',
        'text-hi':  '#0c234c',
        'text-lo':  '#3a5a80',
        'text-dim': '#6a8aaa',
        'col-blue':  '#1a6bb5',
        'col-green': '#1a9b5e',
        'col-amber': '#a07820',
        'col-red':   '#c01525',
        'col-cyan':  '#1a8fa8',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
