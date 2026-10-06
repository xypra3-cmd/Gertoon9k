// Two-sided card that turns around its vertical axis like a real business card.
// Tap or swipe sideways to flip; the swipe direction decides which way it turns.
// Spring physics on the UI thread (Reanimated), a light haptic at the half-turn,
// and an instant swap when the OS "reduce motion" setting is on.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Animated, { interpolate, useAnimatedReaction, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
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

/**
 * Each face may be a function of the other face's height, so the shorter one can stretch to match.
 * Changing `flipKey` flips the card from outside (e.g. a «QR» button).
 */
export function FlipCard({
  front,
  back,
  label,
  onFlip,
  flipKey = 0,
}: {
  front: ReactNode | ((backHeight: number) => ReactNode);
  back: ReactNode | ((frontHeight: number) => ReactNode);
  label: string;
  onFlip?: (side: 'front' | 'back') => void;
  flipKey?: number;
}) {
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

  // The box follows the visible face's height (smoothly), so a short card leaves no gap below it.
  const boxH = useSharedValue(0);
  useEffect(() => {
    const target = showingBack ? heights.back : heights.front;
    if (!target) return;
    boxH.set(boxH.get() === 0 || reduced ? target : withTiming(target, { duration: 420 }));
  }, [showingBack, heights, reduced, boxH]);
  const boxStyle = useAnimatedStyle(() => (boxH.value > 0 ? { height: boxH.value } : {}));

  const lastKey = useRef(flipKey);
  useEffect(() => {
    if (flipKey === lastKey.current) return;
    lastKey.current = flipKey;
    flip(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only external flip requests
  }, [flipKey]);

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
      <Animated.View style={boxStyle}>
        <Animated.View
          onLayout={onLayout('front')}
          style={[{ position: 'absolute', left: 0, right: 0, top: 0, backfaceVisibility: 'hidden' }, frontStyle]}
          pointerEvents={showingBack ? 'none' : 'auto'}
          importantForAccessibility={showingBack ? 'no-hide-descendants' : 'auto'}
          accessibilityElementsHidden={showingBack}
        >
          {typeof front === 'function' ? front(heights.back) : front}
        </Animated.View>
        <Animated.View
          onLayout={onLayout('back')}
          style={[{ position: 'absolute', left: 0, right: 0, top: 0, backfaceVisibility: 'hidden' }, backStyle]}
          pointerEvents={showingBack ? 'auto' : 'none'}
          importantForAccessibility={showingBack ? 'auto' : 'no-hide-descendants'}
          accessibilityElementsHidden={!showingBack}
        >
          {typeof back === 'function' ? back(heights.front) : back}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
