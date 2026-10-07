// NFC business-card tags: write the card link to an NTAG sticker/card once, then any phone that taps
// it opens the card — iPhone (background tag reading) and Android open https links without our app.
// The app can also read a tag to open the card inside the app.
import { NativeModules, Platform } from 'react-native';
import type { TagEvent } from 'react-native-nfc-manager';
import { parseCardLink } from './env';

// The library creates a NativeEventEmitter at import time, which throws when the native module is
// missing (Expo Go). Load it only when the module is really there.
type Lib = typeof import('react-native-nfc-manager');
async function lib(): Promise<Lib> {
  if (!NativeModules.NfcManager) throw new Error('nfc_unsupported');
  return import('react-native-nfc-manager');
}

/** False in Expo Go (no native module), on phones without NFC, or when it is switched off. */
export async function nfcAvailable(): Promise<boolean> {
  try {
    const { default: NfcManager } = await lib();
    return (await NfcManager.isSupported()) && (await NfcManager.start().then(() => true));
  } catch {
    return false;
  }
}

export async function nfcEnabled(): Promise<boolean> {
  try {
    const { default: NfcManager } = await lib();
    return await NfcManager.isEnabled();
  } catch {
    return false;
  }
}

export const openNfcSettings = () =>
  lib()
    .then(({ default: m }) => m.goToNfcSetting())
    .catch(() => false);

export function nfcCancelled(e: unknown): boolean {
  return /cancel|UserCancel|invalidated/i.test(String((e as Error)?.message ?? e));
}

/** Writes a single URI record (the card link). `prompt` is the iOS sheet text. */
export async function writeCardTag(url: string, prompt: string, done: string): Promise<void> {
  const { default: NfcManager, Ndef, NfcTech } = await lib();
  await NfcManager.start();
  try {
    await NfcManager.requestTechnology(NfcTech.Ndef, { alertMessage: prompt });
    await NfcManager.ndefHandler.writeNdefMessage(Ndef.encodeMessage([Ndef.uriRecord(url)]));
    if (Platform.OS === 'ios') await NfcManager.setAlertMessageIOS(done);
  } finally {
    await NfcManager.cancelTechnologyRequest().catch(() => undefined);
  }
}

function cardSlugFromTag(Ndef: Lib['Ndef'], tag: TagEvent | null): string | null {
  for (const record of tag?.ndefMessage ?? []) {
    try {
      const uri = Ndef.uri.decodePayload(Uint8Array.from(record.payload as number[]));
      const slug = parseCardLink(uri);
      if (slug) return slug;
    } catch {
      /* not a URI record */
    }
  }
  return null;
}

/** Reads a tag and returns the card slug, or null when the tag holds something else. */
export async function readCardTag(prompt: string): Promise<string | null> {
  const { default: NfcManager, Ndef, NfcTech } = await lib();
  await NfcManager.start();
  try {
    await NfcManager.requestTechnology(NfcTech.Ndef, { alertMessage: prompt });
    return cardSlugFromTag(Ndef, await NfcManager.getTag());
  } finally {
    await NfcManager.cancelTechnologyRequest().catch(() => undefined);
  }
}
