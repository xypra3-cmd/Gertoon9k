// PWA-01: installable (manifest + icons + service worker) and the app shell opens offline.
// The worker must never cache API (Supabase) responses — only same-origin static files.
import { test, expect } from '@playwright/test';

test('PWA-01 installable, offline shell, no API caching', async ({ page, context }) => {
  await page.goto('/login');
  const href = await page.locator('link[rel=manifest]').getAttribute('href');
  const manifest = await (await page.request.get(href!)).json();
  expect(manifest).toMatchObject({ display: 'standalone', start_url: '/app', lang: 'mn' });
  expect(manifest.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}/${i.purpose}`)).toEqual(expect.arrayContaining(['192x192/any', '512x512/any', '512x512/maskable']));
  for (const i of manifest.icons) expect((await page.request.get(i.src)).ok()).toBe(true);

  // Worker installs and controls the page
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await expect(page.locator('#email')).toBeVisible();

  // Offline: the login screen still opens from the cache
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#email')).toBeVisible();
  await context.setOffline(false);

  // Only our own static files are cached — nothing from the API origin
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) urls.push(r.url);
    return urls;
  });
  expect(cached.length).toBeGreaterThan(0);
  expect(cached.every((u) => u.startsWith(new URL(page.url()).origin))).toBe(true);
  expect(cached.some((u) => /\/rest\/|\/auth\/|\/functions\//.test(u))).toBe(false);
});
