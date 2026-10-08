import { describe, expect, it } from 'vitest';
import { sanitizeEvent, scrub } from '../src/scrub';
// The Edge Functions keep their own copy (Deno cannot import this package); both must behave the same.
import { scrub as edgeScrub } from '../../../backend/supabase/functions/_shared/scrub';

const cases: [string, string][] = [
  ['duplicate key (email)=(bat.bold+work@gmail.com)', 'duplicate key (email)=([email])'],
  ['call +976 9911-2233 or 88112233', 'call [number] or [number]'],
  ['from 192.168.10.4 and 2001:db8:85a3::8a2e:370:7334', 'from [ip] and [ip]'],
  ['Authorization: Bearer sk_live_abc.DEF-123', 'Authorization: Bearer [token]'],
  ['token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl expired', 'token [jwt] expired'],
  ['payment a0000000-0000-4000-8000-000000000001 failed', 'payment a0000000-0000-4000-8000-000000000001 failed'],
  ['qpay_http_503', 'qpay_http_503'],
  ['::1 and fe80::1%eth0 and 2001:db8:0:0:0:0:2:1', '[ip] and [ip]%eth0 and [ip]'],
  ['retry at 12:30:45', 'retry at 12:30:45'],
];

describe('scrub (error reports carry no personal data)', () => {
  it.each(cases)('%s', (input, expected) => {
    expect(scrub(input)).toBe(expected);
    expect(edgeScrub(input)).toBe(expected);
  });

  it('caps the length', () => {
    expect(scrub('x'.repeat(5000))).toHaveLength(2000);
  });
});

describe('sanitizeEvent (Sentry beforeSend)', () => {
  it('removes identity, breadcrumbs, query/hash and scrubs text', () => {
    const event = sanitizeEvent({
      event_id: 'abc',
      user: { id: 'u1', email: 'a@b.mn', ip_address: '10.0.0.1' },
      server_name: 'host',
      breadcrumbs: [{ message: 'clicked Бат' }],
      request: { url: 'https://digitalcard.mn/reset-password?x=1#access_token=eyJa.b.c', headers: { Cookie: 's=1' } },
      contexts: { device: { name: "Bat's iPhone", model: 'iPhone16,1' } },
      message: 'call 99112233',
      exception: { values: [{ type: 'Error', value: 'no row for a@b.mn' }] },
      extra: { note: 'from 10.0.0.1', count: 2 },
    });
    expect(event).toEqual({
      event_id: 'abc',
      request: { url: 'https://digitalcard.mn/reset-password' },
      contexts: { device: { model: 'iPhone16,1' } },
      message: 'call [number]',
      exception: { values: [{ type: 'Error', value: 'no row for [email]' }] },
      extra: { note: 'from [ip]', count: 2 },
    });
  });
});
