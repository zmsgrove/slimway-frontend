/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      spacing: {
        'fib-xs': '8px',
        'fib-sm': '13px',
        'fib-md': '21px',
        'fib-lg': '34px',
        'fib-xl': '55px',
        'fib-xxl': '89px',
      }
    }
  },
  plugins: []
}
