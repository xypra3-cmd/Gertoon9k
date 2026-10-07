// Sign-in / sign-up / reset screens: a brand gradient hero with two floating glass cards, and a
// rounded sheet with the form that slides over it. Same look on Android and iOS.
import { useEffect, useId, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { palette, radius } from '@digitalcard/shared/design';
import { font } from '@/lib/fonts';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { Appear, Icon } from './motion';

const HERO = 300;

/** A sample business card made of glass: avatar, two text lines and a QR mark. */
function GlassCard({ width, tint }: { width: number; tint: number }) {
  const height = Math.round(width / 1.586);
  return (
    <View
      style={{ width, height, borderRadius: 18, padding: 14, backgroundColor: `rgba(255,255,255,${tint})`, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', justifyContent: 'space-between' }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.85)' }} />
        <Icon name="qr" size={22} color="#FFFFFF" />
      </View>
      <View style={{ gap: 6 }}>
        <View style={{ width: '62%', height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.95)' }} />
        <View style={{ width: '42%', height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.6)' }} />
      </View>
    </View>
  );
}

function Hero({ back }: { back: boolean }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const float = useSharedValue(0);
  useEffect(() => {
    if (!reduced) float.set(withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduced, float]);
  const front = useAnimatedStyle(() => ({ transform: [{ translateY: -6 + float.value * 12 }, { rotate: '-8deg' }] }));
  const backCard = useAnimatedStyle(() => ({ transform: [{ translateY: 6 - float.value * 10 }, { rotate: '7deg' }] }));
  const h = HERO + insets.top;
  const cardW = Math.min(width * 0.52, 240);
  // Unique per screen: login and register can be mounted together in the stack.
  const gradId = `auth-hero-${useId().replace(/:/g, '')}`;

  return (
    <View style={{ height: h, backgroundColor: palette.brand[700] }}>
      <Svg width={width} height={h} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.brand[500]} />
            <Stop offset="0.6" stopColor={palette.brand[700]} />
            <Stop offset="1" stopColor={palette.accent[600]} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={h} fill={`url(#${gradId})`} />
        <Circle cx={width * 0.95} cy={h * 0.12} r={h * 0.45} fill="#FFFFFF" fillOpacity={0.07} />
        <Circle cx={width * 0.05} cy={h * 0.95} r={h * 0.38} fill="#FFFFFF" fillOpacity={0.06} />
      </Svg>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('m.back')}
            onPress={() => router.back()}
            hitSlop={8}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <Icon name="chevronRight" size={20} color="#FFFFFF" />
            </View>
          </Pressable>
        ) : null}
        <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="qr" size={18} color={palette.brand[600]} />
        </View>
        <Text style={{ color: '#FFFFFF', fontSize: 18, letterSpacing: -0.2, ...font('800') }}>Digital Card</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -10 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Animated.View style={[{ position: 'absolute', marginLeft: cardW * 0.35, marginTop: -cardW * 0.18 }, backCard]}>
          <GlassCard width={cardW} tint={0.12} />
        </Animated.View>
        <Animated.View style={[{ marginRight: cardW * 0.2 }, front]}>
          <GlassCard width={cardW} tint={0.22} />
        </Animated.View>
      </View>
    </View>
  );
}

export function AuthLayout({ title, subtitle, back = false, children, footer }: { title: string; subtitle?: string; back?: boolean; children: ReactNode; footer?: ReactNode }) {
  const th = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: th.bg }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" bounces={false} contentContainerStyle={{ flexGrow: 1 }}>
          <Hero back={back} />
          <View
            style={{
              flex: 1,
              marginTop: -28,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              backgroundColor: th.bg,
              paddingHorizontal: 20,
              paddingTop: 26,
              paddingBottom: insets.bottom + 24,
              gap: 14,
            }}
          >
            <Appear>
              <Text accessibilityRole="header" style={{ color: th.text, fontSize: 28, letterSpacing: -0.6, ...font('800') }}>
                {title}
              </Text>
              {subtitle ? <Text style={{ color: th.muted, fontSize: 15, marginTop: 4, lineHeight: 21, ...font('500') }}>{subtitle}</Text> : null}
            </Appear>
            <Appear index={1} style={{ gap: 14 }}>
              {children}
            </Appear>
            {footer ? (
              <Appear index={2} style={{ marginTop: 'auto', paddingTop: 12 }}>
                {footer}
              </Appear>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Text field with a leading icon; `secure` adds a show/hide toggle. */
export function AuthField({ label, icon, secure, hint, ...props }: TextInputProps & { label: string; icon: 'mail' | 'lock' | 'users'; secure?: boolean; hint?: ReactNode }) {
  const th = useTheme();
  const { t } = useI18n();
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: th.muted, fontSize: 13, ...font('600') }}>{label}</Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 52,
          borderRadius: radius.md + 2,
          borderWidth: focused ? 2 : 1,
          borderColor: focused ? th.primary : th.border,
          backgroundColor: th.card,
          paddingHorizontal: focused ? 13 : 14,
          gap: 10,
        }}
      >
        <Icon name={icon} size={18} color={focused ? th.primary : th.muted} />
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={th.muted}
          {...props}
          secureTextEntry={secure ? hidden : props.secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={{ flex: 1, color: th.text, fontSize: 16, paddingVertical: 12, ...font('500') }}
        />
        {secure ? (
          <Pressable accessibilityRole="button" accessibilityLabel={hidden ? t('m.showPassword') : t('m.hidePassword')} onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Icon name={hidden ? 'eye' : 'eyeOff'} size={20} color={th.muted} />
          </Pressable>
        ) : null}
      </View>
      {hint}
    </View>
  );
}

/** 0–3 score: length ≥ 8 with letters and digits is the minimum the server accepts (score 2). */
export function passwordScore(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  const letters = /[a-zA-Zа-яА-ЯөүёӨҮЁ]/.test(pw);
  const digits = /\d/.test(pw);
  if (pw.length < 8 || !letters || !digits) return 1;
  const extra = /[^a-zA-Z0-9а-яА-ЯөүёӨҮЁ]/.test(pw) || /[A-ZА-ЯӨҮЁ]/.test(pw);
  return pw.length >= 12 && extra ? 3 : 2;
}

export function StrengthMeter({ password }: { password: string }) {
  const th = useTheme();
  const { t } = useI18n();
  const score = passwordScore(password);
  const color = [th.border, th.danger, palette.warning[500], th.success][score];
  const label = [t('m.passwordMin'), t('m.pwWeak'), t('m.pwOk'), t('m.pwStrong')][score];
  return (
    <View style={{ gap: 6 }} accessibilityLiveRegion="polite">
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: score >= i ? color : th.border }} />
        ))}
      </View>
      <Text style={{ color: score === 0 ? th.muted : color, fontSize: 12, ...font('600') }}>{label}</Text>
    </View>
  );
}
