// Motion primitives for the app — same timings/curves as the web (shared design tokens).
// Reanimated runs animations on the UI thread; everything respects the OS "reduce motion" setting.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { easeOutCubic, motion } from '@digitalcard/shared/design';
import { ICONS, type IconName } from '@digitalcard/shared/icons';

const [x1, y1, x2, y2] = motion.easing.out;
export const easeOut = Easing.bezier(x1, y1, x2, y2);

/** Fade + rise on mount, staggered by index (like the web `animate-fade-up`). */
export function Appear({ children, index = 0, style }: { children: ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      entering={
        reduced
          ? undefined
          : FadeInDown.duration(motion.duration.slow)
              .delay(Math.min(index, 12) * motion.stagger)
              .easing(easeOut)
      }
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/** Pressable that springs down slightly and gives a light haptic tick. */
export function PressScale({
  children,
  style,
  haptic = true,
  onPress,
  ...rest
}: PressableProps & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
}) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        if (!reduced) scale.set(withSpring(motion.pressScale, motion.spring));
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, motion.spring));
        rest.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) void Haptics.selectionAsync().catch(() => undefined);
        onPress?.(e);
      }}
    >
      <Animated.View style={[anim, style]}>{children}</Animated.View>
    </Pressable>
  );
}

export const haptic = {
  success: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
  error: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined),
  tap: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined),
};

/** Count-up number (easeOutCubic, same as web). */
export function AnimatedNumber({ value, style }: { value: number; style?: StyleProp<TextStyle> }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  const last = useRef(0);
  useEffect(() => {
    if (reduced) return;
    const start = Date.now();
    const from = last.current;
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / motion.duration.chart);
      const n = Math.round(from + (value - from) * easeOutCubic(t));
      last.current = n;
      setShown(n);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);
  return (
    <Text accessibilityLabel={String(value)} style={[{ fontVariant: ['tabular-nums'] }, style]}>
      {reduced ? value : shown}
    </Text>
  );
}

/** Shared icon set rendered with react-native-svg (same geometry as the web). */
export function Icon({ name, size = 20, color, strokeWidth = 2 }: { name: IconName; size?: number; color: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" accessible={false}>
      {ICONS[name].map(([tag, a], i) =>
        tag === 'path' ? <Path key={i} d={a.d} /> : tag === 'circle' ? <Circle key={i} cx={a.cx} cy={a.cy} r={a.r} /> : <Rect key={i} x={a.x} y={a.y} width={a.width} height={a.height} rx={a.rx} />,
      )}
    </Svg>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Circular progress (0..1) with gradient stroke, animated like the web ring. */
export function ProgressRing({ value, size = 56, stroke = 6, track, label }: { value: number; size?: number; stroke?: number; track: string; label: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    p.set(reduced ? value : withTiming(value, { duration: motion.duration.chart, easing: easeOut }));
  }, [value, reduced, p]);
  const props = useAnimatedProps(() => ({
    strokeDashoffset: c * (1 - p.value),
  }));
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#3B6FF6" />
            <Stop offset="1" stopColor="#8B5CF6" />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke="url(#ring)" strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c}`} animatedProps={props} />
      </Svg>
    </View>
  );
}

/** A bar that grows from 0 to `value` (0..1) of its track; `delay` staggers bars. */
export function GrowBar({
  value,
  color,
  height = 10,
  delay = 0,
  track,
  vertical,
  style,
}: {
  value: number;
  color: string;
  height?: number;
  delay?: number;
  track?: string;
  vertical?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(
      reduced
        ? value
        : withDelay(
            delay,
            withTiming(value, {
              duration: motion.duration.chart,
              easing: easeOut,
            }),
          ),
    );
  }, [value, delay, reduced, v]);
  // vertical: animate pixels of the given track height (percent heights need a sized parent on every platform)
  const fill = useAnimatedStyle(() => (vertical ? { height: v.get() * height } : { width: `${v.get() * 100}%` }));
  if (vertical) {
    return (
      <View style={[{ flex: 1, height, justifyContent: 'flex-end' }, style]}>
        <Animated.View
          style={[
            {
              backgroundColor: color,
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
              minHeight: 2,
            },
            fill,
          ]}
        />
      </View>
    );
  }
  return (
    <View
      style={[
        {
          height,
          borderRadius: height / 2,
          backgroundColor: track,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: color }, fill]} />
    </View>
  );
}
