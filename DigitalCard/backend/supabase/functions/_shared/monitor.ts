// Error reporting for Edge Functions (Sentry envelope over fetch — no SDK, no dependencies).
// Off unless the SENTRY_DSN secret is set. Privacy (D-76): no user, no request (URL, headers, body),
// no IP; messages and extra values pass through scrub() so e-mails, phones, tokens and IPs never leave.
import { json, logEvent } from './http.ts';
import { scrub } from './scrub.ts';

const RELEASE = Deno.env.get('SENTRY_RELEASE') ?? undefined;
const ENVIRONMENT = Deno.env.get('SENTRY_ENVIRONMENT') ?? 'production';

interface Dsn {
  url: string;
  key: string;
  raw: string;
}

function parseDsn(raw: string | undefined): Dsn | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const project = u.pathname.replace(/^\/+|\/+$/g, '');
    if (!u.username || !/^\d+$/.test(project)) return null;
    // Local tests talk to the mock over http; production DSNs are https.
    return { url: `${u.protocol}//${u.host}/api/${project}/envelope/`, key: u.username, raw };
  } catch {
    return null;
  }
}

interface Frame {
  function?: string;
  filename: string;
  lineno?: number;
  colno?: number;
  in_app: boolean;
}

/** V8 stack → Sentry frames (oldest first). Only the file name, never the absolute path. */
function frames(stack: string | undefined): Frame[] {
  const out: Frame[] = [];
  for (const line of (stack ?? '').split('\n').slice(1)) {
    const m = line.match(/^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/);
    if (!m) continue;
    const file = m[2]!;
    out.push({
      function: m[1],
      filename: file.split('/').slice(-2).join('/'),
      lineno: Number(m[3]),
      colno: Number(m[4]),
      in_app: !file.includes('node_modules') && !file.startsWith('ext:'),
    });
  }
  return out.reverse();
}

function cleanExtra(meta: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v === null || typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    else out[k] = scrub(String(v)).slice(0, 200);
  }
  return out;
}

/** Builds the envelope body (exported for tests). */
export function buildEnvelope(fn: string, error: unknown, meta: Record<string, unknown>, dsn: string): string {
  const e = error instanceof Error ? error : new Error(String(error));
  const eventId = crypto.randomUUID().replaceAll('-', '');
  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: 'javascript',
    level: 'error',
    logger: 'edge-function',
    environment: ENVIRONMENT,
    release: RELEASE,
    tags: { fn },
    extra: cleanExtra(meta),
    exception: {
      values: [{ type: e.name || 'Error', value: scrub(e.message), stacktrace: { frames: frames(e.stack) } }],
    },
  };
  return [
    JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString(), dsn }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(event),
  ].join('\n') + '\n';
}

/** Logs the error (as before) and, when SENTRY_DSN is set, reports it. Never throws. */
export async function reportError(fn: string, error: unknown, meta: Record<string, unknown> = {}): Promise<void> {
  logEvent(fn, 'error', { ...cleanExtra(meta), error: scrub(String((error as Error)?.message ?? error)) });
  const dsn = parseDsn(Deno.env.get('SENTRY_DSN'));
  if (!dsn) return;
  try {
    await fetch(dsn.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${dsn.key}, sentry_client=digitalcard-edge/1.0`,
      },
      body: buildEnvelope(fn, error, meta, dsn.raw),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // Monitoring must never break the request.
  }
}

/** Wraps a Deno.serve handler: an unhandled error is reported and answered with a generic 500. */
export function monitored(fn: string, handler: (req: Request) => Promise<Response>): (req: Request) => Promise<Response> {
  return async (req) => {
    try {
      return await handler(req);
    } catch (e) {
      await reportError(fn, e);
      return json(req, { error: 'internal' }, 500);
    }
  };
}
