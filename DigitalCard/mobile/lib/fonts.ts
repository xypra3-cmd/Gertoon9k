// Inter (OFL, full Cyrillic incl. Ө Ү) — one family per weight, because Android ignores
// fontWeight for custom fonts. Use font('700') instead of fontWeight: '700'.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';

export const FONT_ASSETS = { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold };

export type Weight = '400' | '500' | '600' | '700' | '800';
const FAMILY: Record<Weight, keyof typeof FONT_ASSETS> = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
};

export const font = (weight: Weight = '400') => ({ fontFamily: FAMILY[weight] });
