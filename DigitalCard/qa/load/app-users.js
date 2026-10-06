// k6 load test — signed-in app usage at the 1,000–5,000 user scale.
// Model: 5,000 registered users, ~10 % open the app at the same time → 500 concurrent VUs.
// Each iteration = one "app open": my cards, contacts list, entitlements, 7-day stats; 10 % also do a
// nearby bump (exercises the advisory-lock path). All queries go through RLS as a real user would.
//
// Local:  k6 run -e SERVICE=<service_role key> -e ANON=<anon key> qa/load/app-users.js
// The service key is used ONLY in setup() to create throw-away users on a local/staging stack.
import http from 'k6/http';
import { check, sleep } from 'k6';

const API = __ENV.API || 'http://127.0.0.1:54321';
const ANON = __ENV.ANON || '';
const SERVICE = __ENV.SERVICE || '';
const USERS = Number(__ENV.USERS || 200);
const PEAK = Number(__ENV.PEAK || 500);

export const options = {
  setupTimeout: '5m',
  scenarios: {
    app: { executor: 'ramping-vus', startVUs: 0, stages: [{ duration: '30s', target: PEAK }, { duration: '2m', target: PEAK }, { duration: '20s', target: 0 }] },
  },
  thresholds: {
    'http_req_duration{name:contacts}': ['p(95)<500'],
    'http_req_duration{name:cards}': ['p(95)<500'],
    'http_req_duration{name:entitlements}': ['p(95)<500'],
    'http_req_duration{name:stats}': ['p(95)<800'],
    'http_req_duration{name:bump}': ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

const json = (token) => ({ headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });

export function setup() {
  const run = Date.now().toString(36);
  const users = [];
  for (let i = 0; i < USERS; i++) {
    const email = `load-${run}-${i}@test.mn`;
    const password = `Load-${run}-pw!`;
    const created = http.post(`${API}/auth/v1/admin/users`, JSON.stringify({ email, password, email_confirm: true }), json(SERVICE));
    check(created, { 'user created': (r) => r.status === 200 });
    const tok = http.post(`${API}/auth/v1/token?grant_type=password`, JSON.stringify({ email, password }), json(ANON)).json();
    const token = tok.access_token;
    const card = http.post(`${API}/rest/v1/cards`, JSON.stringify({ owner_id: tok.user.id, slug: `load-${run}-${i}`, first_name: `Load ${i}`, is_published: true }), {
      headers: { ...json(token).headers, Prefer: 'return=representation' },
    });
    const cardId = card.json()[0].id;
    const contacts = Array.from({ length: 10 }, (_, k) => ({ owner_id: tok.user.id, name: `Contact ${k}`, phone: `+9769900${String(k).padStart(4, '0')}` }));
    http.post(`${API}/rest/v1/contacts`, JSON.stringify(contacts), json(token));
    users.push({ token, cardId });
  }
  return { users };
}

export default function (data) {
  const u = data.users[__VU % data.users.length];
  const h = json(u.token);
  check(http.get(`${API}/rest/v1/cards?select=*,card_links(*)&deleted_at=is.null&order=created_at`, { ...h, tags: { name: 'cards' } }), { cards: (r) => r.status === 200 });
  check(http.get(`${API}/rest/v1/contacts?select=*&order=created_at.desc`, { ...h, tags: { name: 'contacts' } }), { contacts: (r) => r.status === 200 });
  check(http.post(`${API}/rest/v1/rpc/get_my_entitlements`, '{}', { ...h, tags: { name: 'entitlements' } }), { entitlements: (r) => r.status === 200 });
  const from = new Date(Date.now() - 7 * 864e5).toISOString();
  check(http.post(`${API}/rest/v1/rpc/get_card_stats`, JSON.stringify({ p_card_ids: [u.cardId], p_from: from }), { ...h, tags: { name: 'stats' } }), { stats: (r) => r.status === 200 });
  if (Math.random() < 0.1) {
    const cells = ['y2s08g', 'y2s08u', 'y2s0b5', 'y2s0c1', 'y2s0dk'];
    const r = http.post(`${API}/rest/v1/rpc/nearby_bump`, JSON.stringify({ p_card_id: u.cardId, p_geohash: cells[__ITER % cells.length] }), { ...h, tags: { name: 'bump' } });
    check(r, { bump: (x) => x.status === 200 });
  }
  sleep(2 + Math.random() * 3);
}
