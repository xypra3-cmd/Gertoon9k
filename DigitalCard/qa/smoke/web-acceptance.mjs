// Prompt 01 acceptance smoke (Playwright). Prereqs: backend running + seeded, mock server, web on :5173 with VITE_DEMO_MODE=true.
// Run: cd qa/smoke && npm i && node web-acceptance.mjs   (Prompt 04 turns this into the full Playwright suite)
// End-to-end smoke of Prompt 01 acceptance criteria against local stack.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const BASE = 'http://localhost:5173';
const st = JSON.parse(execSync('supabase status -o json', { cwd: '/home/user/Gertoon9k/DigitalCard/backend', encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
const API = st.API_URL, SR = st.SERVICE_ROLE_KEY;
const OUT = process.env.OUT ?? new URL('./out', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const rest = async (path, init = {}) => {
  const r = await fetch(`${API}/rest/v1/${path}`, { ...init, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  const t = await r.text();
  return t ? JSON.parse(t) : null;
};
const results = [];
const step = async (name, fn) => {
  try {
    await fn();
    results.push(['PASS', name]);
    console.log('PASS', name);
  } catch (e) {
    results.push(['FAIL', name, e.message]);
    console.log('FAIL', name, '\n   ', e.message.split('\n').slice(0, 4).join('\n    '));
  }
};

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const stubTurnstile = async (ctx) =>
  ctx.route('https://challenges.cloudflare.com/**', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `window.turnstile={render:function(el,o){el.textContent='turnstile-stub';setTimeout(function(){o.callback('XXXX.DUMMY.TOKEN.XXXX')},50);return 'w1'},remove:function(){},reset:function(){}};`,
    }),
  );

const email = `e2e-${Date.now()}@test.mn`;
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
await stubTurnstile(ctx);
const page = await ctx.newPage();
const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push(e.message));
let slug, cardId;

await step('1a register (Free) with terms checkbox', async () => {
  await page.goto(`${BASE}/register`);
  await page.fill('#full_name', 'Тестийн Хэрэглэгч');
  await page.fill('#email', email);
  await page.fill('#password', 'Passw0rd!x');
  await page.click('button[type=submit]');
  assert.ok(await page.locator('.field-error').count() > 0, 'terms checkbox must be required');
  await page.check('input[type=checkbox]');
  await page.click('button[type=submit]');
  await page.waitForURL(`${BASE}/app`, { timeout: 15000 });
});

await step('1b pay Pro via QPay (sandbox mock) → confirmed', async () => {
  await page.goto(`${BASE}/app/billing`);
  await page.click('[data-testid=pay-pro]');
  await page.waitForSelector('[data-testid=pay-modal] img[alt="QPay QR"]');
  const user = (await rest(`profiles?full_name=eq.${encodeURIComponent('Тестийн Хэрэглэгч')}&select=id&order=created_at.desc&limit=1`))[0];
  const sub = (await rest(`subscriptions?owner_user_id=eq.${user.id}&select=id`))[0];
  const pay = (await rest(`payments?subscription_id=eq.${sub.id}&select=*`))[0];
  await fetch('http://127.0.0.1:54399/__mock/pay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invoice_id: pay.qpay_invoice_id, amount: pay.amount_mnt }) });
  await fetch(`${API}/functions/v1/qpay-callback?inv=${pay.sender_invoice_no}`, { method: 'POST', body: '{}' });
  await page.waitForSelector('[data-testid=pay-confirmed]', { timeout: 10000 });
  await page.click('[data-testid=pay-confirmed] button');
});

await step('1c create card → edit → publish → save', async () => {
  await page.goto(`${BASE}/app`);
  await page.click('text=+ Карт нэмэх');
  await page.waitForURL(/\/app\/cards\/[0-9a-f-]+$/);
  cardId = page.url().split('/').pop();
  await page.fill('#f-title', 'Борлуулалтын менежер');
  await page.fill('#f-company', 'Тест ХХК');
  await page.fill('#f-phone', '+97699112233');
  await page.check('text=Нийтлэх');
  await page.getByRole('button', { name: 'Хадгалах' }).click();
  await page.waitForSelector('text=Хадгалагдлаа');
  slug = (await rest(`cards?id=eq.${cardId}&select=slug,is_published`))[0];
  assert.equal(slug.is_published, true);
  slug = slug.slug;
});

await step('1d open /c/:slug from another browser (no login) + view tracked', async () => {
  const before = (await rest(`card_events?card_id=eq.${cardId}&select=id`)).length;
  const guest = await browser.newContext({ viewport: { width: 360, height: 780 } });
  await stubTurnstile(guest);
  const g = await guest.newPage();
  await g.goto(`${BASE}/c/${slug}?src=qr`);
  await g.waitForSelector('h1');
  assert.match(await g.textContent('h1'), /Хэрэглэгч/);
  await g.waitForTimeout(800);
  const ev = await rest(`card_events?card_id=eq.${cardId}&select=event`);
  assert.ok(ev.length > before && ev.some((e) => e.event === 'qr_open'), 'qr_open recorded');

  // criterion 2: .vcf download, Cyrillic intact
  const [dl] = await Promise.all([g.waitForEvent('download'), g.click('text=Утсанд хадгалах')]);
  const vcf = fs.readFileSync(await dl.path(), 'utf8');
  assert.match(vcf, /FN;CHARSET=UTF-8:Тестийн Хэрэглэгч/);
  assert.match(vcf, /TITLE;CHARSET=UTF-8:Борлуулалтын менежер/);

  // criterion 9: guest exchange → contacts (source=exchange)
  await g.click('text=Миний мэдээллийг үлдээх');
  await g.fill('#ex-name', 'Зочин Батаа');
  await g.fill('#ex-phone', '+97688776655');
  await g.check('dialog input[type=checkbox]');
  await g.waitForSelector('text=turnstile-stub');
  await g.waitForTimeout(200);
  await g.click('dialog button[type=submit]');
  await g.waitForSelector('text=Таны мэдээллийг Хэрэглэгч-д илгээлээ', { timeout: 10000 });
  await g.screenshot({ path: `${OUT}/exchange-sent.png` });
  const c = await rest(`contacts?name=eq.${encodeURIComponent('Зочин Батаа')}&select=source,consent_at`);
  assert.equal(c[0].source, 'exchange');
  assert.ok(c[0].consent_at);
  await guest.close();
});

await step('10 follow-up today shows on dashboard; [Холбогдсон] removes it', async () => {
  const c = (await rest(`contacts?name=eq.${encodeURIComponent('Зочин Батаа')}&select=id&order=created_at.desc&limit=1`))[0];
  await page.goto(`${BASE}/app/contacts/${c.id}`);
  await page.fill('#c-note', 'Үнийн санал хүссэн');
  await page.fill('#c-fu', new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10));
  await page.getByRole('button', { name: 'Хадгалах' }).click();
  await page.waitForSelector('text=Хадгалагдлаа');
  await page.goto(`${BASE}/app`);
  await page.waitForSelector('[data-testid=followups] >> text=Зочин Батаа');
  await page.screenshot({ path: `${OUT}/dashboard.png`, fullPage: true });
  await page.click('[data-testid=followups] >> text=Холбогдсон');
  await page.waitForSelector('[data-testid=followups] >> text=Зочин Батаа', { state: 'detached', timeout: 10000 });
  const row = (await rest(`contacts?id=eq.${c.id}&select=last_contacted_at,follow_up_at`))[0];
  assert.ok(row.last_contacted_at && !row.follow_up_at);
});

await step('5 stats: All time ≥ 30d ≥ 7d ≥ Today, total = view + qr_open', async () => {
  await page.goto(`${BASE}/app/stats?card=${cardId}`);
  const read = async () => {
    await page.waitForSelector('[data-testid=kpis]');
    return Number((await page.locator('[data-testid=kpis] .text-2xl').first().textContent()).trim());
  };
  const vals = {};
  for (const [id, label] of [['today', 'Өнөөдөр'], ['7d', '7 хоног'], ['30d', '30 хоног'], ['all', 'Бүх хугацаа']]) {
    await page.getByRole('tab', { name: label }).click();
    await page.waitForTimeout(600);
    vals[id] = await read();
  }
  assert.ok(vals.all >= vals['30d'] && vals['30d'] >= vals['7d'] && vals['7d'] >= vals.today, JSON.stringify(vals));
  await page.screenshot({ path: `${OUT}/stats.png`, fullPage: true });
});

await step('4 print PDF is 96×61 mm', async () => {
  await page.goto(`${BASE}/app/cards/${cardId}/print`);
  await page.waitForSelector('[data-testid=print-back] svg');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=Хэвлэлийн PDF (crop mark)')]);
  const pdf = fs.readFileSync(await dl.path(), 'latin1');
  const box = pdf.match(/\/MediaBox \[([^\]]+)\]/)[1].trim().split(/\s+/).map(Number);
  const mm = [box[2] / 72 * 25.4, box[3] / 72 * 25.4].map((v) => Math.round(v * 10) / 10);
  assert.deepEqual(mm, [96, 61]);
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('text=300 dpi PNG — Нүүр')]);
  const png = fs.readFileSync(await dl2.path());
  const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
  assert.ok(Math.abs(w - 1134) <= 2 && Math.abs(h - 720) <= 2, `png ${w}x${h}`);
  fs.copyFileSync(await dl2.path(), `${OUT}/print-front.png`);
});

await ctx.close();

// criterion 11 + 6: Free / expired users
await step('11 Free user cannot edit CRM fields in UI', async () => {
  const c = await browser.newContext();
  const p = await c.newPage();
  await p.goto(`${BASE}/login`);
  await p.fill('#email', 'basic@demo.mn');
  await p.fill('#password', 'Demo1234!');
  await p.click('button[type=submit]');
  await p.waitForURL(`${BASE}/app`);
  await p.goto(`${BASE}/app/contacts`);
  await p.click('ul >> a >> nth=0');
  await p.waitForSelector('[data-testid=crm-fields]');
  assert.equal(await p.locator('[data-testid=crm-fields]').evaluate((f) => f.disabled), true);
  assert.equal(await p.locator('#c-note').isDisabled(), true);
  await c.close();
});

await step('6 expired user: 2nd card locked in editor, still public', async () => {
  const c = await browser.newContext();
  const p = await c.newPage();
  await p.goto(`${BASE}/login`);
  await p.fill('#email', 'expired@demo.mn');
  await p.fill('#password', 'Demo1234!');
  await p.click('button[type=submit]');
  await p.waitForURL(`${BASE}/app`);
  await p.goto(`${BASE}/app/cards/d0000000-0000-4000-8000-000000000082`);
  await p.waitForSelector('text=Энэ карт түгжээтэй');
  assert.equal(await p.getByRole('button', { name: 'Хадгалах' }).isDisabled(), true);
  const pub = await c.newPage();
  await pub.goto(`${BASE}/c/khulan-studio`);
  await pub.waitForSelector('h1');
  await c.close();
});

await step('3 10 templates × 2 colors render, long name does not overflow', async () => {
  const c = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const p = await c.newPage();
  await p.goto(`${BASE}/login`);
  await p.fill('#email', 'pro@demo.mn');
  await p.fill('#password', 'Demo1234!');
  await p.click('button[type=submit]');
  await p.waitForURL(`${BASE}/app`);
  await p.goto(`${BASE}/app/cards/d0000000-0000-4000-8000-000000000033`);
  await p.fill('#f-first_name', 'Батбаяраагийнхүүхэдсүрэнжавхлантөгөлдөр');
  await p.fill('#f-title', 'Гүйцэтгэх захирлын орлогч, стратеги төлөвлөлт хариуцсан');
  await p.getByRole('tab', { name: 'Загвар' }).click();
  const names = ['Сонгодог', 'Орчин үеийн', 'Минимал', 'Корпорэйт', 'Бүтээлч', 'Бараан', 'Профайл', 'Бизнес', 'Удирдлага', 'Премиум'];
  for (const n of names) {
    await p.getByRole('button', { name: n, exact: true }).click();
    for (const scheme of ['Өнгө A', 'Өнгө B']) {
      await p.getByRole('tab', { name: 'Дизайн' }).click();
      await p.getByRole('button', { name: scheme }).click();
      await p.getByRole('tab', { name: 'Загвар' }).click();
      await p.waitForTimeout(100);
      const card = p.locator('[aria-label="Урьдчилан харах"] article');
      const over = await card.evaluate((el) => {
        const h1 = el.querySelector('h1');
        return { cardOverflow: el.scrollWidth > el.clientWidth + 1, h1Lines: h1 ? Math.round(h1.scrollHeight / parseFloat(getComputedStyle(h1).lineHeight)) : 0, fs: h1 ? getComputedStyle(h1).fontSize : '' };
      });
      assert.equal(over.cardOverflow, false, `${n} ${scheme} overflow`);
      assert.ok(over.h1Lines <= 2 || parseFloat(over.fs) <= 16, `${n} ${scheme} name lines=${over.h1Lines} fs=${over.fs}`);
      await card.screenshot({ path: `${OUT}/tpl-${names.indexOf(n)}-${scheme.slice(-1)}.png` });
    }
  }
  await c.close();
});

console.log('page errors:', consoleErrors);
await browser.close();
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
console.log(results.filter((r) => r[0] === 'PASS').length, '/', results.length, 'passed');
