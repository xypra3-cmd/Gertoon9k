import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { ANON_KEY, API_URL, CRON_SECRET, FUNCTIONS_URL, MOCK_URL, SERVICE_KEY } from './env';

export const admin: SupabaseClient = createClient(API_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

export interface TestUser {
  id: string;
  email: string;
  token: string;
  db: SupabaseClient;
}

const PASSWORD = 'Qa-Passw0rd!';

/** Creates a confirmed user and returns a client authenticated with that user's JWT. */
export async function newUser(label = 'u'): Promise<TestUser> {
  const email = `qa-${label}-${randomUUID().slice(0, 8)}@test.mn`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: `QA ${label}` } });
  if (error) throw error;
  const db = createClient(API_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: s, error: e2 } = await db.auth.signInWithPassword({ email, password: PASSWORD });
  if (e2) throw e2;
  return { id: data.user.id, email, token: s.session!.access_token, db };
}

export const anon = () => createClient(API_URL, ANON_KEY, { auth: { persistSession: false } });

/** Gives a user an active (or expired) personal plan. Only the service role can do this. */
export async function setPlan(userId: string, plan: 'pro' | 'free', state: 'active' | 'expired' = 'active') {
  if (plan === 'free') return;
  const end = state === 'active' ? new Date(Date.now() + 30 * 864e5) : new Date(Date.now() - 864e5);
  const row = { owner_user_id: userId, plan_id: plan, status: state, current_period_start: new Date(Date.now() - 31 * 864e5).toISOString(), current_period_end: end.toISOString() };
  // subscriptions has a partial unique index on owner_user_id → update-or-insert instead of upsert
  const { data: existing } = await admin.from('subscriptions').select('id').eq('owner_user_id', userId).maybeSingle();
  const { error } = existing ? await admin.from('subscriptions').update(row).eq('id', existing.id) : await admin.from('subscriptions').insert(row);
  if (error) throw error;
}

export async function expirePlan(userId: string) {
  const { error } = await admin.from('subscriptions').update({ status: 'expired', current_period_end: new Date(Date.now() - 864e5).toISOString() }).eq('owner_user_id', userId);
  if (error) throw error;
}

export const slug = (p = 'qa') => `${p}-${randomUUID().slice(0, 8)}`;

export async function createCard(u: TestUser, extra: Record<string, unknown> = {}) {
  const { data, error } = await u.db.from('cards').insert({ owner_id: u.id, slug: slug(), first_name: 'Тест', is_published: true, ...extra }).select().single();
  if (error) throw error;
  return data as { id: string; slug: string };
}

export async function callFn(name: string, init: { body?: unknown; token?: string; headers?: Record<string, string>; query?: string } = {}) {
  const res = await fetch(`${FUNCTIONS_URL}/${name}${init.query ?? ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}), ...(init.headers ?? {}) },
    body: init.body === undefined ? '{}' : JSON.stringify(init.body),
  });
  const text = await res.text();
  let body: any = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status, body };
}

export const cron = (name: string) => callFn(name, { headers: { 'x-cron-secret': CRON_SECRET } });

export async function mockPay(invoiceId: string, amount: number) {
  const r = await fetch(`${MOCK_URL}/__mock/pay`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invoice_id: invoiceId, amount }) });
  if (!r.ok) throw new Error('mock server not running: npm run mock');
}

export const guestHeaders = (n: number | string) => ({ 'x-forwarded-for': `10.${Number(String(n).length)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, 'user-agent': `qa-guest-${n}-${randomUUID()}` });
