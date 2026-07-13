/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fdf4ff',
          100: '#fae8ff',
          200: '#f3d0fe',
          300: '#e9a8fd',
          400: '#d872fa',
          500: '#cb0c9f',
          600: '#a80882',
          700: '#8a056b',
          800: '#720558',
          900: '#5c0447',
        },
        ct: {
          dark:      '#344767',
          secondary: '#8392ab',
          body:      '#f0f2f5',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'ct': '12px',
        'ct-sm': '8px',
        'ct-lg': '16px',
      },
    },
  },
  plugins: [],
}