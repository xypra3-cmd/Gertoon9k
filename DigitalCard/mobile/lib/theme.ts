import { useColorScheme } from 'react-native';
import { colors } from '@digitalcard/shared/design';

// Same tokens as the web app (packages/shared/src/design.ts) → identical look on every platform.
const make = (c: (typeof colors)['light' | 'dark']) => ({
  bg: c.bg,
  card: c.surface,
  cardMuted: c.surfaceMuted,
  text: c.text,
  muted: c.muted,
  subtle: c.subtle,
  border: c.border,
  primary: c.primary,
  primarySoft: c.primarySoft,
  accent: c.accent,
  danger: c.danger,
  success: c.success,
  warning: c.warning,
  onPrimary: c.onPrimary,
});
const light = make(colors.light);
const dark = make(colors.dark);
export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
