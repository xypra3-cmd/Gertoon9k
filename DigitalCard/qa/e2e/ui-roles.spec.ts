// Role-based UI checks: Free CRM lock, expired lock, org employee restrictions, admin MFA gate,
// statistics ordering (FUN-03), follow-up dashboard, accessibility basics.
import { test, expect, admin, login } from './fixtures';
import { expirePlan, newUser, setPlan } from '../api/helpers';

test('Free user: CRM fields disabled in UI', async ({ page, user }) => {
  const c = (await user.db.from('contacts').insert({ owner_id: user.id, name: 'Free contact' }).select().single()).data!;
  await login(page, user.email);
  await page.goto(`/app/contacts/${c.id}`);
  await expect(page.locator('#c-note')).toBeDisabled();
  await expect(page.locator('#c-fu')).toBeDisabled();
  await expect(page.getByText('Тэмдэглэл, tag, follow-up нь Pro багцад нээгдэнэ')).toBeVisible();
});

test('Expired user: second card locked, public card still opens', async ({ page }) => {
  const u = await newUser('expui');
  await setPlan(u.id, 'pro');
  const a = (await u.db.from('cards').insert({ owner_id: u.id, slug: `ea-${u.id.slice(0, 8)}`, first_name: 'A', is_published: true }).select().single()).data!;
  const b = (await u.db.from('cards').insert({ owner_id: u.id, slug: `eb-${u.id.slice(0, 8)}`, first_name: 'B', is_published: true }).select().single()).data!;
  await admin.from('cards').update({ created_at: new Date(Date.now() - 864e5).toISOString() }).eq('id', a.id);
  await expirePlan(u.id);
  await login(page, u.email);
  await page.goto(`/app/cards/${b.id}`);
  await expect(page.getByText('Энэ карт түгжээтэй')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Хадгалах' })).toBeDisabled();
  await page.goto(`/c/${b.slug}`);
  await expect(page.locator('h1')).toHaveText('B');
});

test('FUN-03 stats: All time ≥ 30d ≥ 7d ≥ Today', async ({ page }) => {
  await login(page, 'pro@demo.mn', 'Demo1234!');
  await page.goto('/app/stats');
  const vals: number[] = [];
  for (const label of ['Бүх хугацаа', '30 хоног', '7 хоног', 'Өнөөдөр']) {
    await page.getByRole('tab', { name: label }).click();
    await page.waitForTimeout(500);
    vals.push(Number(await page.getByTestId('kpis').locator('.text-2xl').first().textContent()));
  }
  expect(vals).toEqual([...vals].sort((x, y) => y - x));
  expect(vals[0]).toBeGreaterThan(0);
});

test('Org employee: no template tab, locked fields disabled', async ({ page }) => {
  await login(page, 'employee1@demo.mn', 'Demo1234!');
  await page.goto('/app/cards/d0000000-0000-4000-8000-000000000051');
  await expect(page.locator('#f-title')).toBeEnabled();
  await expect(page.getByRole('tab', { name: 'Загвар' })).toHaveCount(0);
  await expect(page.locator('#f-company')).toBeDisabled();
});

test('Platform admin requires MFA before any data', async ({ page }) => {
  await login(page, 'admin@demo.mn', 'Demo1234!');
  await page.goto('/admin');
  await expect(page.getByText('Хоёр шатлалт баталгаажуулалт (TOTP)')).toBeVisible();
  await expect(page.locator('table')).toHaveCount(0);
});

test('every button / link has a text or aria-label', async ({ page }) => {
  await login(page, 'pro@demo.mn', 'Demo1234!');
  for (const u of ['/app', '/app/contacts', '/app/stats', '/app/billing', '/app/settings', '/app/cards/d0000000-0000-4000-8000-000000000031']) {
    await page.goto(u);
    await page.waitForLoadState('networkidle');
    const unlabeled = await page.evaluate(() =>
      [...document.querySelectorAll('button, a[href]')]
        .filter((e) => !(e.textContent || '').trim() && !e.getAttribute('aria-label') && !e.querySelector('img[alt]:not([alt=""])'))
        .map((e) => e.outerHTML.slice(0, 80)),
    );
    expect(unlabeled, u).toEqual([]);
  }
});
