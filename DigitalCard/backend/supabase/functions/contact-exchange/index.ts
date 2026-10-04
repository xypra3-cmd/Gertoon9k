// Public: guest leaves their details on a card ("Миний мэдээллийг үлдээх").
// POST { slug, name*, phone|email*, company?, title?, message? (≤300), consent: true*, turnstile_token* }
import { json, logEvent, preflight, readJson } from '../_shared/http.ts';
import { rpc } from '../_shared/db.ts';
import { verifyTurnstile } from '../_shared/turnstile.ts';
import { visitorHash } from '../_shared/visitor.ts';
import { flushEmailQueue } from '../_shared/mailer.ts';

interface Body {
  slug?: string;
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  title?: string;
  message?: string;
  consent?: boolean;
  turnstile_token?: string;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);

  const b = await readJson<Body>(req);
  if (!b) return json(req, { status: 'invalid' }, 400);

  if (b.consent !== true) return json(req, { status: 'consent_required' }, 400);
  if (!(await verifyTurnstile(b.turnstile_token, req))) return json(req, { status: 'captcha_failed' }, 400);

  const slug = str(b.slug, 40).toLowerCase();
  const name = str(b.name, 120);
  const phone = str(b.phone, 40);
  const email = str(b.email, 254);
  const message = typeof b.message === 'string' ? b.message.trim() : '';
  if (!/^[a-z0-9-]{6,40}$/.test(slug) || !name || (!phone && !email) || message.length > 300) {
    return json(req, { status: 'invalid' }, 400);
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(req, { status: 'invalid_email' }, 400);

  const result = await rpc<{ status: string; owner_first_name?: string }>('submit_contact_exchange', {
    p_slug: slug,
    p_visitor_hash: await visitorHash(req),
    p_name: name,
    p_phone: phone || null,
    p_email: email || null,
    p_company: str(b.company, 80) || null,
    p_title: str(b.title, 80) || null,
    p_message: message || null,
  });

  logEvent('contact-exchange', 'result', { status: result.status });

  if (result.status === 'ok') {
    flushEmailQueue(10, ['exchange_received']).catch(() => {});
    return json(req, { status: 'ok', owner_first_name: result.owner_first_name });
  }
  const code = { not_found: 404, rate_limited: 429, owner_limit_reached: 409 }[result.status] ?? 400;
  return json(req, { status: result.status, owner_first_name: result.owner_first_name ?? null }, code);
});
