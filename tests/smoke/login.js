// tests/helpers/login.js — shared login helper for all VELOS portal tests.
//
// Handles two structural differences across portals:
//   - Password input ID: #passwordInput (admin, portal-kenderaan*)
//                     vs #loginPassword  (log-pemandu, borang-permohonan, dispatch)
//   - Dashboard element: #secureDashboardWrapper (admin, log-pemandu, borang, dispatch)
//                     vs #appWrapper              (portal-kenderaan, portal-kenderaan-admin)
//
// Success detection uses #loginView going hidden — works universally across
// all portals regardless of which element the dashboard uses.

const PWD_FIELD = {
  '/admin':                  '#passwordInput',
  '/log-pemandu':            '#loginPassword',
  '/borang-permohonan':      '#loginPassword',
  '/dispatch':               '#loginPassword',
  '/portal-kenderaan':       '#passwordInput',
  '/portal-kenderaan-admin': '#passwordInput',
};

/**
 * Navigate to a portal and attempt login with the given password.
 *
 * Returns true  → loginView became hidden (login succeeded, dashboard shown).
 * Returns false → loginError text appeared (login failed / wrong password).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} portalPath  e.g. '/admin'
 * @param {string} password
 * @returns {Promise<boolean>}
 */
async function login(page, portalPath, password) {
  await page.goto(portalPath);

  // Wait for onAuthStateChanged to resolve — loginView shows when no session
  await page.waitForSelector('#loginView', { state: 'visible', timeout: 15_000 });

  const field = PWD_FIELD[portalPath] ?? '#loginPassword';
  await page.fill(field, password);
  await page.press(field, 'Enter');

  // Race: loginView hides (success) vs error text appears (failure).
  // Using #loginView hidden instead of dashboard-element visible — works
  // for all portals regardless of whether they use #secureDashboardWrapper
  // or #appWrapper as their dashboard container.
  const outcome = await Promise.race([
    page
      .waitForSelector('#loginView', { state: 'hidden', timeout: 25_000 })
      .then(() => 'ok'),
    page
      .waitForFunction(
        () => {
          const el = document.getElementById('loginError');
          return el && el.textContent.trim().length > 0;
        },
        { timeout: 20_000 }
      )
      .then(() => 'err'),
  ]).catch(() => 'timeout');

  return outcome === 'ok';
}

module.exports = { login };
