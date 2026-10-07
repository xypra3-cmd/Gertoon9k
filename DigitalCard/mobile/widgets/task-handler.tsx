// Headless task: Android asks for the widget content (added, resized, periodic update).
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { CardQrWidget, type WidgetCard } from './CardQrWidget';

export const WIDGET_CARD_KEY = 'dc.widget.card';

export async function loadWidgetCard(): Promise<WidgetCard | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_CARD_KEY);
    return raw ? (JSON.parse(raw) as WidgetCard) : null;
  } catch {
    return null;
  }
}

export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;
  renderWidget(<CardQrWidget card={await loadWidgetCard()} wide={widgetInfo.width >= 220} />);
}
