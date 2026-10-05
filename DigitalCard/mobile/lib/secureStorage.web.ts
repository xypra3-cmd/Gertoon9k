// Web build of the app is used only for local design previews/screenshots (the product is iOS/Android;
// the real web app lives in /web). Keychain/Keystore do not exist in browsers → sessionStorage.
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    return sessionStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    sessionStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    sessionStorage.removeItem(key);
  },
};
