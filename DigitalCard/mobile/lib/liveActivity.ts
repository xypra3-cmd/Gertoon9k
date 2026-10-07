// iOS Live Activity for Event mode: event name, people met and a countdown on the lock screen and
// in the Dynamic Island while the event runs. No-op on Android, web and in Expo Go.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventActivity } from '../modules/event-activity';

const KEY = 'dc.liveActivity.event';

export interface LiveEvent {
  name: string;
  until: string;
  active: boolean;
  contacts: number;
}

export async function syncEventActivity(ev: LiveEvent | null, metLabel: string): Promise<void> {
  if (Platform.OS !== 'ios' || !EventActivity) return;
  try {
    const id = await AsyncStorage.getItem(KEY);
    if (!ev?.active) {
      if (id) {
        await EventActivity.end(id);
        await AsyncStorage.removeItem(KEY);
      }
      return;
    }
    const until = new Date(ev.until).getTime();
    if (id && (await EventActivity.update(id, until, ev.contacts, metLabel))) return;
    if (!EventActivity.isSupported()) return; // switched off in Settings
    const started = await EventActivity.start(ev.name, until, ev.contacts, metLabel);
    if (started) await AsyncStorage.setItem(KEY, started);
  } catch {
    // Never break Event mode over the lock-screen extra.
  }
}
