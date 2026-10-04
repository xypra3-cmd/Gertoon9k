// Role-based UI smoke: org admin, employee, platform admin MFA gate, locale, responsive, button labels.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const BASE = 'http://localhost:5173';
import fs from 'node:fs';
fs.mkdirSync(process.env.OUT ?? new URL('./out', import.meta.url).pathname, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const login = async (email) => {
  const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await c.newPage();
  await p.goto(`${BASE}/login`);
  await p.fill('#email', email);
  await p.fill('#password', 'Demo1234!');
  await p.click('button[type=submit]');
  await p.waitForURL(`${BASE}/app`);
  return { c, p };
};
const res = [];
const step = async (n, f) => { try { await f(); res.push('PASS ' + n); } catch (e) { res.push('FAIL ' + n + ' :: ' + e.message.split('\n')[0]); } };

await step('org admin: seats, invite until full', async () => {
  const { c, p } = await login('org-owner@demo.mn');
  await p.goto(`${BASE}/app/org`);
  await p.waitForSelector('text=4 / 5 суудал');
  await p.fill('input[type=email]', `new-${Date.now()}@test.mn`);
  await p.getByRole('button', { name: 'Урих' }).click();
  await p.waitForSelector('text=5 / 5 суудал');
  assert.equal(await p.getByRole('button', { name: 'Урих' }).isDisabled(), true);
  await p.screenshot({ path: (process.env.OUT ?? new URL('./out', import.meta.url).pathname) + '/org.png', fullPage: true });
  await c.close();
});

await step('employee: template tab hidden, locked field disabled, allowed field enabled', async () => {
  const { c, p } = await login('employee1@demo.mn');
  await p.goto(`${BASE}/app/cards/d0000000-0000-4000-8000-000000000051`);
  await p.waitForSelector('#f-title');
  assert.equal(await p.getByRole('tab', { name: 'Загвар' }).count(), 0);
  assert.equal(await p.locator('#f-company').isDisabled(), true);
  assert.equal(await p.locator('#f-title').isDisabled(), false);
  await p.fill('#f-title', 'Ахлах борлуулагч');
  await p.getByRole('button', { name: 'Хадгалах' }).click();
  await p.waitForSelector('text=Хадгалагдлаа');
  await p.goto(`${BASE}/app/stats`);
  await p.waitForSelector('[data-testid=kpis]');
  const opts = await p.locator('select option').count();
  assert.equal(opts, 2, 'employee sees only own card (all + 1)');
  await c.close();
});

await step('admin requires MFA before any admin data', async () => {
  const { c, p } = await login('admin@demo.mn');
  await p.goto(`${BASE}/admin`);
  await p.waitForSelector('text=Хоёр шатлалт баталгаажуулалт (TOTP)');
  assert.equal(await p.locator('table').count(), 0);
  await c.close();
});

await step('EN locale switch', async () => {
  const c = await b.newContext();
  const p = await c.newPage();
  await p.goto(`${BASE}/c/saraa-g`);
  await p.getByRole('button', { name: 'EN' }).click();
  await p.waitForSelector('text=Leave my details');
  await c.close();
});

await step('responsive 320px: no horizontal scroll on landing & public card', async () => {
  const c = await b.newContext({ viewport: { width: 320, height: 640 } });
  const p = await c.newPage();
  for (const u of ['/', '/c/saraa-g', '/login']) {
    await p.goto(BASE + u);
    await p.waitForTimeout(500);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(ov <= 0, `${u} overflow ${ov}px`);
  }
  await c.close();
});

await step('every button has a text or aria-label', async () => {
  const { c, p } = await login('pro@demo.mn');
  for (const u of ['/app', '/app/contacts', '/app/stats', '/app/billing', '/app/cards/d0000000-0000-4000-8000-000000000031']) {
    await p.goto(BASE + u);
    await p.waitForTimeout(800);
    const bad = await p.evaluate(() => [...document.querySelectorAll('button, a[href]')].filter((e) => !(e.textContent || '').trim() && !e.getAttribute('aria-label') && !e.querySelector('img[alt]:not([alt=""])')).map((e) => e.outerHTML.slice(0, 80)));
    assert.deepEqual(bad, [], u);
  }
  await c.close();
});
await b.close();
console.log(res.join('\n'));
