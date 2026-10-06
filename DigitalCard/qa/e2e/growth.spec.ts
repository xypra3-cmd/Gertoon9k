// Growth features: annual billing toggle, slug lock, viral footer on free cards, AI assist (mocked Claude).
import { test, expect, admin, login } from './fixtures';

test('Billing: yearly/monthly toggle shows prices from the plans table', async ({ page, user }) => {
  const { data: pro } = await admin.from('plans').select('price_mnt, price_annual_mnt').eq('id', 'pro').single();
  await login(page, user.email);
  await page.goto('/app/billing');
  const fmt = (n: number) => new Intl.NumberFormat('mn-MN').format(n);
  await expect(page.getByTestId('price-pro')).toContainText(fmt(pro!.price_annual_mnt)); // yearly is the default
  await page.getByTestId('period-month').click();
  await expect(page.getByTestId('price-pro')).toContainText(fmt(pro!.price_mnt));
});

test('Published card: slug locked in the editor, free card shows «made with» footer', async ({ page, user }) => {
  const { data: card } = await user.db
    .from('cards')
    .insert({ owner_id: user.id, slug: `grow-${user.id.slice(0, 8)}`, first_name: 'Тэст', is_published: true })
    .select()
    .single();
  await login(page, user.email);
  await page.goto(`/app/cards/${card!.id}`);
  await expect(page.locator('#f-slug')).toBeDisabled();
  await page.goto(`/c/${card!.slug}`);
  await expect(page.getByTestId('made-with')).toBeVisible();
});

test('AI assist: bio suggestion fills the bio field for review', async ({ page, proUser }) => {
  const { data: card } = await proUser.db
    .from('cards')
    .insert({ owner_id: proUser.id, slug: `ai-${proUser.id.slice(0, 8)}`, first_name: 'Сараа', title: 'Зөвлөх' })
    .select()
    .single();
  await login(page, proUser.email);
  await page.goto(`/app/cards/${card!.id}`);
  await page.getByTestId('ai-bio').click();
  await expect(page.locator('#f-bio')).not.toHaveValue('');
  // Nothing is saved until the user presses Save
  const { data: stored } = await admin.from('cards').select('bio').eq('id', card!.id).single();
  expect(stored!.bio).toBeNull();
});

test('Event mode: Pro starts an event, new contacts are tagged, Free sees it locked', async ({ page, proUser, user }) => {
  await login(page, proUser.email);
  await page.goto('/app');
  await page.getByLabel('Эвентийн нэр').fill('QA Expo');
  await page.getByRole('button', { name: 'Эхлүүлэх' }).click();
  await expect(page.getByTestId('event-active')).toContainText('QA Expo');
  await proUser.db.from('contacts').insert({ owner_id: proUser.id, name: 'Booth Visitor' });
  const { data: c } = await proUser.db.from('contacts').select('met_where_text, tags').eq('name', 'Booth Visitor').single();
  expect(c).toEqual({ met_where_text: 'QA Expo', tags: ['QA Expo'] });
  await page.reload();
  await expect(page.getByTestId('event-active')).toContainText('1');
  await page.getByRole('button', { name: 'Дуусгах' }).click();
  await expect(page.getByTestId('event-start')).toBeVisible();

  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await login(page, user.email);
  await page.goto('/app');
  await expect(page.getByTestId('event-locked')).toBeVisible();
});
