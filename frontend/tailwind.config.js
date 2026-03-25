/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: '#f1fbfe',
          100: '#d8f3fb',
          200: '#b4e4f6',
          300: '#81cff0',
          400: '#4cb5e7',
          500: '#259bd7',
          600: '#1678b7',
          700: '#155e8f',
          800: '#164f75',
          900: '#153f5c'
        }
      }
    }
  },
  plugins: [],
};
