import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#EEF4FF',
          100: '#DCE7FE',
          500: '#3B6FF6',
          600: '#2557E6',
          700: '#1D45B8',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
