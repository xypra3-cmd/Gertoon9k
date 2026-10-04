import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme';

export function Screen({ children, scroll = true, style }: { children: ReactNode; scroll?: boolean; style?: ViewStyle }) {
  const th = useTheme();
  const inner = <View style={[{ padding: 16, gap: 12 }, style]}>{children}</View>;
  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: th.bg }}>
      {scroll ? <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">{inner}</ScrollView> : inner}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const th = useTheme();
  return <View style={[{ backgroundColor: th.card, borderColor: th.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 16, gap: 8 }, style]}>{children}</View>;
}

export function Txt({ children, muted, size = 16, weight, style, selectable }: { children: ReactNode; muted?: boolean; size?: number; weight?: '400' | '600' | '700'; style?: object; selectable?: boolean }) {
  const th = useTheme();
  // fontSize respects Dynamic Type / Android font scale (allowFontScaling defaults to true)
  return (
    <Text selectable={selectable} style={[{ color: muted ? th.muted : th.text, fontSize: size, fontWeight: weight }, style]}>
      {children}
    </Text>
  );
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, accessibilityLabel }: { title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; disabled?: boolean; loading?: boolean; accessibilityLabel?: string }) {
  const th = useTheme();
  const bg = { primary: th.primary, secondary: th.card, danger: th.danger, ghost: 'transparent' }[variant];
  const fg = variant === 'primary' || variant === 'danger' ? th.onPrimary : variant === 'ghost' ? th.primary : th.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled || !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => ({ minHeight: 48, borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, borderWidth: variant === 'secondary' ? 1 : 0, borderColor: th.border, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 })}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: '600', fontSize: 16 }}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const th = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: th.muted, fontSize: 14, fontWeight: '600' }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={th.muted}
        {...props}
        style={{ minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: th.border, paddingHorizontal: 12, color: props.editable === false ? th.muted : th.text, backgroundColor: props.editable === false ? th.bg : th.card, fontSize: 16 }}
      />
      {hint ? <Text style={{ color: th.muted, fontSize: 12 }}>{hint}</Text> : null}
    </View>
  );
}

export function Loading() {
  const th = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: th.bg }}>
      <ActivityIndicator color={th.primary} />
    </View>
  );
}

export function Notice({ text, tone = 'info' }: { text: string; tone?: 'info' | 'error' | 'success' }) {
  const th = useTheme();
  const color = tone === 'error' ? th.danger : tone === 'success' ? th.success : th.muted;
  return (
    <View accessibilityRole="alert" style={{ borderRadius: 12, borderWidth: 1, borderColor: color, padding: 12 }}>
      <Text style={{ color }}>{text}</Text>
    </View>
  );
}
