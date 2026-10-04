// Minimal PostgREST / GoTrue client using the service role key (no external dependencies).
import { env } from './http.ts';

const baseUrl = () => env('SUPABASE_URL').replace(/\/$/, '');
const serviceKey = () => env('SUPABASE_SERVICE_ROLE_KEY');

function serviceHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: serviceKey(),
    Authorization: `Bearer ${serviceKey()}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

export class DbError extends Error {
  constructor(public status: number, public code: string, message: string, public hint?: string) {
    super(message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new DbError(res.status, body?.code ?? String(res.status), body?.message ?? 'db_error', body?.hint);
  }
  return body as T;
}

/** Call a Postgres function: POST /rest/v1/rpc/<fn> */
export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${baseUrl()}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: serviceHeaders(),
    body: JSON.stringify(args),
  });
  return handle<T>(res);
}

/** GET /rest/v1/<pathAndQuery> */
export async function select<T>(pathAndQuery: string): Promise<T> {
  const res = await fetch(`${baseUrl()}/rest/v1/${pathAndQuery}`, { headers: serviceHeaders() });
  return handle<T>(res);
}

/** PATCH /rest/v1/<table>?<filter> */
export async function patch<T>(tableAndFilter: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${baseUrl()}/rest/v1/${tableAndFilter}`, {
    method: 'PATCH',
    headers: serviceHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(body),
  });
  return handle<T>(res);
}

export interface AuthUser {
  id: string;
  email?: string;
}

/** Validates the caller's access token with GoTrue. Returns null when missing/invalid. */
export async function getUser(req: Request): Promise<AuthUser | null> {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.toLowerCase().startsWith('bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token || token === serviceKey() || token === Deno.env.get('SUPABASE_ANON_KEY')) return null;
  const res = await fetch(`${baseUrl()}/auth/v1/user`, {
    headers: { apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? serviceKey(), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user?.id ? { id: user.id, email: user.email } : null;
}
