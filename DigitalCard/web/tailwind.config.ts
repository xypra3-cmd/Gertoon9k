import type { Config } from 'tailwindcss';
import { cssBezier, motion, palette } from '../packages/shared/src/design';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: palette.brand,
        accent: palette.accent,
      },
      transitionTimingFunction: {
        out: cssBezier(motion.easing.out),
        'in-out': cssBezier(motion.easing.inOut),
      },
      transitionDuration: {
        fast: `${motion.duration.fast}ms`,
        base: `${motion.duration.base}ms`,
        slow: `${motion.duration.slow}ms`,
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(.96)' }, to: { opacity: '1', transform: 'none' } },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
        float: { '0%,100%': { transform: 'translateY(0) rotate(-1deg)' }, '50%': { transform: 'translateY(-10px) rotate(1deg)' } },
        pop: { '0%': { transform: 'scale(.6)', opacity: '0' }, '60%': { transform: 'scale(1.08)', opacity: '1' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        'fade-up': `fade-up ${motion.duration.slow}ms ${cssBezier(motion.easing.out)} both`,
        'scale-in': `scale-in ${motion.duration.base}ms ${cssBezier(motion.easing.out)} both`,
        shimmer: 'shimmer 1.6s linear infinite',
        pop: `pop ${motion.duration.slow}ms ${cssBezier(motion.easing.out)} both`,
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,24,40,.04), 0 4px 16px -4px rgba(16,24,40,.08)',
        lift: '0 2px 4px rgba(16,24,40,.05), 0 16px 32px -12px rgba(16,24,40,.18)',
      },
    },
  },
  plugins: [],
} satisfies Config;
