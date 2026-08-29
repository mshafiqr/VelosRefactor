// tests/fixtures-capture/capture-fuel-calc-pin.js
//
// ONE-OFF pin-test capture script -- NOT part of the regular Playwright
// suite (no .spec.js extension, so `npx playwright test` never picks this
// up on its own).
//
// Captures the exact, raw, unrounded output of admin.html's
// computeMonthStats() and computeFuelStatsForMonth() for July 2026 -- the
// backfill month already manually validated as correct by the system
// developer (see CLAUDE.md's fuel-calc work log) -- as a baseline to diff
// against after any FUTURE extraction/refactor of that logic. This file
// only records what the code does today; it does not assert anything is
// "correct".
//
// Relies on the two window exposures added to admin.html purely for this
// purpose (window.computeMonthStats / window.computeFuelStatsForMonth --
// see the comment directly above computeFuelStatsForMonth in admin.html).
// No other code path is touched, and this script never writes to
// Firestore -- read-only against the live site.
//
// Regenerate with:
//   node tests/fixtures-capture/capture-fuel-calc-pin.js
//
// Requires VELOS_ADMIN_PASS in .env (same live admin account already used
// by tests/smoke/*.spec.js).

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { chromium } = require('@playwright/test');
const { login } = require('../helpers/login');

const BASE_URL = 'https://velos-pitas.web.app';
const MONTH = '2026-07';
const OUT_FILE = path.join(__dirname, '..', 'fixtures', 'fuel-calc-pin-2026-07.json');

// Local-time timestamp for the fixture's metadata only (not a VELOS domain
// date/ID) -- built manually rather than via toISOString(), consistent
// with this repo never using toISOString() for any date string.
function localTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function main() {
  if (!process.env.VELOS_ADMIN_PASS) {
    throw new Error('Missing VELOS_ADMIN_PASS in .env');
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();

  const ok = await login(page, '/admin', process.env.VELOS_ADMIN_PASS);
  if (!ok) throw new Error('Admin login failed -- check VELOS_ADMIN_PASS in .env');

  // initDashboard() shows a blocking "Syncing..." SweetAlert2 modal until
  // every onSnapshot/getDoc/getDocs listener has delivered its first
  // payload -- wait for it to close so ambulanceData/fuelDataLog/
  // configKenderaan/cloudTangkiCap are actually populated before calling
  // the calc functions (both read those module-scope vars, not Firestore
  // directly).
  await page.waitForSelector('.swal2-popup', { state: 'visible', timeout: 5_000 }).catch(() => {});
  await page.waitForSelector('.swal2-popup', { state: 'hidden', timeout: 30_000 });

  await page.waitForFunction(
    () => typeof window.computeMonthStats === 'function' && typeof window.computeFuelStatsForMonth === 'function',
    { timeout: 10_000 }
  );

  const captured = await page.evaluate((monthStr) => ({
    monthStats: window.computeMonthStats(monthStr),
    fuelStats: window.computeFuelStatsForMonth(monthStr),
  }), MONTH);

  await browser.close();

  const fixture = {
    _comment: [
      "Pin-test baseline -- exact current output of admin.html's computeMonthStats() and computeFuelStatsForMonth() for July 2026, the backfill month already manually validated as correct (see CLAUDE.md).",
      'For comparison against any FUTURE extraction/refactor of that logic only -- this records what the code does today, not what it "should" do.',
      'Regenerate with: node tests/fixtures-capture/capture-fuel-calc-pin.js',
    ],
    capturedAt: localTimestamp(),
    monthStr: MONTH,
    ...captured,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(fixture, null, 2));
  console.log(`Wrote ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
