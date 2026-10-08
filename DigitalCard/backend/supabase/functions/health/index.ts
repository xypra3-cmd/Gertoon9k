// Uptime probe: GET /functions/v1/health
//   200 {"ok":true,"degraded":false}   database reachable, receipts fine
//   503 {"ok":true,"degraded":true}    a paid payment has no e-barimt (failed, or still pending after 1 h)
//   503 {"ok":false}                   database unreachable
// Public by design (uptime monitors send no auth), so the public answer carries no numbers;
// cron callers (x-cron-secret) also get the counts.
import { isCronRequest, json, preflight } from '../_shared/http.ts';
import { select } from '../_shared/db.ts';
import { allow } from '../_shared/ratelimit.ts';
import { networkHash } from '../_shared/visitor.ts';
import { monitored, reportError } from '../_shared/monitor.ts';

const RECEIPT_GRACE_MS = 60 * 60 * 1000;

Deno.serve(monitored('health', async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'GET' && req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);
  const internal = isCronRequest(req);
  if (!internal && !(await allow(`health:${await networkHash(req)}`, 60, 30))) return json(req, { error: 'rate_limited' }, 429);

  let failed: number;
  let stuck: number;
  try {
    await select<unknown[]>('plans?select=id&limit=1');
    const since = new Date(Date.now() - RECEIPT_GRACE_MS).toISOString();
    failed = (await select<unknown[]>('payments?status=eq.paid&ebarimt_status=eq.failed&select=id&limit=100')).length;
    stuck = (
      await select<unknown[]>(
        `payments?status=eq.paid&ebarimt_status=eq.pending&paid_at=lt.${encodeURIComponent(since)}&select=id&limit=100`,
      )
    ).length;
  } catch (e) {
    await reportError('health', e, { stage: 'db' });
    return json(req, { ok: false }, 503);
  }

  const degraded = failed + stuck > 0;
  const body = internal ? { ok: true, degraded, ebarimt_failed: failed, ebarimt_stuck: stuck } : { ok: true, degraded };
  return json(req, body, degraded ? 503 : 200);
}));
