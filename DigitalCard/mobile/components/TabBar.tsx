// Floating tab bar: rounded glass-like bar, active tab gets a soft pill, the scanner sits in the
// middle as a raised round button (the most used action next to showing your own QR).
import type { ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Tabs } from 'expo-router/tabs';
import type { IconName } from '@digitalcard/shared/icons';
import { font } from '@/lib/fonts';
import { useTheme } from '@/lib/theme';
import { haptic, Icon } from './motion';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICON: Record<string, IconName> = { index: 'qr', contacts: 'users', scan: 'scan', stats: 'chart', settings: 'settings' };

export function TabBar({ state, descriptors, navigation, insets }: TabBarProps) {
  const th = useTheme();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: Math.max(insets.bottom, 10), paddingHorizontal: 14 }}>
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: th.card,
          borderRadius: 28,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: th.border,
          paddingHorizontal: 6,
          height: 66,
          shadowColor: '#0B1220',
          shadowOpacity: 0.14,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          elevation: 12,
        }}
      >
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const opts = descriptors[route.key]?.options;
          const label = typeof opts?.tabBarLabel === 'string' ? opts.tabBarLabel : (opts?.title ?? route.name);
          const onPress = () => {
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) {
              haptic.tap();
              navigation.navigate(route.name, route.params);
            }
          };
          if (route.name === 'scan') {
            return (
              <View key={route.key} style={{ flex: 1, alignItems: 'center' }}>
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={opts?.tabBarAccessibilityLabel ?? label}
                  onPress={onPress}
                  style={({ pressed }) => ({
                    width: 60,
                    height: 60,
                    marginTop: -26,
                    borderRadius: 30,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: th.primary,
                    borderWidth: 4,
                    borderColor: th.bg,
                    transform: [{ scale: pressed ? 0.94 : 1 }],
                    shadowColor: th.primary,
                    shadowOpacity: 0.45,
                    shadowRadius: 14,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 8,
                  })}
                >
                  <Icon name="scan" size={26} color={th.onPrimary} />
                </Pressable>
              </View>
            );
          }
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={opts?.tabBarAccessibilityLabel ?? label}
              onPress={onPress}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}
            >
              <View
                style={{
                  alignItems: 'center',
                  gap: 3,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor: focused ? th.primarySoft : 'transparent',
                }}
              >
                <Icon name={ICON[route.name] ?? 'qr'} size={21} color={focused ? th.primary : th.muted} />
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 11, color: focused ? th.primary : th.muted, ...font(focused ? '700' : '500'), ...(Platform.OS === 'android' ? { includeFontPadding: false } : null) }}
                >
                  {label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
