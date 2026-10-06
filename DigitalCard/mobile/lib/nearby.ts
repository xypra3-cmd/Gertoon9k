// Nearby exchange («Ойртуулах»): two phones swap cards without scanning a QR.
// Bump = accelerometer spike + coarse geohash (≈1 km, never stored long) matched on the server
// within 3 seconds. Code = 6 digits shown on one phone, typed on the other (no location needed).
// The server (0010_nearby.sql) does matching, limits and contact creation; this file only talks to it.
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import { encodeGeohash } from '@digitalcard/shared/geohash';
import { supabase } from './supabase';

export interface NearbyPartner {
  card_id: string;
  slug: string;
  first_name: string;
  last_name: string | null;
  title: string | null;
  company: string | null;
  avatar_path: string | null;
}
export type NearbyResult =
  | { status: 'matched'; partner: NearbyPartner | null; saved: boolean; contact_id?: string; duplicate?: boolean; reason?: string }
  | { status: 'waiting'; pulse_id: string; code?: string; expires_in?: number }
  | { status: 'expired' | 'ambiguous' | 'invalid' | 'card_unavailable' | 'rate_limited' | 'not_found' | 'own_code' };

async function rpc(fn: 'nearby_bump' | 'nearby_poll' | 'nearby_code_create' | 'nearby_code_claim', args: Record<string, string>): Promise<NearbyResult> {
  const { data, error } = await supabase.rpc(fn, args as never);
  if (error) throw error;
  return data as unknown as NearbyResult;
}

let cachedCell: { cell: string; at: number } | null = null;

/** Coarse location cell, or null when permission is denied / location is off. */
export async function currentCell(): Promise<string | null> {
  if (cachedCell && Date.now() - cachedCell.at < 120_000) return cachedCell.cell;
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') return null;
  const pos = (await Location.getLastKnownPositionAsync({ maxAge: 300_000 })) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
  const cell = encodeGeohash(pos.coords.latitude, pos.coords.longitude, 6);
  cachedCell = { cell, at: Date.now() };
  return cell;
}

/** Calls `onBump` when the phone is tapped against something (a short spike above ~1.8 g). */
export function listenForBump(onBump: () => void): () => void {
  let last = 0;
  try {
    Accelerometer.setUpdateInterval(20);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const g = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (Math.abs(g - 1) > 0.8 && now - last > 2500) {
        last = now;
        onBump();
      }
    });
    return () => sub.remove();
  } catch {
    return () => undefined; // no sensor (web preview, some emulators): the «Одоо!» button still works
  }
}

export async function accelerometerAvailable(): Promise<boolean> {
  try {
    return await Accelerometer.isAvailableAsync();
  } catch {
    return false;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Polls a waiting pulse until it matches, expires, or `signal` aborts. */
export async function waitForMatch(pulseId: string, signal: { aborted: boolean }, intervalMs = 700): Promise<NearbyResult> {
  for (;;) {
    if (signal.aborted) return { status: 'expired' };
    await sleep(intervalMs);
    const r = await rpc('nearby_poll', { p_pulse_id: pulseId });
    if (r.status !== 'waiting') return r;
  }
}

export const nearby = {
  bump: (cardId: string, cell: string) => rpc('nearby_bump', { p_card_id: cardId, p_geohash: cell }),
  createCode: (cardId: string) => rpc('nearby_code_create', { p_card_id: cardId }),
  claimCode: (code: string, cardId: string) => rpc('nearby_code_claim', { p_code: code, p_card_id: cardId }),
  undo: async (contactId: string) => {
    const { error } = await supabase.from('contacts').delete().eq('id', contactId);
    if (error) throw error;
  },
};
