// FUN-01: register (Free) → card → publish → QR open from another device → guest exchange →
// upgrade to Pro (QPay sandbox mock) → note + follow-up → dashboard → funnel grows.
import { test, expect, admin, stubTurnstile, ubToday } from './fixtures';
import { mockPay, callFn } from '../api/helpers';
import { randomUUID } from 'node:crypto';

test('FUN-01 full user journey', async ({ page, browser }) => {
  const email = `fun01-${randomUUID().slice(0, 8)}@test.mn`;
  // Register (Free) — terms checkbox is mandatory
  await page.goto('/register');
  await page.fill('#full_name', 'Болд Бат'); // «Овог нэр» → last name Болд, first name Бат
  await page.fill('#email', email);
  await page.fill('#password', 'Qa-Passw0rd!');
  await page.click('button[type=submit]');
  await expect(page.locator('.field-error').first()).toBeVisible();
  await page.check('input[type=checkbox]');
  await page.click('button[type=submit]');
  // First-run wizard: about you → design → publish (≈ 60 s for a real user)
  await page.waitForURL('**/app/welcome');
  await expect(page.locator('#w-first')).toHaveValue('Бат');
  await page.fill('#w-title', 'Борлуулагч');
  await page.getByTestId('welcome-next').click();
  await page.getByRole('button', { name: 'Удирдлага' }).click();
  await page.getByTestId('welcome-next').click();
  await page.getByTestId('welcome-publish').click();
  await expect(page.getByTestId('welcome-done')).toBeVisible();
  const owner = (await admin.from('profiles').select('id').eq('full_name', 'Болд Бат').order('created_at', { ascending: false }).limit(1).single()).data!;
  const created = (await admin.from('cards').select('id, slug, template_id, is_published, published_at').eq('owner_id', owner.id).single()).data!;
  expect(created).toMatchObject({ template_id: 'executive', is_published: true });
  expect(created.published_at).not.toBeNull();
  const cardId = created.id;
  const { slug } = created;

  // Dashboard shows the getting-started checklist with the first steps done
  await page.goto('/app');
  await expect(page.getByTestId('getting-started')).toContainText('2/6');

  // Another device scans the QR and leaves details
  const guestCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await stubTurnstile(guestCtx);
  const g = await guestCtx.newPage();
  await g.goto(`/c/${slug}?src=qr`);
  await expect(g.locator('h1')).toContainText('Бат');
  await g.getByRole('button', { name: 'Миний мэдээллийг үлдээх' }).click();
  await g.fill('#ex-name', 'Зочин Сараа');
  await g.fill('#ex-email', 'saraa@example.mn');
  await g.check('dialog input[type=checkbox]');
  await expect(g.getByText('turnstile-stub')).toBeVisible();
  await g.click('dialog button[type=submit]');
  await expect(g.getByText('Таны мэдээллийг Бат-д илгээлээ')).toBeVisible();
  await guestCtx.close();
  await expect.poll(async () => (await admin.from('card_events').select('event').eq('card_id', cardId)).data!.map((e) => e.event).sort()).toEqual(['exchange', 'qr_open']);

  // Upgrade to Pro through QPay (sandbox mock confirms payment server-side)
  await page.goto('/app/billing');
  await page.getByTestId('pay-pro').click();
  await expect(page.locator('img[alt="QPay QR"]')).toBeVisible();
  const user = (await admin.from('profiles').select('id').eq('full_name', 'Болд Бат').order('created_at', { ascending: false }).limit(1).single()).data!;
  const sub = (await admin.from('subscriptions').select('id').eq('owner_user_id', user.id).single()).data!;
  const pay = (await admin.from('payments').select('*').eq('subscription_id', sub.id).single()).data!;
  await mockPay(pay.qpay_invoice_id, pay.amount_mnt);
  await callFn('qpay-callback', { query: `?inv=${pay.sender_invoice_no}` });
  await expect(page.getByTestId('pay-confirmed')).toBeVisible();
  await page.getByTestId('pay-confirmed').getByRole('button').click();

  // Note + follow-up (simulate "tomorrow" by setting follow-up = today)
  const contact = (await admin.from('contacts').select('id').eq('owner_id', user.id).single()).data!;
  await page.goto(`/app/contacts/${contact.id}`);
  await page.fill('#c-note', 'Даатгал сонирхсон');
  await page.fill('#c-fu', ubToday());
  await page.getByRole('button', { name: 'Хадгалах' }).click();
  await expect(page.getByText('Хадгалагдлаа')).toBeVisible();

  await page.goto('/app');
  await expect(page.getByTestId('followups').getByText('Зочин Сараа')).toBeVisible();
  await page.getByTestId('followups').getByRole('button', { name: 'Холбогдсон' }).click();
  await expect(page.getByTestId('followups')).toHaveCount(0);

  // Funnel: opens 1 → exchange 1 → followed up 1
  await page.goto(`/app/stats?card=${cardId}`);
  await page.getByRole('tab', { name: 'Бүх хугацаа' }).click();
  const funnel = page.getByTestId('funnel');
  await expect(funnel).toContainText('Мэдээлэл үлдээсэн');
  await expect(funnel.locator('li').nth(3)).toContainText('1');
});
