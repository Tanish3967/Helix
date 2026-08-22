/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        command: {
          dark: '#0B0F17',
          card: '#111827',
          surface: '#161F30'
        }
      }
    },
  },
  plugins: [],
}
