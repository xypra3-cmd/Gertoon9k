import { defineConfig, devices } from '@playwright/test';
import { ANON_KEY, API_URL } from '../api/env';

const PORT = 5173;
export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  expect: { timeout: 10_000, toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled' } },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: '../reports/e2e-html', open: 'never' }], ['junit', { outputFile: '../reports/e2e-junit.xml' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    locale: 'mn-MN',
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile\.spec/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec/ },
  ],
  webServer: {
    command: `npm --prefix ../../web run build && npm --prefix ../../web run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      VITE_SUPABASE_URL: API_URL,
      VITE_SUPABASE_ANON_KEY: ANON_KEY,
      VITE_PUBLIC_BASE_URL: `http://localhost:${PORT}`,
      VITE_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
      VITE_DEMO_MODE: 'true',
    },
  },
});
