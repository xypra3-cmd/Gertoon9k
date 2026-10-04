// Dependency-free calls used by the public card page (keeps its bundle small: no supabase-js).
import type { Plan, PublicCard } from '@digitalcard/shared/types';
import { env, functionsUrl } from './env';

const headers = () => ({ apikey: env.supabaseAnonKey, Authorization: `Bearer ${env.supabaseAnonKey}` });

/** Access token of a signed-in user (if any) without loading supabase-js. */
export function storedAccessToken(): string | null {
  try {
    const raw = localStorage.getItem('dc-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { access_token?: string; expires_at?: number };
    if (!parsed.access_token || (parsed.expires_at && parsed.expires_at * 1000 < Date.now())) return null;
    return parsed.access_token;
  } catch {
    return null;
  }
}

export async function fetchPublicCard(slug: string): Promise<PublicCard | null> {
  const res = await fetch(`${env.supabaseUrl}/rest/v1/public_cards?slug=eq.${encodeURIComponent(slug)}&select=*`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error('fetch_failed');
  const rows = (await res.json()) as PublicCard[];
  return rows[0] ?? null;
}

export async function fetchPlans() {
  const res = await fetch(`${env.supabaseUrl}/rest/v1/plans?select=*&order=price_mnt.asc`, { headers: headers() });
  if (!res.ok) throw new Error('fetch_failed');
  return (await res.json()) as Plan[];
}

export type TrackEvent = 'view' | 'qr_open' | 'link_click' | 'contact_save';

/** Fire-and-forget analytics. Uses keepalive so link clicks are recorded during navigation. */
export function trackEvent(slug: string, event: TrackEvent, linkKind?: string): void {
  const token = storedAccessToken();
  try {
    void fetch(`${functionsUrl}/track-event`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ slug, event, link_kind: linkKind ?? null }),
    }).catch(() => undefined);
  } catch {
    /* analytics must never break the page */
  }
}

export interface ExchangePayload {
  slug: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  title?: string;
  message?: string;
  consent: boolean;
  turnstile_token: string;
}

export async function submitExchange(
  payload: ExchangePayload,
): Promise<{ status: string; owner_first_name?: string | null }> {
  const res = await fetch(`${functionsUrl}/contact-exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  try {
    return (await res.json()) as { status: string; owner_first_name?: string | null };
  } catch {
    return { status: 'generic' };
  }
}
