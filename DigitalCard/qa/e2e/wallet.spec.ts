// WALLET-UI: dashboard → Wallet → Apple Wallet downloads a .pkpass; Google Wallet opens the save link.
import { test, expect, login } from './fixtures';

test('WALLET-UI add a published card to Apple / Google Wallet', async ({ page, context }) => {
  await login(page, 'pro@demo.mn', 'Demo1234!');
  const wallet = page.getByTestId('wallet').first();
  await wallet.locator('summary').click();
  const download = page.waitForEvent('download');
  await wallet.getByRole('button', { name: 'Apple Wallet' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pkpass$/);

  // pay.google.com is not reachable from CI sandboxes
  await context.route('https://pay.google.com/**', (r) => r.fulfill({ contentType: 'text/html', body: 'google-wallet-stub' }));
  const popup = context.waitForEvent('page');
  await wallet.getByRole('button', { name: 'Google Wallet' }).click();
  const p = await popup;
  await p.waitForLoadState();
  expect(p.url()).toMatch(/^https:\/\/pay\.google\.com\/gp\/v\/save\//);
});
