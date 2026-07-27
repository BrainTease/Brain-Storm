import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration.
 * BASE_URL defaults to the local dev server; override with PLAYWRIGHT_BASE_URL in CI.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'playwright-report' }]]
    : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* Store trace artifacts on failure */
  outputDir: 'test-results',

  /* Start the Next.js dev server automatically when running locally */
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev -- --port 3001',
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
