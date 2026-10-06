// Anonymous visitor hash: sha256(ip | user_agent | daily_salt). The IP is never stored or logged.
import { env } from './http.ts';

const enc = new TextEncoder();

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Calendar day in Asia/Ulaanbaatar (UTC+8, no DST). */
export function ubDay(d = new Date()): string {
  return new Date(d.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}

async function dailySalt(day: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(env('STATS_SALT_SECRET')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(`visitor-salt:${day}`)));
}

/**
 * Client IP for hashing only. Hosted Supabase sits behind Cloudflare, which overwrites
 * cf-connecting-ip (not spoofable); x-forwarded-for's first hop is the client as seen by the
 * gateway; x-real-ip is last because some local gateways set it to their own address.
 */
export function clientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    ((req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || null) ??
    req.headers.get('x-real-ip') ??
    ''
  );
}

export async function visitorHash(req: Request): Promise<string> {
  const ip = clientIp(req);
  const ua = req.headers.get('user-agent') ?? '';
  const salt = await dailySalt(ubDay());
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(`${ip}|${ua}|${salt}`)));
}

/**
 * Network key for rate limits: HMAC(ip | daily salt) — without the User-Agent, so rotating the UA
 * does not create "new visitors". Rotates daily; the IP itself is never stored or logged.
 */
export async function networkHash(req: Request): Promise<string> {
  const salt = await dailySalt(ubDay());
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(`net|${clientIp(req)}|${salt}`))).slice(0, 32);
}
