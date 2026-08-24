// playwright.config.js — VELOS smoke test suite
// Run: npx playwright test
// Report: npx playwright show-report

require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',

  // Run tests sequentially — avoid hammering Firebase Auth
  // with parallel sign-in requests from the same IP.
  fullyParallel: false,
  workers: 1,

  timeout: 30_000,       // per-test timeout
  retries: 1,            // one retry on flaky network

  reporter: [
    ['list'],                            // real-time output in terminal
    ['html', { open: 'never' }],        // full HTML report (npx playwright show-report)
  ],

  use: {
    baseURL: 'https://velos-pitas.web.app',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
