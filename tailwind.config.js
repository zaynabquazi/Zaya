/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        zaya: {
          black: '#0a0a0a',
          white: '#fafafa',
          gray: {
            50: '#f5f5f5',
            100: '#e5e5e5',
            200: '#d4d4d4',
            300: '#a3a3a3',
            400: '#737373',
            500: '#525252',
            600: '#404040',
            700: '#262626',
            800: '#171717',
            900: '#0a0a0a',
          },
        },
      },
      borderRadius: {
        zaya: '10px',
      },
      boxShadow: {
        zaya: '0 4px 12px rgba(0, 0, 0, 0.08)',
        'zaya-lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
      },
      transitionDuration: {
        zaya: '200ms',
      },
      transitionTimingFunction: {
        zaya: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
