// tests/smoke/load.spec.js
//
// Load tests — confirms Firestore data actually populates the UI after login.
// These catch broken onSnapshot listeners, failed konfigurasi reads, or
// a deployment where the JS bundle is broken but auth still works.
//
// Env vars required: VELOS_ADMIN_PASS, VELOS_DRIVER_PASS,
//                    VELOS_VCCC_PASS, VELOS_VCCM_PASS, VELOS_USER_PASS,
//                    VELOS_KENDERAAN_PASS

const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/login');

// ─── Admin ──────────────────────────────────────────────────────────────────

test.describe('Admin portal — dashboard loads', () => {

  test('month selector visible and data sections present', async ({ page }) => {
    await login(page, '/admin', process.env.VELOS_ADMIN_PASS);

    // #pilihanBulan renders immediately with the dashboard — no Firestore wait needed.
    await expect(page.locator('#pilihanBulan')).toBeVisible({ timeout: 10_000 });

    // At least one .vx-page section must be in the DOM.
    await expect(page.locator('.vx-page').first()).toBeAttached({ timeout: 10_000 });
  });

});

// ─── Driver portal ──────────────────────────────────────────────────────────

test.describe('Driver portal — Firestore konfigurasi loads', () => {

  test('kenderaan dropdown populated with vehicles from Firestore', async ({ page }) => {
    await login(page, '/log-pemandu', process.env.VELOS_DRIVER_PASS);

    // konfigurasi/kenderaan is fetched via getDoc on initPortal.
    // Dropdown starts empty — wait until at least one vehicle option appears.
    await page.waitForFunction(
      () => {
        const sel = document.querySelector('#kenderaan');
        return sel && sel.options.length > 0;
      },
      { timeout: 15_000 }
    );

    const count = await page.locator('#kenderaan option').count();
    expect(count, 'Kenderaan dropdown must have at least 1 vehicle from Firestore').toBeGreaterThan(0);
  });

});

// ─── Dispatch portal ────────────────────────────────────────────────────────

test.describe('Dispatch portal — VCC title resolves after login', () => {

  test('vccc login → Klinikal title displayed', async ({ page }) => {
    await login(page, '/dispatch', process.env.VELOS_VCCC_PASS);
    await expect(page.locator('#vccTitleDisplay')).toContainText('CLINICAL', { timeout: 10_000 });
  });

  test('vccm login → Jabatan title displayed', async ({ page }) => {
    await login(page, '/dispatch', process.env.VELOS_VCCM_PASS);
    await expect(page.locator('#vccTitleDisplay')).toContainText('PEGAWAI KENDERAAN', { timeout: 10_000 });
  });

});

// ─── Borang Permohonan ──────────────────────────────────────────────────────

test.describe('Borang Permohonan — menu renders after login', () => {

  // #permohonanForm lives inside #view-borang which requires a menu tap to show.
  // #view-menu is the default active view — visible immediately after login.
  test('main menu visible after login', async ({ page }) => {
    await login(page, '/borang-permohonan', process.env.VELOS_USER_PASS);
    await expect(page.locator('#view-menu')).toBeVisible({ timeout: 10_000 });
  });

});

// ─── Portal Kenderaan ───────────────────────────────────────────────────────

test.describe('Portal Kenderaan — dashboard renders after login', () => {

  // Uses #appWrapper (not #secureDashboardWrapper) as the dashboard container.
  test('appWrapper visible after login', async ({ page }) => {
    await login(page, '/portal-kenderaan', process.env.VELOS_KENDERAAN_PASS);
    await expect(page.locator('#appWrapper')).toBeVisible({ timeout: 10_000 });
  });

});
