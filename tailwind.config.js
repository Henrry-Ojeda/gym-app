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
          DEFAULT: '#b4ff39', // Lime
          dark: '#8ed92b',
        },
        dark: {
          900: '#000000',
          800: '#121212',
          700: '#1e1e1e',
          600: '#2a2a2a',
        }
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
