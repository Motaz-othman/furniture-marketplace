import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

config({ path: '.env.test' });

export default defineConfig({
  testDir: './e2e',

  // Run tests sequentially — prevents DB conflicts between tests
  fullyParallel: false,
  workers: 1,

  // Retry once on failure — flaky network or slow CI
  retries: process.env.CI ? 2 : 1,

  // Global timeout per test
  timeout: 60_000,

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],

  use: {
    baseURL: process.env.STOREFRONT_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Slow down actions slightly so Stripe iframes have time to load
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  globalSetup: './global-setup.js',
});
