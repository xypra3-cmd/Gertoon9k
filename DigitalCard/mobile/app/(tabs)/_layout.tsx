import { Text, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router/tabs';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';

const glyph = (g: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return (
      <Text accessible={false} style={{ color, fontSize: 20 }}>
        {g}
      </Text>
    );
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
      <Tabs.Screen name="index" options={{ title: t('tabs.card'), tabBarIcon: glyph('▣'), tabBarAccessibilityLabel: t('tabs.card') }} />
      <Tabs.Screen name="scan" options={{ title: t('tabs.scan'), tabBarIcon: glyph('⌖'), tabBarAccessibilityLabel: t('tabs.scan') }} />
      <Tabs.Screen name="contacts" options={{ title: t('tabs.contacts'), tabBarIcon: glyph('☰'), tabBarAccessibilityLabel: t('tabs.contacts') }} />
      <Tabs.Screen name="stats" options={{ title: t('tabs.stats'), tabBarIcon: glyph('▤'), tabBarAccessibilityLabel: t('tabs.stats') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings'), tabBarIcon: glyph('⚙'), tabBarAccessibilityLabel: t('tabs.settings') }} />
    </Tabs>
  );
}
