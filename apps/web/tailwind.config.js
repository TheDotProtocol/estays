/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#1a2b4a', light: '#2a3f6a', dark: '#0f1a2e' },
        coral: { DEFAULT: '#e8836b', light: '#f0a090' },
        gold: { DEFAULT: '#c4a35a', light: '#d4b87a' },
        cream: '#faf8f3',
        sand: '#f5f0e8',
      },
    },
  },
  plugins: [],
};
