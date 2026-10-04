import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';
import { admin, newUser, setPlan, type TestUser } from '../api/helpers';

/** Cloudflare is not reachable from CI sandboxes: replace the widget with a stub that yields the
 *  documented dummy token (the backend verifies it against the Turnstile mock). */
export async function stubTurnstile(ctx: BrowserContext) {
  await ctx.route('https://challenges.cloudflare.com/**', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `window.turnstile={render:function(el,o){el.textContent='turnstile-stub';setTimeout(function(){o.callback('XXXX.DUMMY.TOKEN.XXXX')},50);return 'w'},remove:function(){},reset:function(){}};`,
    }),
  );
}

export async function login(page: Page, email: string, password = 'Qa-Passw0rd!') {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type=submit]');
  await page.waitForURL('**/app');
}

export const test = base.extend<{ user: TestUser; proUser: TestUser }>({
  context: async ({ context }, use) => {
    await stubTurnstile(context);
    await use(context);
  },
  user: async ({}, use) => use(await newUser('e2e')),
  proUser: async ({}, use) => {
    const u = await newUser('e2epro');
    await setPlan(u.id, 'pro');
    await use(u);
  },
});

export { expect, admin };
export const ubToday = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
