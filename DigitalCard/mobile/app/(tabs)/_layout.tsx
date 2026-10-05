import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router/tabs';
import type { IconName } from '@digitalcard/shared/icons';
import { Icon } from '@/components/motion';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';

// Same icons as the web navigation (shared geometry).
const glyph = (name: IconName) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} size={22} color={String(color)} />;
  };

export default function TabsLayout() {
  const { t } = useI18n();
  const th = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: th.primary,
        tabBarInactiveTintColor: th.muted,
        tabBarStyle: { backgroundColor: th.card, borderTopColor: th.border },
        headerStyle: { backgroundColor: th.card },
        headerTitleStyle: { color: th.text },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.card'),
          tabBarLabel: t('tabs.short.card'),
          tabBarIcon: glyph('qr'),
          tabBarAccessibilityLabel: t('tabs.card'),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: t('tabs.scan'),
          tabBarLabel: t('tabs.short.scan'),
          tabBarIcon: glyph('scan'),
          tabBarAccessibilityLabel: t('tabs.scan'),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: t('tabs.contacts'),
          tabBarLabel: t('tabs.short.contacts'),
          tabBarIcon: glyph('users'),
          tabBarAccessibilityLabel: t('tabs.contacts'),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t('tabs.stats'),
          tabBarLabel: t('tabs.short.stats'),
          tabBarIcon: glyph('chart'),
          tabBarAccessibilityLabel: t('tabs.stats'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarLabel: t('tabs.short.settings'),
          tabBarIcon: glyph('settings'),
          tabBarAccessibilityLabel: t('tabs.settings'),
        }}
      />
    </Tabs>
  );
}
