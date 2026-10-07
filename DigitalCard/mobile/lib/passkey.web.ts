// Web build of the app: the browser's own WebAuthn through supabase-js.
import { supabase } from './supabase';

export function passkeyAvailable(): boolean {
  return typeof window !== 'undefined' && 'PublicKeyCredential' in window;
}

export function passkeyCancelled(e: unknown): boolean {
  const s = `${(e as { name?: string })?.name ?? ''} ${(e as { code?: string })?.code ?? ''} ${(e as Error)?.message ?? ''}`;
  return /NotAllowedError|AbortError|ABORTED|cancel/i.test(s);
}

export async function signInWithPasskey(): Promise<void> {
  const { error } = await supabase.auth.signInWithPasskey();
  if (error) throw error;
}

export async function addPasskey(): Promise<void> {
  const { error } = await supabase.auth.registerPasskey();
  if (error) throw error;
}
