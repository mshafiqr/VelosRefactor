// One-off diagnostic script: audits Firestore network traffic per VELOS page.
// Usage: node velos-read-audit.js
// Run interactively — a Chromium window opens, you log in manually, then press Enter.

const { chromium } = require('playwright');
const readline = require('readline');

const BASE_URL = 'https://velos-pitas.web.app';

const PAGES = [
  { name: 'Landing (index)', path: '/' },
  { name: 'About', path: '/about' },
  { name: 'Admin Dashboard', path: '/admin' },
  { name: 'Admin JKNS', path: '/admin-jkns' },
  { name: 'Admin Yearly', path: '/admin-yearly' },
  { name: 'Portal Pemandu (Log)', path: '/log-pemandu' },
  { name: 'Borang Permohonan', path: '/borang-permohonan' },
  { name: 'Dispatch (VCC)', path: '/dispatch' },
  { name: 'Portal Kenderaan', path: '/portal-kenderaan' },
  { name: 'Portal Kenderaan Admin', path: '/portal-kenderaan-admin' },
];

function waitForEnter(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(prompt, () => { rl.close(); resolve(); }));
}

function classify(url) {
  let kind = 'other';
  if (/\/Listen\/channel/i.test(url)) kind = 'listen-channel (streaming)';
  else if (/\/Write\/channel/i.test(url)) kind = 'write-channel (streaming)';
  else if (/:runQuery/i.test(url)) kind = 'one-time (runQuery)';
  else if (/:batchGet/i.test(url)) kind = 'one-time (batchGet)';
  else if (/:commit/i.test(url)) kind = 'commit (write)';
  else if (/:listen/i.test(url)) kind = 'listen (grpc-web)';
  return kind;
}

function extractCollections(url, postData) {
  const found = new Set();
  const haystacks = [url, postData || ''];
  for (const text of haystacks) {
    if (!text) continue;
    // Matches ".../documents/<collection>/..." both raw and %2F-encoded
    const patterns = [
      /documents%2F([A-Za-z0-9_]+)/g,
      /documents\/([A-Za-z0-9_]+)/g,
    ];
    for (const re of patterns) {
      let m;
      while ((m = re.exec(text)) !== null) {
        const name = decodeURIComponent(m[1]);
        if (name && name !== '(default)') found.add(name);
      }
    }
  }
  return [...found];
}

async function hasVisiblePasswordField(page) {
  try {
    const el = await page.$('input[type="password"]');
    if (!el) return false;
    return await el.isVisible();
  } catch {
    return false;
  }
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  let currentRoute = 'startup';
  const events = []; // { route, url, method, kind, collections, ts }

  page.on('requestfinished', async (request) => {
    const url = request.url();
    if (!url.includes('firestore.googleapis.com')) return;
    let postData = null;
    try { postData = request.postData(); } catch { /* ignore */ }
    events.push({
      route: currentRoute,
      url,
      method: request.method(),
      kind: classify(url),
      collections: extractCollections(url, postData),
      ts: Date.now(),
    });
  });

  console.log(`\nOpening ${BASE_URL} ...`);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  await waitForEnter(
    '\nLog in with your master account (or the relevant role account) in the Chromium window.\n' +
    'Once logged in, come back here and press Enter to start the audit...\n'
  );

  for (const p of PAGES) {
    currentRoute = p.name;
    const url = BASE_URL + p.path;
    console.log(`\n→ Navigating to ${p.name} (${url})`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    } catch (err) {
      console.log(`   ! navigation error: ${err.message}`);
      continue;
    }

    await page.waitForTimeout(6000);

    if (await hasVisiblePasswordField(page)) {
      console.log(`   ! ${p.name} is showing a login form (session didn't carry over for this role).`);
      await waitForEnter('   Log in on this page if you want its reads counted, then press Enter to continue...\n');
      await page.waitForTimeout(6000);
    }

    const countForPage = events.filter((e) => e.route === p.name).length;
    console.log(`   captured ${countForPage} Firestore request(s) so far for this page`);
  }

  console.log('\nClosing browser...');
  await browser.close();

  // ---- Report ----
  console.log('\n\n================ VELOS FIRESTORE READ AUDIT ================\n');

  if (events.length === 0) {
    console.log('No Firestore traffic captured at all. Check login succeeded and pages loaded.');
    return;
  }

  // Per-page counts
  const byPage = {};
  for (const e of events) byPage[e.route] = (byPage[e.route] || 0) + 1;
  const pageRows = Object.entries(byPage).sort((a, b) => b[1] - a[1]);

  console.log('--- Requests per page (worst first) ---');
  for (const [route, count] of pageRows) {
    console.log(`  ${String(count).padStart(5)}  ${route}`);
  }

  // Per-collection counts (a request can touch multiple collections; count each mention)
  const byCollection = {};
  for (const e of events) {
    const cols = e.collections.length ? e.collections : ['(unknown)'];
    for (const c of cols) byCollection[c] = (byCollection[c] || 0) + 1;
  }
  const colRows = Object.entries(byCollection).sort((a, b) => b[1] - a[1]);

  console.log('\n--- Requests per collection (worst first) ---');
  for (const [col, count] of colRows) {
    console.log(`  ${String(count).padStart(5)}  ${col}`);
  }

  // Per-collection x kind breakdown
  const byCollectionKind = {}; // collection -> kind -> count
  for (const e of events) {
    const cols = e.collections.length ? e.collections : ['(unknown)'];
    for (const c of cols) {
      byCollectionKind[c] = byCollectionKind[c] || {};
      byCollectionKind[c][e.kind] = (byCollectionKind[c][e.kind] || 0) + 1;
    }
  }

  console.log('\n--- Collection x request-kind breakdown ---');
  for (const [col, kinds] of Object.entries(byCollectionKind).sort(
    (a, b) => Object.values(b[1]).reduce((s, n) => s + n, 0) - Object.values(a[1]).reduce((s, n) => s + n, 0)
  )) {
    const parts = Object.entries(kinds)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k}: ${n}`)
      .join(', ');
    console.log(`  ${col}  ->  ${parts}`);
  }

  // Per-page x kind breakdown
  console.log('\n--- Per-page request-kind breakdown ---');
  for (const [route] of pageRows) {
    const kinds = {};
    for (const e of events.filter((e2) => e2.route === route)) {
      kinds[e.kind] = (kinds[e.kind] || 0) + 1;
    }
    const parts = Object.entries(kinds)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k}: ${n}`)
      .join(', ');
    console.log(`  ${route}  ->  ${parts}`);
  }

  console.log('\n--------------------------------------------------------------');
  console.log('NOTE: The Firestore Web SDK multiplexes onSnapshot listeners AND');
  console.log('many one-time getDocs() calls over a single long-polling');
  console.log('"Listen/channel" stream. Raw request counts here are a PROXY for');
  console.log('read volume per page/collection, not an exact 1:1 document-read');
  console.log('count. Use the relative ordering (worst-first) to find hotspots,');
  console.log('not the absolute numbers as literal Firestore billing reads.');
  console.log('================================================================\n');
})();
