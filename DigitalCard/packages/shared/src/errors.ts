// Maps database / edge-function error keys to i18n keys (errors.<key>).
// The DB raises stable MESSAGE keys (see backend migrations 0002 / 0005).
export const KNOWN_ERROR_KEYS = [
  'card_quota_exceeded',
  'plan_expired',
  'org_template_locked',
  'org_field_locked',
  'card_field_immutable',
  'card_deleted',
  'crm_not_enabled',
  'contact_limit_reached',
  'seat_limit_reached',
  'not_org_admin',
  'not_org_member',
  'already_member',
  'invite_not_found',
  'role_change_forbidden',
  'consent_required',
  'captcha_failed',
  'rate_limited',
  'owner_limit_reached',
  'not_found',
  'invalid',
  'invalid_email',
  'not_authenticated',
  'slug_locked',
  'ai_quota_exceeded',
  'ai_unavailable',
  'ai_refused',
  'image_too_large',
  'referral_invalid',
  'referral_window_closed',
] as const;

export type KnownErrorKey = (typeof KNOWN_ERROR_KEYS)[number];

/**
 * Turns a Supabase/PostgREST error ({ code, message }) or function response ({ error | status })
 * into an i18n key. Unknown errors → errors.generic; RLS violations (42501 without key) → errors.forbidden.
 */
export function errorKey(err: unknown): string {
  if (!err || typeof err !== 'object') return 'errors.generic';
  const e = err as { code?: string; message?: string; error?: string; status?: string };
  const candidate = e.message ?? e.error ?? e.status ?? '';
  if ((KNOWN_ERROR_KEYS as readonly string[]).includes(candidate)) return `errors.${candidate}`;
  if (e.code === '42501' || /row-level security/i.test(candidate)) return 'errors.forbidden';
  if (e.code === '23505') return 'errors.duplicate';
  return 'errors.generic';
}
