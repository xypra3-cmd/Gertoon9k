// Daily 09:00 follow-up reminder (local notification).
// expo-notifications throws on import inside Expo Go on Android (SDK 53+), so it is loaded lazily and
// only outside Expo Go there. Development/production builds are unaffected.
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';

export const remindersSupported = !(Platform.OS === 'android' && isRunningInExpoGo());

export async function setDailyReminder(on: boolean, title: string, body: string): Promise<'ok' | 'denied' | 'unsupported'> {
  if (!remindersSupported) return 'unsupported';
  const Notifications = await import('expo-notifications');
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!on) return 'ok';
  const perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return 'denied';
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 9, minute: 0 },
  });
  return 'ok';
}
