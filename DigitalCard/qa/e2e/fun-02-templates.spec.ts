// FUN-02: 10 templates × 2 colors, long name (40 chars), no photo — visual regression + no overflow.
import { test, expect } from './fixtures';
import { login } from './fixtures';
import { admin } from '../api/helpers';

const TEMPLATES = ['Сонгодог', 'Орчин үеийн', 'Минимал', 'Корпорэйт', 'Бүтээлч', 'Бараан', 'Профайл', 'Бизнес', 'Удирдлага', 'Премиум'];

test('FUN-02 every template renders the same data in both colors', async ({ page, proUser }) => {
  const card = (await proUser.db.from('cards').insert({ owner_id: proUser.id, slug: `tpl-${proUser.id.slice(0, 8)}`, first_name: 'Батбаяраагийнхүүхэдсүрэнжавхлантөгөлдөр', last_name: 'Дорж', title: 'Гүйцэтгэх захирлын орлогч, стратеги төлөвлөлт хариуцсан', company: 'Монгол Технологи ХХК', phone: '+97699112233', email: 'qa@example.mn' }).select().single()).data!;
  await admin.from('card_links').insert([{ card_id: card.id, kind: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com' }]);
  await login(page, proUser.email);
  await page.goto(`/app/cards/${card.id}`);
  const preview = page.locator('[aria-label="Урьдчилан харах"] article');
  for (const [i, name] of TEMPLATES.entries()) {
    await page.getByRole('tab', { name: 'Загвар' }).click();
    await page.getByRole('button', { name, exact: true }).click();
    for (const scheme of ['A', 'B']) {
      await page.getByRole('tab', { name: 'Дизайн' }).click();
      await page.getByRole('button', { name: `Өнгө ${scheme}` }).click();
      const m = await preview.evaluate((el) => {
        const h1 = el.querySelector('h1')!;
        return { overflow: el.scrollWidth > el.clientWidth + 1, text: h1.textContent, ellipsis: getComputedStyle(h1).textOverflow };
      });
      expect(m.overflow, `${name} ${scheme}`).toBe(false);
      expect(m.text).toContain('Батбаяраагийнхүүхэдсүрэнжавхлантөгөлдөр');
      expect(m.ellipsis).not.toBe('ellipsis');
      await expect(preview).toHaveScreenshot(`tpl-${String(i).padStart(2, '0')}-${scheme}.png`);
    }
  }
});
