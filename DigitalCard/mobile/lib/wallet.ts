// Adds a card to the phone's wallet: Apple Wallet (.pkpass → system «Add Pass» sheet) on iOS,
// a «Save to Google Wallet» link on Android. Passes are built and signed by the wallet-pass function.
import { Linking, Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { env } from './env';
import { supabase } from './supabase';

export type WalletKind = 'apple' | 'google';
export const walletKind: WalletKind | null = Platform.OS === 'ios' ? 'apple' : Platform.OS === 'android' ? 'google' : null;

export class WalletError extends Error {}

export async function addToWallet(cardId: string, slug: string): Promise<void> {
  if (!walletKind) throw new WalletError('unsupported');
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`${env.supabaseUrl}/functions/v1/wallet-pass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: env.supabaseAnonKey, Authorization: `Bearer ${data.session?.access_token ?? ''}` },
    body: JSON.stringify({ card_id: cardId, kind: walletKind }),
  });
  if (!res.ok) throw new WalletError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'failed');

  if (walletKind === 'google') {
    const { url } = (await res.json()) as { url: string };
    await Linking.openURL(url); // Google Wallet app (or the web page) shows «Save»
    return;
  }
  const file = new File(Paths.cache, `${slug}.pkpass`);
  if (file.exists) file.delete();
  file.create();
  file.write(new Uint8Array(await res.arrayBuffer()));
  // iOS recognises the pass type and offers «Add to Apple Wallet».
  await Sharing.shareAsync(file.uri, { mimeType: 'application/vnd.apple.pkpass', UTI: 'com.apple.pkpass' });
}
