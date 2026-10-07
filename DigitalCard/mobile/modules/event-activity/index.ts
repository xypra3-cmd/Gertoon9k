// JS side of the local EventActivity module (iOS only; null on Android, web and in Expo Go).
import { requireOptionalNativeModule } from 'expo';

interface EventActivityNative {
  isSupported(): boolean;
  start(name: string, untilMs: number, contacts: number, metLabel: string): Promise<string | null>;
  update(id: string, untilMs: number, contacts: number, metLabel: string): Promise<boolean>;
  end(id: string | null): Promise<void>;
}

export const EventActivity = requireOptionalNativeModule<EventActivityNative>('EventActivity');
