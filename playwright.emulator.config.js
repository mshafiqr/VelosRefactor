// playwright.emulator.config.js — opt-in: run the existing Playwright suite
// against the Firebase Emulator Suite instead of live velos-pitas.
//
// Does NOT replace playwright.config.js — that stays the default (live)
// behavior for plain `npx playwright test`. This is an additional, separate
// entry point.
//
// Before running:
//   1. firebase emulators:start
//   2. node tests/emulator/seed.js   (in a second terminal, once emulators are up)
//
// Run:
//   npx playwright test --config=playwright.emulator.config.js

const { defineConfig } = require('@playwright/test');
const base = require('./playwright.config');

module.exports = defineConfig({
  ...base,
  use: {
    ...base.use,
    baseURL: 'http://127.0.0.1:5000',
  },
});
