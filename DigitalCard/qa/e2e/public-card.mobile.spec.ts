// Public card on a phone (Pixel 7): main info above the fold, no horizontal scroll, analytics.
import { test, expect, admin } from './fixtures';

test('public card fits a phone screen and tracks qr_open', async ({ page }) => {
  const card = (await admin.from('cards').select('id').eq('slug', 'saraa-g').single()).data!;
  const before = (await admin.from('card_events').select('id').eq('card_id', card.id).eq('event', 'qr_open')).data!.length;
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/c/saraa-g?src=qr');
  for (const loc of [page.locator('h1'), page.getByRole('link', { name: 'Залгах' }), page.getByRole('button', { name: 'Утсанд хадгалах' }), page.getByRole('button', { name: 'Миний мэдээллийг үлдээх' })]) {
    const box = await loc.boundingBox();
    expect(box && box.y + box.height <= 780).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await expect.poll(async () => (await admin.from('card_events').select('id').eq('card_id', card.id).eq('event', 'qr_open')).data!.length).toBe(before + 1);
});
