/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f4f6f3',
          100: '#e8ece5',
          200: '#d1d9cb',
          300: '#bac6b1',
          400: '#a3b397',
          500: '#8ca07d',
          600: '#596A4A',
          700: '#475539',
          800: '#354028',
          900: '#232b17',
        },
      },
    },
  },
  plugins: [],
}

