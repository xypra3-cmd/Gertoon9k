// OPS-01: a browser error reaches Sentry (the mock's ingest) without personal data: no user, no IP
// inference, no breadcrumbs, no query string or hash (reset links carry tokens), e-mail/phone scrubbed.
import { test, expect } from '@playwright/test';
import { MOCK_URL } from '../api/env';

interface Report {
  item: { type: string };
  event: Record<string, unknown> & { exception?: { values: { value: string }[] } };
}
const reports = async (): Promise<Report[]> => (await (await fetch(`${MOCK_URL}/__mock/state`)).json()).sentry;

test('OPS-01 browser errors are reported without personal data', async ({ page }) => {
  const before = (await reports()).length;
  await page.goto('/login?email=bat@gmail.com#access_token=eyJhbGciOi.eyJzdWIi.c2ln');
  // The SDK loads when the page is idle
  await expect.poll(() => page.evaluate(() => performance.getEntriesByType('resource').some((r) => /\/esm-[\w-]+\.js$/.test(r.name))), { timeout: 15_000 }).toBe(true);
  await page.waitForTimeout(500);
  await page.evaluate(() => setTimeout(() => { throw new Error('save failed for bat@gmail.com, call 99112233'); }));

  await expect.poll(async () => (await reports()).slice(before).some((r) => r.event?.exception), { timeout: 10_000 }).toBe(true);
  const event = (await reports()).slice(before).find((r) => r.event?.exception)!.event;
  expect(event.exception!.values[0]!.value).toBe('save failed for [email], call [number]');
  expect(event.request).toEqual({ url: expect.stringMatching(/\/login$/) });
  expect(event.environment).toBe('e2e');
  for (const key of ['user', 'breadcrumbs', 'server_name']) expect(event[key]).toBeUndefined();
  expect((event.sdk as { settings?: { infer_ip?: string } }).settings?.infer_ip).toBe('never');
  expect(JSON.stringify(event)).not.toMatch(/bat@gmail|99112233|access_token|eyJhbGciOi/);
});
