// The web build has no NFC (Web NFC exists only in Chrome for Android and is not used here).
export const nfcAvailable = async () => false;
export const nfcEnabled = async () => false;
export const openNfcSettings = async () => false;
export const nfcCancelled = () => true;
export async function writeCardTag(): Promise<void> {
  throw new Error('nfc_unsupported');
}
export async function readCardTag(): Promise<string | null> {
  return null;
}
