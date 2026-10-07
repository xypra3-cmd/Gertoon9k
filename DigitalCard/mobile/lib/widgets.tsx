// Keeps the home-screen widgets (iOS WidgetKit, Android AppWidget) in sync with the user's card.
// iOS reads an App Group (shared UserDefaults); Android re-renders from AsyncStorage.
import { Platform, TurboModuleRegistry } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExtensionStorage } from '@bacons/apple-targets';
import type { WidgetCard } from '@/widgets/CardQrWidget';

export const APP_GROUP = 'group.mn.digitalcard.app';
const WIDGET_CARD_KEY = 'dc.widget.card'; // same key as widgets/task-handler.tsx

export async function syncWidgets(card: WidgetCard | null): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      // No-op in Expo Go (the module falls back to empty functions).
      new ExtensionStorage(APP_GROUP).set('card', card ? JSON.stringify(card) : undefined);
      ExtensionStorage.reloadWidget();
    } else if (Platform.OS === 'android') {
      if (card) await AsyncStorage.setItem(WIDGET_CARD_KEY, JSON.stringify(card));
      else await AsyncStorage.removeItem(WIDGET_CARD_KEY);
      if (!TurboModuleRegistry.get('AndroidWidget')) return;
      const [{ requestWidgetUpdate }, { CardQrWidget }] = await Promise.all([import('react-native-android-widget'), import('@/widgets/CardQrWidget')]);
      await requestWidgetUpdate({ widgetName: 'CardQr', renderWidget: (info) => <CardQrWidget card={card} wide={info.width >= 220} /> });
    }
  } catch {
    // Widgets are a convenience: never break the app over them.
  }
}
