// Two-sided card that turns around its vertical axis like a real business card.
// Tap or swipe sideways to flip; the swipe direction decides which way it turns.
// Spring physics on the UI thread (Reanimated), a light haptic at the half-turn,
// and an instant swap when the OS "reduce motion" setting is on.
import { useRef, useState, type ReactNode } from 'react';
import { Pressable, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Animated, { interpolate, useAnimatedReaction, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { haptic } from './motion';

const SPRING = { damping: 16, stiffness: 140, mass: 0.9 };

function faceStyle(a: number) {
  'worklet';
  const norm = ((a % 360) + 360) % 360;
  const visible = norm < 90 || norm > 270;
  // Lift slightly mid-turn so it reads as a physical card.
  const lift = interpolate(Math.abs(Math.sin((a * Math.PI) / 180)), [0, 1], [1, 0.94]);
  return {
    opacity: visible ? 1 : 0,
    zIndex: visible ? 1 : 0,
    transform: [{ perspective: 1400 }, { rotateY: `${a}deg` }, { scale: lift }],
  };
}

/** `front` may be a function of the back face's height, so a shorter front can stretch to match it. */
export function FlipCard({ front, back, label, onFlip }: { front: ReactNode | ((backHeight: number) => ReactNode); back: ReactNode; label: string; onFlip?: (side: 'front' | 'back') => void }) {
  const reduced = useReducedMotion();
  const angle = useSharedValue(0); // degrees, accumulates (…, -180, 0, 180, 360, …)
  const [turns, setTurns] = useState(0);
  const [heights, setHeights] = useState({ front: 0, back: 0 });
  const touch = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const showingBack = Math.abs(turns) % 2 === 1;

  const flip = (dir: 1 | -1) => {
    const next = turns + dir;
    setTurns(next);
    if (reduced) angle.set(next * 180);
    else angle.set(withSpring(next * 180, SPRING));
    onFlip?.(Math.abs(next) % 2 === 1 ? 'back' : 'front');
  };

  // Haptic tick when the edge passes the viewer (the moment the other side appears).
  useAnimatedReaction(
    () => Math.floor((angle.value + 90) / 180),
    (now, prev) => {
      if (prev !== null && now !== prev) scheduleOnRN(haptic.tap);
    },
  );

  const frontStyle = useAnimatedStyle(() => faceStyle(angle.value));
  const backStyle = useAnimatedStyle(() => faceStyle(angle.value + 180));

  const onLayout = (key: 'front' | 'back') => (e: LayoutChangeEvent) => {
    const h = Math.ceil(e.nativeEvent.layout.height);
    setHeights((p) => (p[key] === h ? p : { ...p, [key]: h }));
  };

  const onTouchStart = (e: GestureResponderEvent) => {
    touch.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    swiped.current = false;
  };
  const onTouchEnd = (e: GestureResponderEvent) => {
    const t = touch.current;
    touch.current = null;
    if (!t) return;
    const dx = e.nativeEvent.pageX - t.x;
    const dy = e.nativeEvent.pageY - t.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped.current = true;
      flip(dx > 0 ? 1 : -1);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={showingBack ? 'back' : 'front'}
      onPress={() => {
        if (swiped.current) swiped.current = false;
        else flip(1);
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => (touch.current = null)}
    >
      <View style={{ height: Math.max(heights.front, heights.back) || undefined }}>
        <Animated.View
          onLayout={onLayout('front')}
          style={[{ position: 'absolute', left: 0, right: 0, top: 0, backfaceVisibility: 'hidden' }, frontStyle]}
          importantForAccessibility={showingBack ? 'no-hide-descendants' : 'auto'}
          accessibilityElementsHidden={showingBack}
        >
          {typeof front === 'function' ? front(heights.back) : front}
        </Animated.View>
        <Animated.View
          onLayout={onLayout('back')}
          style={[{ position: 'absolute', left: 0, right: 0, top: 0, backfaceVisibility: 'hidden' }, backStyle]}
          importantForAccessibility={showingBack ? 'auto' : 'no-hide-descendants'}
          accessibilityElementsHidden={!showingBack}
        >
          {back}
        </Animated.View>
      </View>
    </Pressable>
  );
}
