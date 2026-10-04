import { useColorScheme } from 'react-native';

const light = { bg: '#F8FAFC', card: '#FFFFFF', text: '#0F172A', muted: '#475569', border: '#E2E8F0', primary: '#2557E6', danger: '#B91C1C', success: '#047857', onPrimary: '#FFFFFF' };
const dark = { bg: '#020617', card: '#0F172A', text: '#F1F5F9', muted: '#94A3B8', border: '#1E293B', primary: '#5B85F7', danger: '#F87171', success: '#34D399', onPrimary: '#FFFFFF' };
export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
