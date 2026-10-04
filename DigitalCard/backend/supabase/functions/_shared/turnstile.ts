// Cloudflare Turnstile server-side verification.
import { env } from './http.ts';
import { clientIp } from './visitor.ts';

const DEFAULT_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(token: string | undefined | null, req: Request): Promise<boolean> {
  if (!token || typeof token !== 'string' || token.length > 4096) return false;
  const form = new FormData();
  form.append('secret', env('TURNSTILE_SECRET'));
  form.append('response', token);
  const ip = clientIp(req);
  if (ip) form.append('remoteip', ip);
  try {
    const res = await fetch(Deno.env.get('TURNSTILE_VERIFY_URL') ?? DEFAULT_URL, { method: 'POST', body: form });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.success === true;
  } catch {
    return false;
  }
}
