// SEC-PK: passkeys — add one in Settings, sign out, sign back in without a password.
// Chrome's virtual authenticator stands in for Face ID / Touch ID / Windows Hello.
import { test, expect, login } from './fixtures';

test('SEC-PK passkey add → passwordless sign-in → remove', async ({ page, user }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  });

  await login(page, user.email);
  await page.goto('/app/settings');
  const section = page.getByTestId('passkeys');
  await section.getByTestId('passkey-add').click();
  await expect(section.getByText('Passkey нэмэгдлээ')).toBeVisible();
  await expect(section.locator('li')).toHaveCount(1);

  // Sign out, then sign in with the passkey only (no email, no password typed)
  await page.getByRole('button', { name: 'Гарах' }).first().click();
  await page.goto('/login');
  await page.getByTestId('passkey-signin').click();
  await page.waitForURL('**/app');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('QA');

  // Remove it again
  await page.goto('/app/settings');
  page.once('dialog', (d) => void d.accept());
  await section.getByRole('button', { name: 'Устгах' }).click();
  await expect(section.locator('li')).toHaveCount(0);
});
