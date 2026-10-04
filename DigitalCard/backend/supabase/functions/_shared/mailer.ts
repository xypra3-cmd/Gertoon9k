// Sends queued e-mails (public.email_queue). Uses Resend's HTTP API when RESEND_API_KEY is set;
// otherwise mails stay queued (local dev: inspect the email_queue table).
import { logEvent } from './http.ts';
import { patch, select } from './db.ts';

interface QueuedEmail {
  id: number;
  to_email: string;
  kind: 'subscription_expiring' | 'followup_digest' | 'exchange_received' | 'org_invite';
  payload: Record<string, unknown>;
  attempts: number;
}

const APP_URL = () => (Deno.env.get('PUBLIC_APP_URL') ?? 'http://localhost:5173').replace(/\/$/, '');

function render(m: QueuedEmail): { subject: string; text: string } {
  const en = m.payload.locale === 'en';
  switch (m.kind) {
    case 'followup_digest': {
      const list = (m.payload.contacts as { name: string; company?: string; follow_up_at: string }[] | null) ?? [];
      const lines = list.map((c) => `• ${c.name}${c.company ? ` (${c.company})` : ''} — ${c.follow_up_at}`).join('\n');
      return en
        ? { subject: `Today's follow-ups (${list.length})`, text: `People to contact today:\n\n${lines}\n\n${APP_URL()}/app` }
        : { subject: `Өнөөдөр холбогдох (${list.length})`, text: `Өнөөдөр холбогдох хүмүүс:\n\n${lines}\n\n${APP_URL()}/app` };
    }
    case 'subscription_expiring':
      return en
        ? { subject: 'Your Digital Card plan ends soon', text: `Your plan ends on ${m.payload.period_end}. Renew: ${APP_URL()}/app/billing` }
        : { subject: 'Таны багцын хугацаа дуусах гэж байна', text: `Таны багц ${m.payload.period_end}-нд дуусна. Сунгах: ${APP_URL()}/app/billing` };
    case 'exchange_received':
      return {
        subject: `Шинэ холбоо барих мэдээлэл: ${m.payload.name}`,
        text: `${m.payload.name}${m.payload.company ? ` (${m.payload.company})` : ''} таны картаар мэдээллээ үлдээлээ.\n${APP_URL()}/app/contacts`,
      };
    case 'org_invite':
      return {
        subject: `${m.payload.org_name} — Digital Card урилга`,
        text: `Таныг ${m.payload.org_name} байгууллагын Digital Card-д урьж байна.\nБүртгүүлэх / нэвтрэх: ${APP_URL()}/register`,
      };
  }
}

export async function flushEmailQueue(limit = 50, kinds?: QueuedEmail['kind'][]): Promise<number> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) {
    logEvent('mailer', 'disabled_no_api_key');
    return 0;
  }
  const from = Deno.env.get('MAIL_FROM') ?? 'Digital Card <noreply@digitalcard.mn>';
  const kindFilter = kinds?.length ? `&kind=in.(${kinds.join(',')})` : '';
  const queued = await select<QueuedEmail[]>(
    `email_queue?status=eq.queued&attempts=lt.5${kindFilter}&order=created_at.asc&limit=${limit}&select=id,to_email,kind,payload,attempts`,
  );
  let sent = 0;
  for (const m of queued) {
    const { subject, text } = render(m);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [m.to_email], subject, text }),
    });
    if (res.ok) {
      await patch(`email_queue?id=eq.${m.id}`, { status: 'sent', sent_at: new Date().toISOString(), attempts: m.attempts + 1 });
      sent++;
    } else {
      await patch(`email_queue?id=eq.${m.id}`, { attempts: m.attempts + 1, status: m.attempts + 1 >= 5 ? 'failed' : 'queued' });
    }
  }
  logEvent('mailer', 'flushed', { sent, total: queued.length });
  return sent;
}
