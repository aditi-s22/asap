/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        charcoal: {
          900: '#14181f', // Admin ops-console base
          800: '#1c2128', // Admin surface/card
          700: '#262c36', // Admin border/divider
        },
        parking: {
          50: '#ecfdf3',
          100: '#d1fae5',
          400: '#22c55e',
          500: '#16a34a', // Primary brand/action color
          600: '#15803d',
          700: '#0f5132',
        },
        accent: {
          400: '#3b9eff',
          500: '#1f7ae0', // Secondary/info, used sparingly
          600: '#1862bb',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
