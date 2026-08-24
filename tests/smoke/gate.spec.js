// tests/smoke/gate.spec.js
//
// Auth gate tests — navigating directly to any portal URL without logging in
// must show the login form and keep the dashboard hidden.
//
// Catches accidental removal of the onAuthStateChanged guard, or a portal
// file where the auth check was broken during a refactor.
//
// No credentials needed — these tests intentionally do NOT log in.

const { test, expect } = require('@playwright/test');

const PORTALS = [
  '/admin',
  '/log-pemandu',
  '/borang-permohonan',
  '/dispatch',
  '/portal-kenderaan',
  '/portal-kenderaan-admin',
];

for (const portal of PORTALS) {
  test(`${portal} — unauthenticated visit shows login form, hides dashboard`, async ({ page }) => {
    await page.goto(portal);

    // Wait for onAuthStateChanged to fire and resolve to "no session"
    await page.waitForSelector('#loginView', { state: 'visible', timeout: 15_000 });

    await expect(page.locator('#loginView'), 'Login form must be visible').toBeVisible();
    await expect(page.locator('#secureDashboardWrapper'), 'Dashboard must be hidden').toBeHidden();
  });
}
