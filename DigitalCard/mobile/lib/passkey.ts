// Native passkeys (iOS AuthenticationServices / Android Credential Manager) on top of Supabase Auth's
// WebAuthn endpoints. Passkeys are shared with the website: same rp_id (the domain) — iOS through
// `webcredentials:` associated domain, Android through Digital Asset Links (`get_login_creds`).
import { Passkey, type PasskeyCreateRequest, type PasskeyGetRequest } from 'react-native-passkey';
import { supabase } from './supabase';

type VerifyCredential = Parameters<typeof supabase.auth.passkey.verifyAuthentication>[0]['credential'];

/** False in Expo Go (no native module) and on devices without passkey support (Android < 9, iOS < 15). */
export function passkeyAvailable(): boolean {
  try {
    return Passkey.isSupported();
  } catch {
    return false;
  }
}

/** The user closing the system sheet is not an error. */
export function passkeyCancelled(e: unknown): boolean {
  const s = `${(e as { error?: string })?.error ?? ''} ${(e as Error)?.message ?? ''}`;
  return /UserCancelled|cancel/i.test(s);
}

export async function signInWithPasskey(): Promise<void> {
  const start = await supabase.auth.passkey.startAuthentication();
  if (start.error) throw start.error;
  const credential = await Passkey.get(start.data.options as unknown as PasskeyGetRequest);
  const { error } = await supabase.auth.passkey.verifyAuthentication({
    challengeId: start.data.challenge_id,
    credential: credential as unknown as VerifyCredential,
  });
  if (error) throw error;
}

export async function addPasskey(): Promise<void> {
  const start = await supabase.auth.passkey.startRegistration();
  if (start.error) throw start.error;
  const credential = await Passkey.create(start.data.options as unknown as PasskeyCreateRequest);
  const { error } = await supabase.auth.passkey.verifyRegistration({
    challengeId: start.data.challenge_id,
    credential: credential as unknown as VerifyCredential,
  });
  if (error) throw error;
}
