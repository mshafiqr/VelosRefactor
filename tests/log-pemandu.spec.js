// tests/log-pemandu.spec.js
//
// PRE-FIX BASELINE for log-pemandu.html — confirms current behavior is
// correct BEFORE the logPergerakan onSnapshot listener gets scoped
// (see: unscoped listener at log-pemandu.html:570 vs. admin.html's
// year-scoped equivalent). All tests here must pass on current code.
//
// Manual login by design: headful Chromium, waits for you to log in
// (driver@pitas.velos or master) — no Enter keypress needed, login is
// auto-detected the same way tests/helpers/login.js does it: log-pemandu.html
// handles auth inline (no URL change), toggling #loginView -> hidden and
// #secureDashboardWrapper -> visible once Firebase Auth resolves.
//
// Run: npx playwright test tests/log-pemandu.spec.js

const { test, expect, chromium } = require('@playwright/test');

const BASE_URL = 'https://velos-pitas.web.app';

let browser, context, page;
const consoleErrors = [];
const pageErrors = [];

test.describe.serial('log-pemandu.html — pre-fix baseline', () => {

  test('0. setup — open page, wait for manual login (auto-detected)', async () => {
    test.setTimeout(0); // human-paced login, no artificial timeout

    browser = await chromium.launch({ headless: false });
    context = await browser.newContext();
    page = await context.newPage();

    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(`${BASE_URL}/log-pemandu`, { waitUntil: 'domcontentloaded' });

    console.log(
      '\n=== log-pemandu.html baseline tests ===\n' +
      'Log in as driver@pitas.velos (or master) in the Chromium window.\n' +
      'No Enter needed — this auto-continues once the dashboard appears (up to 120s)...\n'
    );

    await expect(page.locator('#loginView')).toBeVisible({ timeout: 15_000 });
    await page.waitForSelector('#loginView', { state: 'hidden', timeout: 120_000 });
    await expect(page.locator('#secureDashboardWrapper')).toBeVisible({ timeout: 15_000 });
  });

  test('1. page load — no console errors or uncaught exceptions', async () => {
    expect(consoleErrors, `console errors so far: ${JSON.stringify(consoleErrors, null, 2)}`).toEqual([]);
    expect(pageErrors, `uncaught page errors so far: ${JSON.stringify(pageErrors, null, 2)}`).toEqual([]);
  });

  test('2. editEntry (line 1223) — action type and month-scope check', async () => {
    // Static-code findings (log-pemandu.html):
    //  - window.editEntry (line 1222-1223) backs the "Kemaskini" button per
    //    row (line 1161) — an EDIT action. Delete is a separate function,
    //    window.deleteEntry, wired to the "Padam" button.
    //  - Its lookup — ambulanceData.find(r => String(r.id) === String(id)) —
    //    reads from ambulanceData, the FULL onSnapshot array (line 570-575),
    //    not the month-filtered `filteredData` used for rendering. Nothing
    //    in editEntry itself restricts it to the current month.
    //  - In current usage it's only *reachable* via a button rendered from
    //    filteredData (line 1134/1161), so today it's UI-constrained to the
    //    visible month, not code-constrained.
    console.log('\n[TEST 2] window.editEntry (line 1222-1223):');
    console.log('  - Backs the "Kemaskini" button -> EDIT action (delete is the separate "Padam" button / window.deleteEntry).');
    console.log('  - Lookup source is ambulanceData (full unscoped listener array), not filteredData.');
    console.log('  - Only reachable today via a button on an already-rendered (month-filtered) row -> UI-constrained, not code-constrained.');

    const firstEditBtn = page.locator('#dataTableBody tr .btn-edit-action').first();
    await expect(firstEditBtn, 'expected at least one edit button in the current month table').toBeVisible();

    const row = page.locator('#dataTableBody tr').first();
    const rowDate = await row.locator('td').nth(0).innerText();

    await firstEditBtn.click();

    await expect(page.locator('#formHeader')).toHaveText('Kemaskini Rekod Pergerakan');
    await expect(page.locator('#tarikh')).toHaveValue(rowDate);
    console.log(`  - LIVE CONFIRMATION: clicking "Kemaskini" on the row dated ${rowDate} set #formHeader to "Kemaskini Rekod Pergerakan" and populated #tarikh with that date -> genuinely an edit action, not delete or display-only.`);

    const scopeCheck = await page.evaluate(() => ({
      totalInMemory: typeof ambulanceData !== 'undefined' ? ambulanceData.length : null,
      currentMonth: typeof targetedMonth !== 'undefined' ? targetedMonth : null,
      inCurrentMonth: (typeof ambulanceData !== 'undefined' && typeof targetedMonth !== 'undefined')
        ? ambulanceData.filter((r) => r.tarikh && r.tarikh.startsWith(targetedMonth)).length
        : null,
    }));
    console.log(`  - ambulanceData in memory: ${scopeCheck.totalInMemory} total records, ${scopeCheck.inCurrentMonth} in current month (${scopeCheck.currentMonth}).`);
    if (scopeCheck.totalInMemory !== null && scopeCheck.inCurrentMonth !== null) {
      if (scopeCheck.totalInMemory > scopeCheck.inCurrentMonth) {
        console.log('  - CONFIRMED: ambulanceData holds records outside the visible month -> editEntry\'s lookup is not code-scoped to the current month, only UI-scoped via which buttons exist.');
      } else {
        console.log('  - ambulanceData currently only contains the visible month\'s records -> cannot demonstrate cross-month reach from live data alone; the code-level conclusion above still stands.');
      }
    }

    // Restore create mode so later tests aren't affected.
    await page.locator('#btnCancelEdit').click();
  });

  test('3. trip table renders at least one row on default month load', async () => {
    const rows = page.locator('#dataTableBody tr');
    await expect(rows.first()).toBeVisible();

    const count = await rows.count();
    expect(count, 'expected at least one row in the default month view').toBeGreaterThan(0);

    const firstRowCells = await rows.first().locator('td').count();
    expect(firstRowCells, 'expected a real data row (15 cells), not the "Tiada rekod" placeholder').toBe(15);
  });

  test('4. month navigation — previous month then back to current', async () => {
    const monthFilter = page.locator('#userMonthFilter');
    await expect(monthFilter).toBeVisible();

    const options = await monthFilter.locator('option').allTextContents();
    console.log(`\n[TEST 4] Month dropdown options: ${JSON.stringify(options)}`);

    const originalValue = await monthFilter.inputValue();
    const originalRowsHTML = await page.locator('#dataTableBody').innerHTML();

    const prevLabel = options.find((o) => o.includes('Bulan Lepas'));
    const currentLabel = options.find((o) => o.includes('Semasa'));
    expect(prevLabel, 'expected a "Bulan Lepas" (previous month) option').toBeTruthy();
    expect(currentLabel, 'expected a "Semasa" (current month) option').toBeTruthy();

    await monthFilter.selectOption({ label: prevLabel });
    await page.waitForTimeout(500);
    const prevMonthRowsHTML = await page.locator('#dataTableBody').innerHTML();
    expect(prevMonthRowsHTML, 'table content should change after switching month').not.toBe(originalRowsHTML);

    await monthFilter.selectOption({ label: currentLabel });
    await page.waitForTimeout(500);
    const restoredRowsHTML = await page.locator('#dataTableBody').innerHTML();
    expect(restoredRowsHTML, 'table content should return to original state after switching back').toBe(originalRowsHTML);
    await expect(monthFilter).toHaveValue(originalValue);
  });

  test('5. odometer boundary — previous month vs current month', async () => {
    const monthFilter = page.locator('#userMonthFilter');
    const options = await monthFilter.locator('option').allTextContents();
    const currentLabel = options.find((o) => o.includes('Semasa'));
    const prevLabel = options.find((o) => o.includes('Bulan Lepas'));

    // Table is sorted newest-first (line 1125-1127), so within the previous
    // month's view, the FIRST row for a given vehicle is its LAST trip of
    // that month.
    await monthFilter.selectOption({ label: prevLabel });
    await page.waitForTimeout(500);
    const prevMonthLastByVehicle = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('#dataTableBody tr')];
      const seen = {};
      for (const r of rows) {
        const cells = r.querySelectorAll('td');
        if (cells.length !== 15) continue;
        const vehicle = cells[3].querySelector('strong')?.textContent?.trim();
        const odoAkhir = Number(cells[5].textContent.trim());
        if (vehicle && !(vehicle in seen)) seen[vehicle] = odoAkhir; // first occurrence = most recent
      }
      return seen;
    });

    // In the current month's view, the LAST row for a given vehicle is its
    // FIRST (earliest) trip of that month.
    await monthFilter.selectOption({ label: currentLabel });
    await page.waitForTimeout(500);
    const currentMonthFirstByVehicle = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('#dataTableBody tr')];
      const seen = {};
      for (const r of rows) {
        const cells = r.querySelectorAll('td');
        if (cells.length !== 15) continue;
        const vehicle = cells[3].querySelector('strong')?.textContent?.trim();
        const odoAwal = Number(cells[4].textContent.trim());
        if (vehicle) seen[vehicle] = odoAwal; // keep overwriting -> last occurrence wins = earliest trip
      }
      return seen;
    });

    const sharedVehicles = Object.keys(prevMonthLastByVehicle).filter((v) => v in currentMonthFirstByVehicle);

    console.log('\n[TEST 5] Odometer boundary check (previous month -> current month):');
    console.log('  Previous month last-trip odoAkhir per vehicle:', prevMonthLastByVehicle);
    console.log('  Current month first-trip odoAwal per vehicle:', currentMonthFirstByVehicle);

    if (sharedVehicles.length === 0) {
      console.log('  INCONCLUSIVE: no vehicle has trips recorded in both months — cannot check this boundary with current data.');
      return;
    }

    for (const vehicle of sharedVehicles) {
      const prevEnd = prevMonthLastByVehicle[vehicle];
      const currStart = currentMonthFirstByVehicle[vehicle];
      const relation = currStart < prevEnd ? '<' : currStart > prevEnd ? '>' : '=';
      console.log(`  ${vehicle}: previous-month odoAkhir=${prevEnd}, current-month odoAwal=${currStart} (current-month odoAwal ${relation} previous-month odoAkhir)`);

      if (currStart < prevEnd) {
        const hasWarning = await page.evaluate((veh) => {
          const rows = [...document.querySelectorAll('#dataTableBody tr')];
          return rows.some((r) => {
            const cells = r.querySelectorAll('td');
            if (cells.length !== 15) return false;
            const cellVehicle = cells[3].querySelector('strong')?.textContent?.trim();
            return cellVehicle === veh && cells[3].innerHTML.includes('⚠️');
          });
        }, vehicle);
        console.log(`  -> current-month odoAwal < previous-month odoAkhir for ${vehicle}: mismatch warning visible = ${hasWarning}`);
        expect(hasWarning, `expected a mismatch warning for ${vehicle} (odoAwal ${currStart} < prior odoAkhir ${prevEnd})`).toBe(true);
      }
    }
  });

  test('6. no uncaught JS errors across all steps', async () => {
    expect(consoleErrors, `console errors accumulated across the run: ${JSON.stringify(consoleErrors, null, 2)}`).toEqual([]);
    expect(pageErrors, `uncaught page errors accumulated across the run: ${JSON.stringify(pageErrors, null, 2)}`).toEqual([]);
    await browser.close();
  });

});
