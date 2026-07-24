/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        /* Legacy aliases — mapped to corporate palette */
        navy: { DEFAULT: '#222222', light: '#484848', dark: '#111111' },
        coral: { DEFAULT: '#E0394E', light: '#FF5A6E' },
        gold: { DEFAULT: '#717171', light: '#B0B0B0' },
        cream: '#FFFFFF',
        sand: '#F7F7F7',
        /* Corporate tokens */
        ink: { DEFAULT: '#222222', muted: '#717171', subtle: '#B0B0B0' },
        surface: { DEFAULT: '#FFFFFF', muted: '#F7F7F7', border: '#EBEBEB' },
        brand: { DEFAULT: '#E0394E', hover: '#C92F42', soft: '#FFF0F2' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)',
        search: '0 6px 20px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
};
