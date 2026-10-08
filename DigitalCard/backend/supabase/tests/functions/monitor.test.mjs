// Unit tests for _shared/monitor.ts (no Supabase stack needed). Node 22.18+ runs the .ts directly;
// a tiny Deno shim provides Deno.env, and fetch is replaced to capture what would reach Sentry.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const env = new Map([['SENTRY_ENVIRONMENT', 'test']]);
globalThis.Deno = { env: { get: (k) => env.get(k) } };
const sent = [];
globalThis.fetch = async (url, init) => {
  sent.push({ url: String(url), headers: init.headers, body: init.body });
  return new Response('{}');
};
const { monitored, reportError } = await import('../../functions/_shared/monitor.ts');

const req = () => new Request('http://localhost/functions/v1/x', { headers: { origin: 'https://digitalcard.mn' } });
const parse = (body) => body.trim().split('\n').map((l) => JSON.parse(l));

beforeEach(() => {
  sent.length = 0;
  env.set('SENTRY_DSN', 'https://pubkey@o1.ingest.de.sentry.io/4507');
});

test('an unhandled error becomes a generic 500 and one Sentry envelope', async () => {
  const handler = monitored('demo', async () => {
    throw new Error('insert failed for bat@gmail.com from 10.1.2.3');
  });
  const res = await handler(req());
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: 'internal' });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, 'https://o1.ingest.de.sentry.io/api/4507/envelope/');
  assert.match(sent[0].headers['X-Sentry-Auth'], /sentry_version=7, sentry_key=pubkey/);
  const [header, item, event] = parse(sent[0].body);
  assert.equal(header.event_id, event.event_id);
  assert.equal(item.type, 'event');
  assert.equal(event.tags.fn, 'demo');
  assert.equal(event.environment, 'test');
  assert.equal(event.exception.values[0].value, 'insert failed for [email] from [ip]');
  assert.ok(event.exception.values[0].stacktrace.frames.length > 0, 'stack frames');
  assert.ok(event.exception.values[0].stacktrace.frames.every((f) => !f.filename.startsWith('/')), 'no absolute paths');
  for (const key of ['user', 'request', 'server_name']) assert.equal(event[key], undefined);
});

test('a successful response passes through untouched and reports nothing', async () => {
  const res = await monitored('demo', async () => new Response('fine', { status: 201 }))(req());
  assert.equal(res.status, 201);
  assert.equal(await res.text(), 'fine');
  assert.equal(sent.length, 0);
});

test('without SENTRY_DSN nothing leaves the server (still logged)', async () => {
  env.delete('SENTRY_DSN');
  await reportError('demo', new Error('boom'));
  assert.equal(sent.length, 0);
});

test('extra values are scrubbed, record ids are kept', async () => {
  await reportError('demo', new Error('x'), { payment_id: 'a0000000-0000-4000-8000-000000000001', phone: '+976 9911 2233', n: 3 });
  const [, , event] = parse(sent[0].body);
  assert.deepEqual(event.extra, { payment_id: 'a0000000-0000-4000-8000-000000000001', phone: '[number]', n: 3 });
});

test('an unreachable Sentry never breaks the request', async () => {
  globalThis.fetch = async () => {
    throw new Error('network down');
  };
  const res = await monitored('demo', async () => {
    throw new Error('boom');
  })(req());
  assert.equal(res.status, 500);
});
