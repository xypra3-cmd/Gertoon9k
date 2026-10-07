import type { CardFields } from '@digitalcard/shared/cardText';

export const ocrAvailable = (): boolean => false;
export async function readCardOnDevice(_uri: string): Promise<CardFields | null> {
  return null;
}
