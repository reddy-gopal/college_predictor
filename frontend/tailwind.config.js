/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        niat: {
          primary: '#991B1B',
          navbar: '#FFF8EB',
          section: '#FBF2F3',
          text: '#1E293B',
          'text-secondary': 'rgba(30,41,59,0.7)',
          border: 'rgba(30,41,59,0.1)',
        },
        // Keep legacy colors for backward compatibility during transition
        primary: {
          DEFAULT: '#991B1B', // NIAT Primary
          light: '#B91C1C',
          dark: '#7F1D1D',
        },
        secondary: {
          DEFAULT: '#7678ed', // Keep for gradients/accents
          light: '#9496f0',
          dark: '#5a5cb8',
        },
        accent: {
          1: '#f7b801', // Amber Flame
          2: '#f18701', // Tiger Orange
          3: '#f35b04', // Cayenne Red
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Fira Sans',
          'Droid Sans',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

