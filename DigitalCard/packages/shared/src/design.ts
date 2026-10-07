// Design tokens shared by web (Tailwind + CSS variables) and mobile (React Native theme).
// One source → web, Android and iOS look and move the same.

export const palette = {
  brand: { 50: '#EEF3FF', 100: '#DCE6FE', 200: '#BCCFFD', 400: '#6F93F9', 500: '#3B6FF6', 600: '#2557E6', 700: '#1D45B8', 900: '#152E73' },
  accent: { 500: '#8B5CF6', 600: '#7C3AED' },
  success: { 500: '#10B981', 700: '#047857' },
  warning: { 500: '#F59E0B', 700: '#B45309' },
  danger: { 500: '#EF4444', 700: '#B91C1C' },
} as const;

export const colors = {
  light: {
    bg: '#F7F8FA',
    surface: '#FFFFFF',
    surfaceMuted: '#F1F3F7',
    text: '#0B1220',
    muted: '#4B5563',
    subtle: '#8A94A6',
    border: '#E5E8EF',
    primary: palette.brand[600],
    primarySoft: palette.brand[50],
    onPrimary: '#FFFFFF',
    accent: palette.accent[600],
    success: palette.success[700],
    warning: palette.warning[700],
    danger: palette.danger[700],
  },
  dark: {
    bg: '#070B14',
    surface: '#0F1522',
    surfaceMuted: '#161D2C',
    text: '#EEF2F8',
    muted: '#A3ADBF',
    subtle: '#6B7486',
    border: '#1F2737',
    primary: palette.brand[400],
    primarySoft: '#14204A',
    onPrimary: '#0B1220', // dark text on brand-400: 6.4:1 (white was 2.9:1, below WCAG AA)
    accent: palette.accent[500],
    success: palette.success[500],
    warning: palette.warning[500],
    danger: '#F87171',
  },
} as const;

export type ColorTokens = { [K in keyof (typeof colors)['light']]: string };

/** Chart series colors (same order on web and mobile). */
/** Initials bubbles with white text: every colour ≥ 4.5:1 against #FFFFFF (WCAG AA). */
export const avatarColors = ['#2557E6', '#7C3AED', '#047857', '#B45309', '#BE123C', '#0E7490'] as const;

export const chartColors = [palette.brand[500], palette.accent[500], palette.success[500], palette.warning[500], '#EC4899'] as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 } as const;
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 } as const;

/** Motion: short, springy, never blocking. Both platforms skip motion when the OS asks for reduced motion. */
export const motion = {
  duration: { instant: 90, fast: 160, base: 240, slow: 420, chart: 900 },
  /** cubic-bezier for CSS; mobile uses the same curve via Easing.bezier */
  easing: { out: [0.22, 1, 0.36, 1] as const, inOut: [0.65, 0, 0.35, 1] as const },
  spring: { damping: 18, stiffness: 220, mass: 0.9 },
  /** delay between list items when they appear */
  stagger: 45,
  /** pressed buttons/cards scale to this */
  pressScale: 0.97,
} as const;

export const cssBezier = (b: readonly number[]) => `cubic-bezier(${b.join(',')})`;

/** Count-up easing used by animated numbers on both platforms (easeOutCubic). */
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
