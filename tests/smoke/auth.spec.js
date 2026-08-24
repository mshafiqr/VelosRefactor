// tests/smoke/auth.spec.js
//
// Verifies the login cascade on every portal:
//   - Correct portal password   → dashboard visible
//   - Wrong password            → loginError shown, dashboard hidden
//   - Master password           → dashboard visible on any portal
//   - Visitor password (admin)  → dashboard + read-only banner visible
//   - Dispatch master login     → SweetAlert2 role picker appears, resolves to dashboard
//
// Env vars required (set in .env — see .env.example):
//   VELOS_ADMIN_PASS, VELOS_MASTER_PASS, VELOS_VISITOR_PASS,
//   VELOS_DRIVER_PASS, VELOS_USER_PASS, VELOS_VCCC_PASS, VELOS_VCCM_PASS,
//   VELOS_KENDERAAN_PASS

const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/login');

// ─── Admin portal ───────────────────────────────────────────────────────────

test.describe('Admin portal — auth', () => {

  test('admin password → dashboard visible', async ({ page }) => {
    const ok = await login(page, '/admin', process.env.VELOS_ADMIN_PASS);
    expect(ok, 'Dashboard should be visible after correct admin login').toBe(true);
  });

  test('wrong password → loginError shown, dashboard hidden', async ({ page }) => {
    const ok = await login(page, '/admin', 'kata-laluan-salah-9999');
    expect(ok, 'Dashboard must not appear for wrong password').toBe(false);
    await expect(page.locator('#loginError')).not.toBeEmpty();
    await expect(page.locator('#secureDashboardWrapper')).toBeHidden();
  });

  test('master password → dashboard visible', async ({ page }) => {
    const ok = await login(page, '/admin', process.env.VELOS_MASTER_PASS);
    expect(ok, 'Master password should work on admin portal').toBe(true);
  });

  test('visitor password → dashboard + read-only banner visible', async ({ page }) => {
    const ok = await login(page, '/admin', process.env.VELOS_VISITOR_PASS);
    expect(ok, 'Visitor password should grant dashboard access').toBe(true);

    // viewerBanner confirms read-only mode was activated by UID check
    await expect(page.locator('#viewerBanner')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#viewerBanner')).toContainText('Mod Paparan Sahaja');
  });

});

// ─── Driver portal ──────────────────────────────────────────────────────────

test.describe('Driver portal (log-pemandu) — auth', () => {

  test('driver password → dashboard visible', async ({ page }) => {
    const ok = await login(page, '/log-pemandu', process.env.VELOS_DRIVER_PASS);
    expect(ok).toBe(true);
  });

  test('master password → dashboard visible', async ({ page }) => {
    const ok = await login(page, '/log-pemandu', process.env.VELOS_MASTER_PASS);
    expect(ok).toBe(true);
  });

});

// ─── Borang Permohonan ──────────────────────────────────────────────────────

test.describe('Borang Permohonan — auth', () => {

  test('user password → dashboard visible', async ({ page }) => {
    const ok = await login(page, '/borang-permohonan', process.env.VELOS_USER_PASS);
    expect(ok).toBe(true);
  });

});

// ─── Dispatch portal ────────────────────────────────────────────────────────

test.describe('Dispatch portal — auth', () => {

  test('vccc password → dashboard visible', async ({ page }) => {
    const ok = await login(page, '/dispatch', process.env.VELOS_VCCC_PASS);
    expect(ok).toBe(true);
  });

  test('vccm password → dashboard visible', async ({ page }) => {
    const ok = await login(page, '/dispatch', process.env.VELOS_VCCM_PASS);
    expect(ok).toBe(true);
  });

  test('master password → SweetAlert2 role picker appears, resolves to dashboard', async ({ page }) => {
    await page.goto('/dispatch');
    await page.waitForSelector('#loginView', { state: 'visible', timeout: 15_000 });

    await page.fill('#loginPassword', process.env.VELOS_MASTER_PASS);
    await page.press('#loginPassword', 'Enter');

    // Master login triggers Swal2 role picker — click Confirm (= VCC Klinikal)
    await page.waitForSelector('.swal2-popup', { state: 'visible', timeout: 15_000 });
    await page.click('.swal2-confirm');

    await expect(page.locator('#secureDashboardWrapper')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#vccTitleDisplay')).toContainText('CLINICAL', { timeout: 8_000 });
  });

});

// ─── Portal Kenderaan (driver checklist) ────────────────────────────────────

test.describe('Portal Kenderaan — auth', () => {

  test('kenderaan password → dashboard visible', async ({ page }) => {
    const ok = await login(page, '/portal-kenderaan', process.env.VELOS_KENDERAAN_PASS);
    expect(ok).toBe(true);
  });

  test('master password → dashboard visible', async ({ page }) => {
    const ok = await login(page, '/portal-kenderaan', process.env.VELOS_MASTER_PASS);
    expect(ok).toBe(true);
  });

});

// ─── Portal Kenderaan Admin ──────────────────────────────────────────────────

test.describe('Portal Kenderaan Admin — auth', () => {

  // Uses admin@pitas.velos — same account as the main admin dashboard.
  test('admin password → dashboard visible', async ({ page }) => {
    const ok = await login(page, '/portal-kenderaan-admin', process.env.VELOS_ADMIN_PASS);
    expect(ok).toBe(true);
  });

  test('master password → dashboard visible', async ({ page }) => {
    const ok = await login(page, '/portal-kenderaan-admin', process.env.VELOS_MASTER_PASS);
    expect(ok).toBe(true);
  });

});
