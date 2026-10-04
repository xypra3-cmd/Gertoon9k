// SEC-04: <script> in bio / link label is rendered as text; only https/mailto/tel links are accepted.
import { test, expect, admin } from './fixtures';

test('SEC-04 XSS payloads are escaped and unsafe links rejected', async ({ page, user }) => {
  const card = (await user.db.from('cards').insert({ owner_id: user.id, slug: `xss-${user.id.slice(0, 8)}`, first_name: 'X', bio: '<script>window.__pwned=1</script><img src=x onerror="window.__pwned=2">', is_published: true }).select().single()).data!;
  const bad = await user.db.from('card_links').insert({ card_id: card.id, kind: 'custom', label: 'x', url: 'javascript:alert(1)' });
  expect(bad.error).not.toBeNull();
  const bad2 = await user.db.from('card_links').insert({ card_id: card.id, kind: 'custom', label: 'x', url: 'http://insecure.mn' });
  expect(bad2.error).not.toBeNull();
  await admin.from('card_links').insert({ card_id: card.id, kind: 'custom', label: '<img src=x onerror="window.__pwned=3">', url: 'https://ok.mn' });

  await page.goto(`/c/${card.slug}`);
  await expect(page.getByText('<script>window.__pwned=1</script>', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
  expect(await page.locator('article script').count()).toBe(0);
});
