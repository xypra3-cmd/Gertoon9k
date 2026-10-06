import { Tabs } from 'expo-router/tabs';
import { TabBar } from '@/components/TabBar';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';

// Order = visual order: the scanner is the raised button in the middle.
export default function TabsLayout() {
  const { t } = useI18n();
  const th = useTheme();
  const tab = (key: 'card' | 'contacts' | 'scan' | 'stats' | 'settings') => ({
    title: t(`tabs.${key}`),
    tabBarLabel: t(`tabs.short.${key}`),
    tabBarAccessibilityLabel: t(`tabs.${key}`),
  });
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: th.bg } }}>
      <Tabs.Screen name="index" options={tab('card')} />
      <Tabs.Screen name="contacts" options={tab('contacts')} />
      <Tabs.Screen name="scan" options={tab('scan')} />
      <Tabs.Screen name="stats" options={tab('stats')} />
      <Tabs.Screen name="settings" options={tab('settings')} />
    </Tabs>
  );
}
