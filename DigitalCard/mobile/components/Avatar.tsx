// Initials bubble with a colour that stays the same for the same name (easy to spot in lists).
import { Text, View } from 'react-native';
import { avatarColors } from '@digitalcard/shared/design';
import { font } from '@/lib/fonts';

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = Array.from(words[0] ?? '?');
  const second = Array.from(words[1] ?? '');
  return (words.length > 1 ? `${first[0] ?? ''}${second[0] ?? ''}` : first.slice(0, 2).join('')).toUpperCase();
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  // Solid colour + white initials: ≥ 4.5:1 in light and dark mode (WCAG AA).
  const color = avatarColors[h % avatarColors.length];
  return (
    <View accessible={false} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#FFFFFF', fontSize: size * 0.36, ...font('700') }}>{initialsOf(name)}</Text>
    </View>
  );
}
