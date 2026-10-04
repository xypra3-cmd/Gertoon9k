// k6 load test — /c/:slug page + public_cards API + track-event.
// Target: 200 concurrent users, 5 minutes, p95 < 800 ms, errors < 1%.
// Run: k6 run -e WEB=https://staging.digitalcard.mn -e API=https://<ref>.supabase.co -e ANON=<anon> -e SLUG=saraa-g load/public-card.js
import http from 'k6/http';
import { check, sleep } from 'k6';

const WEB = __ENV.WEB || 'http://localhost:5173';
const API = __ENV.API || 'http://127.0.0.1:54321';
const ANON = __ENV.ANON || '';
const SLUG = __ENV.SLUG || 'saraa-g';

export const options = {
  scenarios: {
    public_card: { executor: 'ramping-vus', startVUs: 0, stages: [{ duration: '30s', target: 200 }, { duration: '4m', target: 200 }, { duration: '30s', target: 0 }] },
  },
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const page = http.get(`${WEB}/c/${SLUG}?src=qr`, { tags: { name: 'page' } });
  check(page, { 'page 200': (r) => r.status === 200 });

  const data = http.get(`${API}/rest/v1/public_cards?slug=eq.${SLUG}&select=*`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }, tags: { name: 'public_cards' } });
  check(data, { 'card json': (r) => r.status === 200 && r.json().length === 1 });

  // Each VU = distinct visitor (rate limit is per visitor per card)
  const ev = http.post(`${API}/functions/v1/track-event`, JSON.stringify({ slug: SLUG, event: 'qr_open' }), {
    headers: { 'Content-Type': 'application/json', 'User-Agent': `k6-vu-${__VU}`, 'X-Forwarded-For': `10.9.${__VU % 250}.${__ITER % 250}` },
    tags: { name: 'track-event' },
  });
  check(ev, { 'tracked or rate-limited': (r) => r.status === 200 || r.status === 202 });
  sleep(1);
}
