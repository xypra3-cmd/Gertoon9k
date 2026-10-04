// Cron (daily 09:00 Asia/Ulaanbaatar): one digest e-mail per CRM user with due follow-ups.
// "At most one per user per day" is guaranteed by email_queue.dedupe_key = followup:<user>:<day>.
import { isCronRequest, json, logEvent } from '../_shared/http.ts';
import { rpc } from '../_shared/db.ts';
import { flushEmailQueue } from '../_shared/mailer.ts';
import { ubDay } from '../_shared/visitor.ts';

Deno.serve(async (req) => {
  if (!isCronRequest(req)) return json(req, { error: 'forbidden' }, 403);
  const day = ubDay();
  const queued = await rpc<number>('queue_followup_digests', { p_day: day });
  const sent = await flushEmailQueue(500, ['followup_digest']);
  logEvent('followup-digest', 'done', { day, queued, sent });
  return json(req, { day, queued, sent });
});
