// playwright.config.js — VELOS smoke test suite
// Run: npx playwright test
// Report: npx playwright show-report

require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',

  // tests/emulator/*.spec.js writes real trip/fuel/receipt data and expects
  // an emulator-only fixture (e.g. konfigurasi/kenderaan seeded with a fake
  // TEST-9999 plate) to exist. Against this config's live baseURL below,
  // that fixture doesn't exist, so a selectOption() on a nonexistent plate
  // just times out harmlessly today -- but relying on that instead of an
  // explicit exclusion is not a safety margin worth keeping. Only
  // playwright.emulator.config.js (which resets this back to []) may run
  // that directory.
  testIgnore: ['**/emulator/**'],

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
