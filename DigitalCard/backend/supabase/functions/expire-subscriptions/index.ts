// Cron (daily): expire ended subscriptions, queue 3-days-before reminders, send queued mail.
import { isCronRequest, json, logEvent } from '../_shared/http.ts';
import { rpc } from '../_shared/db.ts';
import { flushEmailQueue } from '../_shared/mailer.ts';
import { monitored } from '../_shared/monitor.ts';

Deno.serve(monitored('expire-subscriptions', async (req) => {
  if (!isCronRequest(req)) return json(req, { error: 'forbidden' }, 403);
  const result = await rpc<{ expired: number; reminders_queued: number }>('expire_subscriptions');
  const sent = await flushEmailQueue(200, ['subscription_expiring']);
  logEvent('expire-subscriptions', 'done', { ...result, sent });
  return json(req, { ...result, sent });
}));
