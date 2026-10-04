// FUN-04 .vcf with Cyrillic, FUN-05 print PDF 96×61 mm + 300 dpi PNG.
import fs from 'node:fs';
import { test, expect, login } from './fixtures';

test('FUN-04 vCard keeps Cyrillic names (UTF-8)', async ({ page, user }) => {
  const card = (await user.db.from('cards').insert({ owner_id: user.id, slug: `vcf-${user.id.slice(0, 8)}`, first_name: 'Өлзийбаяр', last_name: 'Цэрэндорж', title: 'Үл хөдлөхийн агент', company: 'Хүрээ, ХХК', is_published: true }).select().single()).data!;
  await page.goto(`/c/${card.slug}`);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Утсанд хадгалах' }).click()]);
  expect(dl.suggestedFilename()).toBe(`${card.slug}.vcf`);
  const vcf = fs.readFileSync((await dl.path())!, 'utf8').replace(/\r\n /g, '');
  expect(vcf).toMatch(/^BEGIN:VCARD\r\nVERSION:3\.0\r\n/);
  expect(vcf).toContain('N;CHARSET=UTF-8:Цэрэндорж;Өлзийбаяр;;;');
  expect(vcf).toContain('FN;CHARSET=UTF-8:Цэрэндорж Өлзийбаяр');
  expect(vcf).toContain('ORG;CHARSET=UTF-8:Хүрээ\\, ХХК');
});

test('FUN-05 print PDF is 96×61 mm and PNG is 300 dpi', async ({ page, user }) => {
  const card = (await user.db.from('cards').insert({ owner_id: user.id, slug: `prn-${user.id.slice(0, 8)}`, first_name: 'Хэвлэл', is_published: true }).select().single()).data!;
  await login(page, user.email);
  await page.goto(`/app/cards/${card.id}/print`);
  await expect(page.getByTestId('print-back').locator('svg')).toBeVisible();
  const qrMm = await page.getByTestId('print-back').locator('[role=img]').evaluate((el) => (el.getBoundingClientRect().width / 96) * 25.4);
  expect(qrMm).toBeGreaterThanOrEqual(18);

  const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Хэвлэлийн PDF (crop mark)' }).click()]);
  const raw = fs.readFileSync((await pdf.path())!, 'latin1');
  const boxes = [...raw.matchAll(/\/MediaBox \[([^\]]+)\]/g)].map((m) => m[1]!.trim().split(/\s+/).map(Number));
  expect(boxes.length).toBe(2);
  for (const b of boxes) expect([Math.round((b[2]! / 72) * 254) / 10, Math.round((b[3]! / 72) * 254) / 10]).toEqual([96, 61]);

  const [png] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '300 dpi PNG — Нүүр' }).click()]);
  const buf = fs.readFileSync((await png.path())!);
  expect(Math.abs(buf.readUInt32BE(16) - 1134)).toBeLessThanOrEqual(2);
  expect(Math.abs(buf.readUInt32BE(20) - 720)).toBeLessThanOrEqual(2);
});
