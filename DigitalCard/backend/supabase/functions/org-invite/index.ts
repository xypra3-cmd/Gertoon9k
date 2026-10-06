// POST { org_id, email, role?: 'member'|'admin' } with an org admin's JWT.
// Paid seats are enforced in the database (org_members_before_insert).
import { json, logEvent, preflight, readJson } from '../_shared/http.ts';
import { DbError, getUser, rpc } from '../_shared/db.ts';
import { flushEmailQueue } from '../_shared/mailer.ts';
import { allow } from '../_shared/ratelimit.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);

  const user = await getUser(req);
  if (!user) return json(req, { error: 'not_authenticated' }, 401);

  // Invites send e-mail to arbitrary addresses: 30 per hour per admin.
  if (!(await allow(`invite:${user.id}`, 3600, 30))) return json(req, { error: 'rate_limited' }, 429);

  const b = await readJson<{ org_id?: string; email?: string; role?: string }>(req);
  if (!b?.org_id || !b.email) return json(req, { error: 'invalid' }, 400);

  try {
    const memberId = await rpc<string>('invite_org_member', {
      p_actor: user.id,
      p_org_id: b.org_id,
      p_email: b.email,
      p_role: b.role === 'admin' ? 'admin' : 'member',
    });
    flushEmailQueue(10, ['org_invite']).catch(() => {});
    logEvent('org-invite', 'invited', { org_id: b.org_id });
    return json(req, { member_id: memberId });
  } catch (e) {
    if (e instanceof DbError) {
      return json(req, { error: e.message, hint: e.hint ?? null }, e.code === '42501' ? 403 : 400);
    }
    throw e;
  }
});
