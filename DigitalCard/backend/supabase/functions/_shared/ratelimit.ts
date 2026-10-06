// Fixed-window rate limits stored in public.rate_buckets (0012_hardening). Keys never contain an IP:
// use networkHash() from visitor.ts or a user id. Fails open on a database error (logged), so a
// limiter outage never takes the product down.
import { logEvent } from './http.ts';
import { rpc } from './db.ts';

export async function allow(key: string, windowSeconds: number, max: number): Promise<boolean> {
  try {
    return await rpc<boolean>('rate_hit', { p_key: key, p_window_seconds: windowSeconds, p_max: max });
  } catch (e) {
    logEvent('ratelimit', 'error', { error: String((e as Error).message) });
    return true;
  }
}
