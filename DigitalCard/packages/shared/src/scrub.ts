// Personal-data scrubber for error reports (web + mobile). Same rules as the Edge Functions'
// backend/supabase/functions/_shared/scrub.ts — test/scrub.test.ts runs both on the same cases.
const SCRUBBERS: [RegExp, string][] = [
  [/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[jwt]'],
  [/\b(bearer|basic)\s+[\w.~+/=-]+/gi, '$1 [token]'],
  [/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]'],
  [/\b\d{1,3}(\.\d{1,3}){3}\b/g, '[ip]'],
  // IPv6, full or compressed (needs «::» or 4+ colons, so clock times like 12:30:45 survive)
  [/(?<![\w:])(?=[0-9a-f:]*(?:::|(?:[0-9a-f]{1,4}:){4}))[0-9a-f]{0,4}(?::[0-9a-f]{0,4}){2,7}(?![\w:])/gi, '[ip]'],
  [/\+?\d[\d\s-]{6,}\d/g, '[number]'],
];

// Record ids (payment_id, card_id) are not personal data and are what makes an error actionable.
const UUID = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

/** Removes personal data and secrets from free text before it leaves the server. */
export function scrub(text: string): string {
  return text
    .split(UUID)
    .map((part, i) => {
      if (i % 2 === 1) return part;
      let out = part;
      for (const [re, by] of SCRUBBERS) out = out.replace(re, by);
      return out;
    })
    .join('')
    .slice(0, 2000);
}

interface LooseEvent {
  user?: unknown;
  server_name?: unknown;
  breadcrumbs?: unknown;
  message?: unknown;
  request?: { url?: string; [key: string]: unknown };
  exception?: { values?: { value?: string }[] };
  extra?: Record<string, unknown>;
  contexts?: { device?: { name?: unknown } } & Record<string, unknown>;
}

/**
 * Sentry beforeSend for web + mobile (D-76): no user, no IP, no breadcrumbs (they hold URLs, console
 * text and clicked labels), no query string or hash (password-reset links carry tokens there),
 * no user-given device name; free text goes through scrub(). Returns the same object.
 */
export function sanitizeEvent<E>(event: E): E {
  const e = event as LooseEvent;
  delete e.user;
  delete e.server_name;
  delete e.breadcrumbs;
  if (e.contexts?.device) delete e.contexts.device.name;
  if (e.request) {
    const url = typeof e.request.url === 'string' ? scrub(e.request.url.split(/[?#]/)[0] ?? '') : undefined;
    e.request = url ? { url } : {};
  }
  if (typeof e.message === 'string') e.message = scrub(e.message);
  for (const v of e.exception?.values ?? []) if (typeof v.value === 'string') v.value = scrub(v.value);
  if (e.extra) {
    for (const [k, v] of Object.entries(e.extra)) if (typeof v === 'string') e.extra[k] = scrub(v);
  }
  return event;
}
