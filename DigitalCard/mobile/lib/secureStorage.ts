// Supabase session storage on top of expo-secure-store (Keychain / Keystore).
// SecureStore values should stay under ~2 KB, a session is larger → split into chunks.
import * as SecureStore from 'expo-secure-store';

const CHUNK = 1800;
const safeKey = (k: string) => k.replace(/[^A-Za-z0-9._-]/g, '_');

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const k = safeKey(key);
    const count = await SecureStore.getItemAsync(`${k}__n`);
    if (count === null) return null;
    const parts = await Promise.all(Array.from({ length: Number(count) }, (_, i) => SecureStore.getItemAsync(`${k}__${i}`)));
    if (parts.some((p) => p === null)) return null;
    return parts.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    const k = safeKey(key);
    await this.removeItem(key);
    const chunks = value.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, 'g')) ?? [''];
    await Promise.all(chunks.map((c, i) => SecureStore.setItemAsync(`${k}__${i}`, c)));
    await SecureStore.setItemAsync(`${k}__n`, String(chunks.length));
  },
  async removeItem(key: string): Promise<void> {
    const k = safeKey(key);
    const count = Number((await SecureStore.getItemAsync(`${k}__n`)) ?? 0);
    await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${k}__${i}`)));
    await SecureStore.deleteItemAsync(`${k}__n`);
  },
};
