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
        primary: {
          DEFAULT: '#3d348b', // Indigo Velvet
          light: '#5d4fa3',
          dark: '#2d2569',
        },
        secondary: {
          DEFAULT: '#7678ed', // Medium Slate Blue
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

