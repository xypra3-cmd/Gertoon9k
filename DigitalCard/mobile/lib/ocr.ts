// On-device text recognition (Google ML Kit, Android + iOS): reads a business-card photo with no
// network and no upload. ML Kit's on-device model covers Latin script and digits — phones, e-mails,
// websites and Latin names; Cyrillic names are refined by the server AI when the phone is online.
import { NativeModules } from 'react-native';
import { parseCardText, type CardFields } from '@digitalcard/shared/cardText';

export const ocrAvailable = (): boolean => !!NativeModules.TextRecognition;

export async function readCardOnDevice(uri: string): Promise<CardFields | null> {
  if (!ocrAvailable()) return null;
  const { default: TextRecognition } = await import('@react-native-ml-kit/text-recognition');
  const { text } = await TextRecognition.recognize(uri);
  const fields = parseCardText(text);
  return Object.values(fields).some(Boolean) ? fields : null;
}
