// Public: POST { slug, event: 'view'|'qr_open'|'link_click'|'contact_save', link_kind? }
// visitor_hash = sha256(ip + user_agent + daily salt). The IP is never stored or logged.
import { json, preflight, readJson } from '../_shared/http.ts';
import { getUser, rpc } from '../_shared/db.ts';
import { networkHash, visitorHash } from '../_shared/visitor.ts';
import { allow } from '../_shared/ratelimit.ts';

const EVENTS = new Set(['view', 'qr_open', 'link_click', 'contact_save']);

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);

  const body = await readJson<{ slug?: string; event?: string; link_kind?: string | null }>(req);
  const slug = (body?.slug ?? '').toLowerCase();
  if (!/^[a-z0-9-]{6,40}$/.test(slug) || !EVENTS.has(body?.event ?? '')) return json(req, { error: 'invalid' }, 400);
  const linkKind = body?.event === 'link_click' ? String(body?.link_kind ?? 'custom').slice(0, 40) : null;

  // Per-network cap per card (generous: mobile carriers put many people behind one IP).
  if (!(await allow(`evt:${await networkHash(req)}:${slug}`, 3600, 600))) return json(req, { status: 'rate_limited' }, 202);

  // Signed-in viewer: the DB keeps the identity only if the viewer opted in.
  const viewer = await getUser(req);

  const status = await rpc<string>('track_card_event', {
    p_slug: slug,
    p_event: body!.event,
    p_link_kind: linkKind,
    p_visitor_hash: await visitorHash(req),
    p_viewer: viewer?.id ?? null,
  });
  // rate_limited is reported as accepted (202) so clients do not retry.
  const code = status === 'ok' ? 200 : status === 'rate_limited' ? 202 : status === 'not_found' ? 404 : 400;
  return json(req, { status }, code);
});
