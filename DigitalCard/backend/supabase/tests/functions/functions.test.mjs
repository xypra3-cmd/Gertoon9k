// Integration tests for Edge Functions against the local stack + mock QPay/Turnstile.
// Prerequisites: `supabase start`, `supabase db reset`, `node supabase/tests/mocks/mock-server.mjs`.
// Run: npm run test:functions
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

const status = JSON.parse(execSync('supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
const API = process.env.SUPABASE_URL ?? status.API_URL;
const ANON = process.env.SUPABASE_ANON_KEY ?? status.ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? status.SERVICE_ROLE_KEY;
const FN = `${API}/functions/v1`;
const MOCK = process.env.MOCK_URL ?? 'http://127.0.0.1:54399';
const CRON = process.env.CRON_SECRET ?? 'local-cron-secret';
const TURNSTILE_OK = 'XXXX.DUMMY.TOKEN.XXXX';

const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' };

async function rest(path, init = {}) {
  const res = await fetch(`${API}/rest/v1/${path}`, { ...init, headers: { ...svc, ...(init.headers ?? {}) } });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function login(email) {
  const res = await fetch(`${API}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Demo1234!' }),
  });
  const body = await res.json();
  assert.ok(body.access_token, `login ${email}`);
  return { token: body.access_token, id: body.user.id };
}

async function call(name, { body, token, headers = {}, query = '' } = {}) {
  const res = await fetch(`${FN}/${name}${query}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

const mockPay = (invoice_id, amount) =>
  fetch(`${MOCK}/__mock/pay`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invoice_id, amount }) });

const subscriptionOf = async (userId) => (await rest(`subscriptions?owner_user_id=eq.${userId}&select=*`))[0];
const paymentByInv = async (inv) => (await rest(`payments?sender_invoice_no=eq.${inv}&select=*`))[0];

let basic;
before(async () => {
  const mock = await fetch(`${MOCK}/__mock/state`).catch(() => null);
  assert.ok(mock?.ok, 'mock server must be running (node supabase/tests/mocks/mock-server.mjs)');
  basic = await login('basic@demo.mn');
});

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------
test('qpay-create-invoice requires a signed-in user', async () => {
  const r = await call('qpay-create-invoice', { body: { plan_id: 'pro' } });
  assert.equal(r.status, 401);
});

test('PAY-01 / criterion 7: forged callback does not activate the subscription', async () => {
  const inv = await call('qpay-create-invoice', { token: basic.token, body: { plan_id: 'pro' } });
  assert.equal(inv.status, 200, JSON.stringify(inv.body));
  assert.ok(inv.body.qr_image && inv.body.urls.length > 0);
  const plan = (await rest('plans?id=eq.pro&select=price_mnt'))[0];
  assert.equal(inv.body.amount_mnt, plan.price_mnt, 'amount comes from plans');

  // attacker posts a "PAID" body; QPay itself says nothing was paid
  const cb = await call('qpay-callback', {
    query: `?inv=${inv.body.sender_invoice_no}`,
    body: { payment_status: 'PAID', payment_amount: plan.price_mnt, object_id: 'whatever' },
  });
  assert.equal(cb.status, 200);
  assert.equal(cb.body.status, 'not_paid');
  const sub = await subscriptionOf(basic.id);
  assert.notEqual(sub.status, 'active');
  assert.equal((await paymentByInv(inv.body.sender_invoice_no)).status, 'pending');
});

test('PAY-02 / criterion 8: duplicate callback extends the period only once', async () => {
  const inv = await call('qpay-create-invoice', { token: basic.token, body: { plan_id: 'pro' } });
  const pay = await paymentByInv(inv.body.sender_invoice_no);
  await mockPay(pay.qpay_invoice_id, pay.amount_mnt);
  const before = await subscriptionOf(basic.id);

  const first = await call('qpay-callback', { query: `?inv=${inv.body.sender_invoice_no}`, body: {} });
  assert.equal(first.body.status, 'paid');
  const afterFirst = await subscriptionOf(basic.id);
  assert.equal(afterFirst.status, 'active');

  const second = await call('qpay-callback', { query: `?inv=${inv.body.sender_invoice_no}`, body: {} });
  assert.ok(['already_paid'].includes(second.body.status));
  const afterSecond = await subscriptionOf(basic.id);
  assert.equal(afterSecond.current_period_end, afterFirst.current_period_end, 'no second extension');

  const base = Math.max(Date.now(), before.current_period_end ? Date.parse(before.current_period_end) : 0);
  const days = (Date.parse(afterFirst.current_period_end) - base) / 86400_000;
  assert.ok(days > 27 && days < 32, `extended by ~1 month (got ${days.toFixed(1)} days)`);
});

test('PAY-03: qpay-reconcile activates a paid invoice without a callback', async () => {
  const inv = await call('qpay-create-invoice', { token: basic.token, body: { plan_id: 'pro' } });
  const pay = await paymentByInv(inv.body.sender_invoice_no);
  await mockPay(pay.qpay_invoice_id, pay.amount_mnt);
  const before = await subscriptionOf(basic.id);

  const r = await call('qpay-reconcile', { headers: { 'x-cron-secret': CRON } });
  assert.equal(r.status, 200);
  assert.equal((await paymentByInv(inv.body.sender_invoice_no)).status, 'paid');
  const after = await subscriptionOf(basic.id);
  assert.ok(Date.parse(after.current_period_end) > Date.parse(before.current_period_end));
});

test('TAX-01: every paid invoice gets an e-barimt; a failed attempt is retried by qpay-reconcile', async () => {
  const inv = await call('qpay-create-invoice', { token: basic.token, body: { plan_id: 'pro' } });
  const pay = await paymentByInv(inv.body.sender_invoice_no);
  await mockPay(pay.qpay_invoice_id, pay.amount_mnt);
  await fetch(`${MOCK}/__mock/ebarimt-fail`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ times: 1 }) });

  await call('qpay-callback', { query: `?inv=${pay.sender_invoice_no}` });
  let p = await paymentByInv(inv.body.sender_invoice_no);
  assert.equal(p.status, 'paid');
  assert.equal(p.ebarimt_status, 'failed', 'QPay e-barimt outage does not block the payment');

  await call('qpay-reconcile', { headers: { 'x-cron-secret': CRON } });
  p = await paymentByInv(inv.body.sender_invoice_no);
  assert.equal(p.ebarimt_status, 'issued');
  assert.equal(p.ebarimt_qr, `ebarimt-qr-${p.qpay_payment_id}`);
  assert.equal(p.ebarimt_attempts, 2);
});

test('PAY-04: underpaid invoice is not applied and is visible as failed', async () => {
  const inv = await call('qpay-create-invoice', { token: basic.token, body: { plan_id: 'pro' } });
  const pay = await paymentByInv(inv.body.sender_invoice_no);
  await mockPay(pay.qpay_invoice_id, 100);
  const before = await subscriptionOf(basic.id);
  const cb = await call('qpay-callback', { query: `?inv=${inv.body.sender_invoice_no}`, body: {} });
  assert.equal(cb.body.status, 'amount_mismatch');
  const failed = await paymentByInv(inv.body.sender_invoice_no);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.failure_reason, 'amount_mismatch');
  assert.equal((await subscriptionOf(basic.id)).current_period_end, before.current_period_end);
  const audit = await rest(`audit_log?action=eq.payment.amount_mismatch&entity_id=eq.${failed.id}&select=id`);
  assert.equal(audit.length, 1);
});

test('cron endpoints reject calls without the cron secret', async () => {
  for (const fn of ['qpay-reconcile', 'expire-subscriptions', 'followup-digest']) {
    const r = await call(fn, { body: {} });
    assert.equal(r.status, 403, fn);
  }
});

// ---------------------------------------------------------------------------
// Contact exchange
// ---------------------------------------------------------------------------
const guest = (n) => ({ 'x-forwarded-for': `10.0.${Math.floor(n / 250)}.${n % 250}`, 'user-agent': `test-guest-${n}` });
const exchangeBody = (over = {}) => ({
  slug: 'khulan-b',
  name: 'Зочин Тест',
  phone: '+97699001100',
  consent: true,
  turnstile_token: TURNSTILE_OK,
  ...over,
});

test('EXC-01 / criterion 12: exchange without consent or Turnstile is refused', async () => {
  const noConsent = await call('contact-exchange', { body: exchangeBody({ consent: false }), headers: guest(1) });
  assert.equal(noConsent.status, 400);
  assert.equal(noConsent.body.status, 'consent_required');
  const noCaptcha = await call('contact-exchange', { body: exchangeBody({ turnstile_token: undefined }), headers: guest(1) });
  assert.equal(noCaptcha.body.status, 'captcha_failed');
  const badCaptcha = await call('contact-exchange', { body: exchangeBody({ turnstile_token: 'forged' }), headers: guest(1) });
  assert.equal(badCaptcha.body.status, 'captcha_failed');
});

test('exchange stores the guest as source=exchange with consent', async () => {
  const name = `Зочин ${Date.now()}`;
  const r = await call('contact-exchange', { body: exchangeBody({ slug: 'saraa-g', name }), headers: guest(Date.now() % 60000) });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.owner_first_name, 'Сараа');
  const rows = await rest(`contacts?name=eq.${encodeURIComponent(name)}&select=source,consent_at,met_at,owner_id`);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source, 'exchange');
  assert.ok(rows[0].consent_at && rows[0].met_at);
  const mail = await rest(`email_queue?kind=eq.exchange_received&user_id=eq.${rows[0].owner_id}&select=id`);
  assert.ok(mail.length >= 1, 'Pro owner gets an e-mail notification');
});

test('EXC-02: more than 5 exchanges per visitor per hour are refused', async () => {
  const h = guest(70000 + (Date.now() % 1000));
  const statuses = [];
  for (let i = 0; i < 6; i++) {
    const r = await call('contact-exchange', { body: exchangeBody({ slug: 'temuulen-demo', name: `RL ${i}` }), headers: h });
    statuses.push(r.body.status);
  }
  assert.deepEqual(statuses, ['ok', 'ok', 'ok', 'ok', 'ok', 'rate_limited']);
});

test('A-05: rotating the User-Agent does not bypass the per-network exchange limit', async () => {
  const ip = `198.51.100.${Date.now() % 250}`;
  const statuses = [];
  for (let i = 0; i < 21; i++) {
    const r = await call('contact-exchange', { body: exchangeBody({ consent: false }), headers: { 'x-forwarded-for': ip, 'user-agent': `bot-${i}` } });
    statuses.push(r.body.status);
  }
  // consent_required responses do not count; with consent the limiter runs before Turnstile.
  assert.ok(statuses.every((s) => s === 'consent_required'));
  const limited = [];
  for (let i = 0; i < 21; i++) {
    const r = await call('contact-exchange', { body: exchangeBody({ turnstile_token: 'forged' }), headers: { 'x-forwarded-for': ip, 'user-agent': `bot-${i}` } });
    limited.push(r.status);
  }
  assert.equal(limited.filter((s) => s === 429).length, 1, JSON.stringify(limited));
  assert.equal(limited.at(-1), 429);
});

test('criterion 10: Free owner — the 11th contact is not stored, guest gets a clear status', async () => {
  // khulan-b belongs to expired@demo.mn (plan expired → Free limit 10)
  const owner = (await rest('cards?slug=eq.khulan-b&select=owner_id'))[0].owner_id;
  const count = async () => (await rest(`contacts?owner_id=eq.${owner}&select=id`)).length;
  let n = 0;
  while ((await count()) < 10 && n < 20) {
    const r = await call('contact-exchange', { body: exchangeBody({ name: `Fill ${n}` }), headers: guest(1000 + n) });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    n++;
  }
  const r = await call('contact-exchange', { body: exchangeBody({ name: 'Eleventh' }), headers: guest(5000) });
  assert.equal(r.status, 409);
  assert.equal(r.body.status, 'owner_limit_reached');
  assert.equal(await count(), 10);
});

// ---------------------------------------------------------------------------
// Analytics / privacy
// ---------------------------------------------------------------------------
test('PRIV-01 / criterion 9: track-event never stores the IP address', async () => {
  const ip = '203.0.113.77';
  const r = await call('track-event', { body: { slug: 'saraa-g', event: 'qr_open' }, headers: { 'x-forwarded-for': ip, 'user-agent': 'priv-test' } });
  assert.equal(r.status, 200);
  const events = await rest('card_events?select=*&order=id.desc&limit=50');
  const dump = JSON.stringify(events);
  assert.ok(!dump.includes(ip), 'IP must not appear in card_events');
  assert.match(events[0].visitor_hash, /^[0-9a-f]{64}$/);
});

test('SEC-06: track-event rate limit keeps at most 30 events per visitor per minute', async () => {
  const headers = { 'x-forwarded-for': '198.51.100.9', 'user-agent': `burst-${Date.now()}` };
  const results = await Promise.all(
    Array.from({ length: 40 }, () => call('track-event', { body: { slug: 'bat-bold', event: 'link_click', link_kind: 'facebook' }, headers })),
  );
  const ok = results.filter((r) => r.body.status === 'ok').length;
  assert.equal(ok, 30);
});

test('criterion 13: followup-digest sends at most one e-mail per user per day', async () => {
  const pro = await login('pro@demo.mn');
  await call('followup-digest', { headers: { 'x-cron-secret': CRON } });
  await call('followup-digest', { headers: { 'x-cron-secret': CRON } });
  const rows = await rest(`email_queue?kind=eq.followup_digest&user_id=eq.${pro.id}&select=dedupe_key`);
  const keys = rows.map((r) => r.dedupe_key);
  assert.equal(new Set(keys).size, keys.length);
  const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  assert.equal(keys.filter((k) => k.endsWith(today)).length, 1);
});

// ---------------------------------------------------------------------------
// Org invite
// ---------------------------------------------------------------------------
test('org-invite: cannot exceed paid seats', async () => {
  const owner = await login('org-owner@demo.mn');
  const org = (await rest(`organizations?owner_id=eq.${owner.id}&select=id`))[0].id;
  const seats = (await rest(`subscriptions?org_id=eq.${org}&select=seats`))[0].seats;
  let last;
  for (let i = 0; i < 6; i++) {
    last = await call('org-invite', { token: owner.token, body: { org_id: org, email: `seat-${Date.now()}-${i}@test.mn` } });
    if (last.status !== 200) break;
  }
  assert.equal(last.status, 403);
  assert.equal(last.body.error, 'seat_limit_reached');
  const members = await rest(`org_members?org_id=eq.${org}&select=id`);
  assert.equal(members.length, seats);

  const employee = await login('employee1@demo.mn');
  const denied = await call('org-invite', { token: employee.token, body: { org_id: org, email: 'x@test.mn' } });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.error, 'not_org_admin');
});

// ---------------------------------------------------------------------------
// Storage (SEC-05)
// ---------------------------------------------------------------------------
async function upload(token, path, bytes, type) {
  const res = await fetch(`${API}/storage/v1/object/avatars/${path}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': type, 'x-upsert': 'true' },
    body: bytes,
  });
  return res.status;
}

test('storage: only own folder, ≤ 2 MB, jpeg/png/webp', async () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(100).fill(0)]);
  assert.equal(await upload(basic.token, `${basic.id}/avatar.png`, png, 'image/png'), 200, 'own folder upload works');

  const other = await login('pro@demo.mn');
  assert.ok((await upload(basic.token, `${other.id}/hijack.png`, png, 'image/png')) >= 400, 'cannot write into another user folder');

  const big = new Uint8Array(5 * 1024 * 1024);
  assert.ok((await upload(basic.token, `${basic.id}/big.png`, big, 'image/png')) >= 400, '5 MB rejected');

  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  assert.ok((await upload(basic.token, `${basic.id}/x.svg`, svg, 'image/svg+xml')) >= 400, 'svg rejected');
  assert.ok((await upload(basic.token, `${basic.id}/x.exe`, png, 'application/x-msdownload')) >= 400, 'exe rejected');
});

// ---------------------------------------------------------------------------
// ai-assist (Claude API mocked by the mock server)
// ---------------------------------------------------------------------------
const mockState = async () => (await fetch(`${MOCK}/__mock/state`)).json();

test('ai-assist: requires login, validates task', async () => {
  assert.equal((await call('ai-assist', { body: { task: 'bio', input: { name: 'A' } } })).status, 401);
  const { token } = await login('pro@demo.mn');
  assert.equal((await call('ai-assist', { token, body: { task: 'chat', input: { q: 'hi' } } })).status, 400);
  assert.equal((await call('ai-assist', { token, body: { task: 'bio', input: {} } })).status, 400);
});

test('ai-assist: bio returns structured result, request uses structured output + fallbacks', async () => {
  const { token } = await login('pro@demo.mn');
  const r = await call('ai-assist', { token, body: { task: 'bio', locale: 'mn', input: { name: 'Сараа', title: 'Зөвлөх' } } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(typeof r.body.result.bio, 'string');
  assert.equal(typeof r.body.remaining, 'number');
  const { lastAi } = await mockState();
  assert.equal(lastAi.output_config.format.type, 'json_schema');
  assert.equal(lastAi.fallbacks, 'default');
  assert.ok(!('thinking' in lastAi) || lastAi.thinking.type !== 'disabled');
});

test('ai-assist: CRM tasks need a CRM plan; free quota is 3/day; refusal refunds the credit', async () => {
  const free = await login('basic@demo.mn');
  // basic@demo.mn may have been upgraded by the QPay test above → use a fresh free user
  const email = `ai-free-${Date.now()}@test.mn`;
  await fetch(`${API}/auth/v1/admin/users`, { method: 'POST', headers: svc,
    body: JSON.stringify({ email, password: 'Demo1234!', email_confirm: true }) });
  const { token } = await login(email);
  assert.ok(free.token);
  assert.equal((await call('ai-assist', { token, body: { task: 'note', input: { note: 'x' } } })).status, 403);

  const refused = await call('ai-assist', { token, body: { task: 'bio', input: { name: 'REFUSE_ME' } } });
  assert.equal(refused.status, 422);
  for (let i = 0; i < 3; i++) {
    assert.equal((await call('ai-assist', { token, body: { task: 'bio', input: { name: `N${i}` } } })).status, 200);
  }
  const over = await call('ai-assist', { token, body: { task: 'bio', input: { name: 'N4' } } });
  assert.equal(over.status, 429);
  assert.equal(over.body.error, 'ai_quota_exceeded');
});

test('qpay-create-invoice: annual period charges plans.price_annual_mnt', async () => {
  const email = `annual-${Date.now()}@test.mn`;
  await fetch(`${API}/auth/v1/admin/users`, { method: 'POST', headers: svc,
    body: JSON.stringify({ email, password: 'Demo1234!', email_confirm: true }) });
  const { token } = await login(email);
  const r = await call('qpay-create-invoice', { token, body: { plan_id: 'pro', period: 'year' } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const [plan] = await rest('plans?id=eq.pro&select=price_annual_mnt');
  assert.equal(r.body.amount_mnt, plan.price_annual_mnt);
  assert.equal((await paymentByInv(r.body.sender_invoice_no)).period, 'year');
});
