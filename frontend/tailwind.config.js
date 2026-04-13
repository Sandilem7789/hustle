/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* Hustle Economy brand palette — sourced from the logo wordmark */
        hustle: {
          yellow:  '#F5B800',
          teal:    '#00A896',
          purple:  '#8B2FC9',
          pink:    '#E91E8C',
          green:   '#2DB344',
          orange:  '#F06820',
          blue:    '#1B6FD4',
          red:     '#E53935',
          cream:   '#FFFBF0',
          warm:    '#F5F0E8',
          dark:    '#1C1917',
        }
      },
      borderRadius: {
        sm:   '8px',
        md:   '14px',
        lg:   '20px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(28, 25, 23, 0.08)',
        'card-hover': '0 6px 24px rgba(28, 25, 23, 0.14)',
        nav: '0 -3px 16px rgba(28, 25, 23, 0.07)',
      }
    }
  },
  plugins: [],
};
