// wallet-pass: Apple Wallet .pkpass or a «Save to Google Wallet» link for the caller's own card.
// POST { card_id, kind: 'apple' | 'google' }  (Authorization: Bearer <user token>)
// Without the issuer keys in secrets the function answers 501 wallet_not_configured.
import { json, logEvent, preflight, readJson, corsHeaders } from '../_shared/http.ts';
import { getUser, select } from '../_shared/db.ts';
import { allow } from '../_shared/ratelimit.ts';
import { appleConfig, buildApplePass, googleConfig, googleSaveUrl, type PassCard } from './wallet.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX = /^#[0-9a-f]{6}$/i;

interface CardRow {
  id: string;
  slug: string;
  first_name: string;
  last_name: string | null;
  title: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  is_published: boolean;
  org: { brand_color: string | null } | null;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);
  const user = await getUser(req);
  if (!user) return json(req, { error: 'unauthorized' }, 401);
  const body = await readJson<{ card_id?: string; kind?: string }>(req);
  if (!body?.card_id || !UUID.test(body.card_id) || (body.kind !== 'apple' && body.kind !== 'google')) {
    return json(req, { error: 'invalid_request' }, 400);
  }
  if (!(await allow(`wallet:${user.id}`, 60, 10))) return json(req, { error: 'rate_limited' }, 429);

  const apple = body.kind === 'apple' ? appleConfig() : null;
  const google = body.kind === 'google' ? googleConfig() : null;
  if (!apple && !google) return json(req, { error: 'wallet_not_configured' }, 501);

  // Only the owner's own, published, not deleted card.
  const rows = await select<CardRow[]>(
    `cards?id=eq.${body.card_id}&owner_id=eq.${user.id}&deleted_at=is.null&select=id,slug,first_name,last_name,title,company,phone,email,is_published,org:organizations(brand_color)`,
  );
  const row = rows[0];
  if (!row) return json(req, { error: 'not_found' }, 404);
  if (!row.is_published) return json(req, { error: 'card_not_published' }, 409);

  const web = (Deno.env.get('PUBLIC_WEB_URL') || 'https://digitalcard.mn').replace(/\/$/, '');
  const card: PassCard = {
    ...row,
    color: row.org?.brand_color && HEX.test(row.org.brand_color) ? row.org.brand_color : '#2557E6',
    url: `${web}/c/${row.slug}?src=qr`,
  };

  if (apple) {
    const bytes = buildApplePass(card, apple);
    logEvent('wallet-pass', 'apple_issued');
    return new Response(bytes, {
      headers: {
        ...corsHeaders(req),
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="${row.slug}.pkpass"`,
        'Cache-Control': 'no-store',
      },
    });
  }
  const url = await googleSaveUrl(card, google!, [web]);
  logEvent('wallet-pass', 'google_issued');
  return json(req, { url });
});
