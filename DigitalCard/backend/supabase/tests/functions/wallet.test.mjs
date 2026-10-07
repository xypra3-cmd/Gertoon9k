// WALLET-01/02: Apple .pkpass is a valid signed bundle; Google Wallet link is a correctly signed JWT.
// Uses the self-signed dev chain from scripts/dev-wallet-certs.sh (skipped when it is missing).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync, execFileSync } from 'node:child_process';
import { createHash, createVerify } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const status = JSON.parse(execSync('supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
const API = process.env.SUPABASE_URL ?? status.API_URL;
const ANON = process.env.SUPABASE_ANON_KEY ?? status.ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? status.SERVICE_ROLE_KEY;
const DEV = new URL('../../.wallet-dev/', import.meta.url).pathname;
const configured = existsSync(join(DEV, 'pass.pem'));

async function login(email) {
  const res = await fetch(`${API}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Demo1234!' }),
  });
  const b = await res.json();
  return { token: b.access_token, id: b.user.id };
}
const rest = async (path) => (await fetch(`${API}/rest/v1/${path}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } })).json();
const wallet = (token, body) =>
  fetch(`${API}/functions/v1/wallet-pass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
const publishedCard = async (userId) => (await rest(`cards?owner_id=eq.${userId}&is_published=eq.true&deleted_at=is.null&select=id,slug&limit=1`))[0];

test('wallet-pass: login required, input validated, only own cards', async () => {
  const pro = await login('pro@demo.mn');
  const basic = await login('basic@demo.mn');
  const card = await publishedCard(pro.id);
  assert.equal((await wallet(null, { card_id: card.id, kind: 'apple' })).status, 401);
  assert.equal((await wallet(pro.token, { card_id: card.id, kind: 'samsung' })).status, 400);
  assert.equal((await wallet(pro.token, { card_id: 'x', kind: 'apple' })).status, 400);
  const other = await wallet(basic.token, { card_id: card.id, kind: configured ? 'apple' : 'google' });
  assert.equal(other.status, configured ? 404 : 501);
});

test('WALLET-01: Apple .pkpass — manifest hashes match, PKCS#7 signature verifies', { skip: !configured && 'no dev wallet certs' }, async () => {
  const pro = await login('pro@demo.mn');
  const card = await publishedCard(pro.id);
  const res = await wallet(pro.token, { card_id: card.id, kind: 'apple' });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/vnd.apple.pkpass');
  const dir = mkdtempSync(join(tmpdir(), 'pkpass-'));
  writeFileSync(join(dir, 'card.pkpass'), Buffer.from(await res.arrayBuffer()));
  execFileSync('unzip', ['-q', join(dir, 'card.pkpass'), '-d', join(dir, 'x')]);
  const x = (f) => join(dir, 'x', f);
  const manifest = JSON.parse(readFileSync(x('manifest.json'), 'utf8'));
  assert.deepEqual(Object.keys(manifest).sort(), ['icon.png', 'icon@2x.png', 'icon@3x.png', 'logo.png', 'logo@2x.png', 'pass.json']);
  for (const [f, sha1] of Object.entries(manifest)) assert.equal(createHash('sha1').update(readFileSync(x(f))).digest('hex'), sha1, f);
  const pass = JSON.parse(readFileSync(x('pass.json'), 'utf8'));
  assert.equal(pass.serialNumber, card.id);
  assert.equal(pass.barcodes[0].format, 'PKBarcodeFormatQR');
  assert.ok(pass.barcodes[0].message.endsWith(`/c/${card.slug}?src=qr`));
  // Detached signature over manifest.json, chained to the (dev) WWDR certificate
  execFileSync('openssl', ['cms', '-verify', '-binary', '-inform', 'DER', '-in', x('signature'), '-content', x('manifest.json'), '-CAfile', join(DEV, 'ca.pem'), '-purpose', 'any', '-out', '/dev/null'], { stdio: 'pipe' });
});

test('WALLET-02: Google Wallet save link — RS256 JWT with a generic pass', { skip: !configured && 'no dev wallet certs' }, async () => {
  const pro = await login('pro@demo.mn');
  const card = await publishedCard(pro.id);
  const res = await wallet(pro.token, { card_id: card.id, kind: 'google' });
  assert.equal(res.status, 200);
  const { url } = await res.json();
  assert.match(url, /^https:\/\/pay\.google\.com\/gp\/v\/save\/[\w-]+\.[\w-]+\.[\w-]+$/);
  const [h, p, s] = url.split('/').pop().split('.');
  const ok = createVerify('RSA-SHA256').update(`${h}.${p}`).verify(readFileSync(join(DEV, 'google.pub')), Buffer.from(s, 'base64url'));
  assert.ok(ok, 'signature');
  const claims = JSON.parse(Buffer.from(p, 'base64url').toString());
  assert.equal(claims.aud, 'google');
  assert.equal(claims.typ, 'savetowallet');
  const obj = claims.payload.genericObjects[0];
  assert.equal(obj.barcode.type, 'QR_CODE');
  assert.ok(obj.barcode.value.endsWith(`/c/${card.slug}?src=qr`));
});
