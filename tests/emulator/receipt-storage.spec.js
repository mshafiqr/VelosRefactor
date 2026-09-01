// tests/emulator/receipt-storage.spec.js
//
// Exercises the Firebase Storage receipt migration end-to-end, against the
// Firebase Emulator Suite only -- never live. Covers the path nothing else
// in the suite touches: compress -> upload to Storage -> URL lands in
// resitBahanApi -> delete cascades to deleteObject() cleanup.
//
// Before running:
//   1. firebase emulators:start
//   2. node tests/emulator/seed.js               (seeds the 8 Auth accounts)
//
// Run:
//   npx playwright test tests/emulator/receipt-storage.spec.js --config=playwright.emulator.config.js
//
// This spec seeds its own konfigurasi/kenderaan + konfigurasi/pemandu
// fixtures (driver login needs at least one selectable vehicle/driver) and
// uses distinctive odoAwal/odoAkhir sentinel values (999000/999050) to find
// its own trip via the Admin SDK afterward, so it stays correct regardless
// of whatever else is already sitting in the emulator's Firestore.

require('dotenv').config();
const path = require('path');
const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/login');
const { seedFirestoreDocs } = require('./seed');

// Admin SDK reads/writes bypass Security Rules entirely -- used here only
// to seed fixtures and to independently verify what the browser-driven
// upload/delete actually did to Firestore/Storage, never to stand in for
// the app's own rule-gated client calls (those still run through the page).
process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';
const { getStorage } = require('firebase-admin/storage');
const { app, db } = require('./seed');

// Must match firebase-config.js's storageBucket -- the emulator creates a
// bucket with this name on first use, same as the client SDK connecting to
// it does; no GCP-side provisioning needed locally.
const STORAGE_BUCKET = 'velos-pitas.firebasestorage.app';
const bucket = getStorage(app).bucket(STORAGE_BUCKET);

const TEST_PLATE = 'TEST-9999';
const TEST_DRIVER = 'Playwright Test Driver';
const RECEIPT_FIXTURE = path.join(__dirname, '../fixtures/test-receipt.png');

// Storage download URLs (both emulator http:// and production https://)
// share the same /o/{encoded-path}?alt=media&token=... shape -- pull the
// exact object path back out so file existence can be checked precisely,
// rather than listing everything under a prefix. A prefix listing would
// pick up leftover files from any previous run of this same spec against
// a persistent (not freshly wiped) emulator and make the count assertions
// flaky for reasons that have nothing to do with whether THIS run's
// upload/cleanup actually worked.
function storagePathFromDownloadUrl(url) {
  const match = url.match(/\/o\/([^?]+)/);
  if (!match) throw new Error(`Could not parse a Storage object path out of: ${url}`);
  return decodeURIComponent(match[1]);
}

async function swalWait(page, titleSubstring) {
  await expect(page.locator('.swal2-popup')).toContainText(titleSubstring, { timeout: 20_000 });
}
async function swalConfirm(page, titleSubstring) {
  await swalWait(page, titleSubstring);
  await page.locator('.swal2-confirm').click();
}

test.describe.serial('log-pemandu.html — Firebase Storage receipt migration (emulator only)', () => {
  let page;
  let tripId;
  let fillId;
  let storagePath;

  test.beforeAll(async () => {
    await seedFirestoreDocs('konfigurasi', {
      kenderaan: { ambulans: [TEST_PLATE], jabatan: [] },
      pemandu: { senarai: [TEST_DRIVER] },
    });
  });

  test('0. setup — log in as driver', async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    const ok = await login(page, '/log-pemandu', process.env.VELOS_DRIVER_PASS);
    expect(ok, 'driver login must succeed against the emulator').toBe(true);
  });

  test('1. submit a trip with a fuel fill + receipt photo', async () => {
    // No patients on this trip -- remove the default auto-added row (its
    // Wad Asal / Destinasi fields are `required` while visible, per the
    // form's own "Padam Kes" guidance for trips with no patient).
    await page.locator('#patientsContainer .btn-remove-patient').click();

    await page.fill('#masaMula', '08:00');
    await page.fill('#masaTamat', '09:00');
    await page.selectOption('#kenderaan', TEST_PLATE);
    await page.selectOption('#namaPemandu', TEST_DRIVER);
    await page.fill('#namaPengiringInput', 'Tiada Pengiring');
    await page.fill('#odoAwal', '999000');
    await page.fill('#odoAkhir', '999050');

    // isRefueled defaults to 'Ya' with one fuel-fill-row already present.
    await page.locator('.fuelFillLiter').first().fill('12.345');
    await page.locator('.fuelFillResit').first().setInputFiles(RECEIPT_FIXTURE);

    // previewFuelFillReceipt() compresses async (FileReader + canvas) --
    // wait for the preview thumbnail before submitting, or dataset.base64
    // won't be populated yet and the fill would silently upload nothing.
    await expect(page.locator('.fuelFillPreview').first()).toBeVisible({ timeout: 10_000 });

    await page.locator('#btnSimpanLog').click();
    await swalConfirm(page, 'SISTEM LOG KENDERAAN');
    await swalConfirm(page, 'Berjaya');
  });

  test('2. trip + fuel fill land in Firestore; receipt lands in Storage as a URL, not base64', async () => {
    // No orderBy/limit(1) here on purpose: a previous run of this same spec
    // against a not-freshly-wiped emulator can leave stale docs behind with
    // the same odoAwal sentinel (unifiedID/doc-id is Date.now(), so each
    // run's doc is distinct but the sentinel value repeats). Fetch every
    // match and take the one with the highest id (= most recently created,
    // since id is Date.now() at save time) so this run always finds its
    // own doc rather than an arbitrary one Firestore happens to return
    // first -- also sidesteps needing a composite index for a where+orderBy
    // combination that only exists for this test's own convenience.
    const tripSnap = await db.collection('logPergerakan').where('odoAwal', '==', 999000).get();
    expect(tripSnap.empty, 'seeded trip should exist in logPergerakan').toBe(false);
    const newestTrip = tripSnap.docs.map((d) => d.data()).reduce((a, b) => (b.id > a.id ? b : a));
    tripId = newestTrip.id;

    const fuelSnap = await db.collection('logBahanApi').where('logId', '==', tripId).limit(1).get();
    expect(fuelSnap.empty, 'trip should have exactly one logBahanApi fill').toBe(false);
    fillId = fuelSnap.docs[0].id;

    // Rule 1 (CLAUDE.md Section 7): resit never lands on the logBahanApi doc.
    expect(fuelSnap.docs[0].data().resit).toBeUndefined();

    const resitSnap = await db.collection('resitBahanApi').doc(String(fillId)).get();
    expect(resitSnap.exists, 'resitBahanApi doc should exist for this fill').toBe(true);
    const resitValue = resitSnap.data().resit;
    // The Storage emulator serves download URLs over plain http:// (no
    // local TLS); production always returns https://. Assert "URL, not a
    // base64 blob" -- the same distinction isStorageUrlResit() makes --
    // rather than hardcoding a scheme that's emulator-environment-specific.
    expect(resitValue.startsWith('http'), `resit should be a Storage URL, got: ${resitValue}`).toBe(true);
    expect(resitValue.startsWith('data:image'), 'resit should not be a base64 data URI after migration').toBe(false);

    storagePath = storagePathFromDownloadUrl(resitValue);
    expect(storagePath.startsWith(`resit/${TEST_PLATE}/`), `expected path under resit/${TEST_PLATE}/, got: ${storagePath}`).toBe(true);
    const [exists] = await bucket.file(storagePath).exists();
    expect(exists, `uploaded file should exist in Storage at ${storagePath}`).toBe(true);
  });

  test('3. deleting the trip removes the Firestore docs AND the Storage file', async () => {
    const deleteBtn = page.locator(`button[onclick="window.deleteEntry(${tripId})"]`);
    await expect(deleteBtn, 'delete button for the seeded trip should be visible').toBeVisible({ timeout: 15_000 });
    await deleteBtn.click();
    await swalConfirm(page, 'Padam Rekod');
    await swalConfirm(page, 'Terpadam');

    const [tripDoc, fuelDoc, resitDoc] = await Promise.all([
      db.collection('logPergerakan').doc(String(tripId)).get(),
      db.collection('logBahanApi').doc(String(fillId)).get(),
      db.collection('resitBahanApi').doc(String(fillId)).get(),
    ]);
    expect(tripDoc.exists, 'logPergerakan doc should be gone').toBe(false);
    expect(fuelDoc.exists, 'logBahanApi doc should be gone').toBe(false);
    expect(resitDoc.exists, 'resitBahanApi doc should be gone').toBe(false);

    const [existsAfter] = await bucket.file(storagePath).exists();
    expect(existsAfter, `Storage file at ${storagePath} should be deleted by deleteResitStorageFiles(), not left orphaned`).toBe(false);
  });
});
