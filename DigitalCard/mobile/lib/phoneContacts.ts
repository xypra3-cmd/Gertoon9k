// Save a business card into the phone's address book using the OS "new contact" form,
// so the user confirms the data themselves (iOS + Android). Cyrillic is passed as-is (UTF-16 strings).
import { Linking } from 'react-native';
import * as Contacts from 'expo-contacts';
import type { CardData } from '@digitalcard/shared/types';

export type SaveResult = 'saved' | 'cancelled' | 'denied';

export async function saveToPhone(card: CardData, publicUrl: string): Promise<SaveResult> {
  const perm = await Contacts.requestPermissionsAsync();
  if (perm.status !== 'granted') return 'denied';
  const created = await Contacts.Contact.presentCreateForm({
    givenName: card.firstName,
    familyName: card.lastName ?? undefined,
    company: card.company ?? undefined,
    jobTitle: card.title ?? undefined,
    phones: card.phone ? [{ label: 'mobile', number: card.phone }] : undefined,
    emails: card.email ? [{ label: 'work', address: card.email }] : undefined,
    urlAddresses: [{ label: 'Digital Card', url: publicUrl }, ...(card.website ? [{ label: 'website', url: card.website }] : [])],
    note: card.bio ?? undefined,
  });
  return created ? 'saved' : 'cancelled';
}

export const openAppSettings = () => Linking.openSettings();
