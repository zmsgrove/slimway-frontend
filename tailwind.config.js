/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:   '#02BDB6',
        secondary: '#263CD9',
        accent:        'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-muted': 'var(--accent-muted)',
      },
      spacing: {
        'fib-xs':  '8px',
        'fib-sm':  '13px',
        'fib-md':  '21px',
        'fib-lg':  '34px',
        'fib-xl':  '55px',
        'fib-xxl': '89px',
      },
      borderRadius: {
        'sm': '8px',
        'md': '13px',
        'lg': '21px',
        'xl': '34px',
      },
      fontSize: {
        'xs':   ['11px', { lineHeight: '1.4' }],
        'sm':   ['13px', { lineHeight: '1.5' }],
        'base': ['15px', { lineHeight: '1.6' }],
        'lg':   ['18px', { lineHeight: '1.5' }],
        'xl':   ['21px', { lineHeight: '1.4' }],
        '2xl':  ['34px', { lineHeight: '1.2' }],
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'sans-serif'],
      },
      width: {
        'sidebar': '220px',
      },
      height: {
        'header': '56px',
      },
    }
  },
  plugins: []
}
