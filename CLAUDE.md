# VELOS REVAMP — Project Instructions

Revamp complete as of 1 August 2026. All four portals live at https://velos-pitas.web.app

## What this is

Rebuild of VELOS (Vehicle Logistics and Operations System), Hospital Pitas, from GAS + HtmlService + Firebase Realtime Database onto plain HTML/CSS/JS + Cloud Firestore + Firebase Hosting. Same functionality, same UI/design language, kept identical.

- **Working folder:** `D:\VelosRevamp` (this repo)
- **Archived VELOS (DO NOT TOUCH):** `D:\ClaudeXVelos` — stays running untouched throughout. Never edit, only for reference files. 
- **Firebase project:** new and separate from live VELOS, Spark (free) plan only.
- **Maintainer:** Shafiq — sole developer, domain expert, no formal IT background. Expects direct answers and clear reasoning.

## Modules

| File | Replaces | Role |
|---|---|---|
| `admin.html` | `Admin_Velos.html` | Admin dashboard (served at `/admin`) |
| `index.html` | — | Standalone landing page |
| `about.html` | — | Standalone about page |
| `log-pemandu.html` | `Log_Pemandu.html` | Driver movement + fuel log (build first) |
| `borang-permohonan.html` | `Borang_Permohonan.html` | VCC request form (user-facing) |
| `dispatch.html` | `Dispatch.html` | VCC dispatch officer dashboard |

`firebase-config.js` — public Firebase client config, intentionally not gitignored. Each portal wires its own Firebase Auth (init, sign-in, `onAuthStateChanged`) inline; there is no shared `auth.js` helper.

## Firestore schema

`logPergerakan`, `logBahanApi` (no image data), `resitBahanApi` (receipt base64, doc ID = fuel record ID), `permohonanVCC`, `kapasitiKenderaan` (keyed by plat), `sistemMeta` (docs `backupStatus`, `lastFullReset`).

VCC ID format: `VCC-{YYMMDD}-{3-digit random}{C|M}` — `C` = Klinikal, `M` = Jabatan. This suffix is the only field distinguishing queue type. Preserve it exactly.

Date format is permanent: all VCC timestamps stay `dd/MM/yyyy HH:mm` strings in Firestore. Do not migrate to ISO, do not propose it.

## Receipt images — six load-bearing rules (Section 7 of the brief)

1. Separate collection, always. Never a field on the `logBahanApi` document.
2. Never attach an `onSnapshot` listener to `resitBahanApi`.
3. Never bulk-read it — no `getDocs` on the whole collection, not for the dashboard, not for counting. One document at a time, only when the user taps to view a receipt.
4. CSV export excludes it explicitly — never a column, never in scope.
5. Size-check before writing; fail loudly. Over ~900KB base64 → refuse the save with a clear message. Never fail silently.
6. Write the receipt first, then the fuel record. Reverse order reproduces the existing trip-saved-but-fuel-failed duplication bug.

## Authentication

Firebase Auth, email/password. Shared role accounts — not individual staff accounts. The addresses are usernames, not real mailboxes. No staff email is ever stored.

| Account | Portal |
|---|---|
| `driver@pitas.velos` | Portal Pemandu (`log-pemandu.html`) |
| `user@pitas.velos` | Portal Permohonan (`borang-permohonan.html`) |
| `vccc@pitas.velos` | VCC Klinikal (`dispatch.html`) |
| `vccm@pitas.velos` | VCC Jabatan (`dispatch.html`) |
| `admin@pitas.velos` | Admin dashboard (`admin.html`) — full access |
| `kenderaan@pitas.velos` | Portal Kenderaan (reserved, not yet built) |
| `master@pitas.velos` | All four portals — universal fallback login. Each portal's login form retries with this account (same password field) if the portal-specific account fails to sign in. In `dispatch.html`, a successful master login prompts a role picker (Klinikal vs Jabatan) since that portal maps two accounts to two queue types. |
| `visitor@pitas.velos` | Admin dashboard (`admin.html`) — read-only viewer role, gated by fixed UID (`VISITOR_UID`) rather than email. |

No global gate. Each portal page checks its own auth state on load; no session → show that portal's login form. `firestore.rules` is the actual enforcement — the login form alone protects nothing. Passwords live in Firebase Console only, never in this repo.

## Fuel Calculation — Legal Basis (CRITICAL — read before touching fuel logic)

### VELOS adapts Lampiran F — it does not replace or bypass it

`computeFuelStatsForMonth()` in `admin.html` uses the same underlying
methodology as Lampiran F of WP 4.1 (baki awal + belian − baki akhir =
penggunaan), adapted for ambulance operational reality. This is NOT an
exemption from Lampiran F — it is an adaptation of it, legally grounded
in Fasal 6.3.4 below. An earlier framing (13 Aug 2026) incorrectly
described this as an exemption from the formula itself; that was
corrected 14 Aug 2026 and reconfirmed by the system developer
29 Aug 2026. Do not revert to the exemption framing.

### The exemption — Fasal 6.3.4, M.S. 17/117

Pekeliling Perbendaharaan Malaysia WP 4.1 (Pengurusan Kenderaan
Kerajaan, berkuat kuasa 6 Julai 2026), Fasal 6.3.4 (M.S. 17/117):

> "Kenderaan ambulan di bawah Kementerian Kesihatan Malaysia
> dikecualikan daripada peraturan penggunaan Buku Log Kenderaan, Kad
> Inden Bahan Api, Kad Sistem Bayaran Tol dan Parkir Tanpa Resit serta
> pengurusan kunci kenderaan."

**What this clause exempts:** the administrative process — the
physical Buku Log Kenderaan, Kad Inden Bahan Api, Kad Sistem Bayaran
Tol dan Parkir Tanpa Resit, and pengurusan kunci kenderaan.

**What it does NOT exempt:** the underlying fuel-consumption formula.

**What it requires:** KKM must create its own tatacara for recording
ambulance usage and fuel expenditure. VELOS is that tatacara — built
on an adapted version of the Lampiran F calculation, not a replacement
of it.

### Why the adaptation was necessary

Lampiran F assumes a vehicle on a fixed schedule, where a physical
tank reading can be taken on the 1st and last day of the month. KKM
ambulances run 24 hours a day with multiple drivers rotating across
shifts — a scheduled gauge reading on a fixed date doesn't fit that
pattern. VELOS instead infers baki awal/baki akhir from the first and
last fuel fill of the month, reliable only in combination with the
full-fill SOP (drivers are required to fill to full every time).

### Formula (validated via July 2026 backfill)

- `i_val` (baki awal proxy) = `cap − first fill of current month`
- `ii_belian` = sum of all fill litres this month
- `iii_val` (baki akhir proxy) = `cap − last fill of current month`
- `c_guna` = `i_val + ii_belian − iii_val`
- `kadar` = `jarak / c_guna`

**DO NOT change this formula or this legal framing without explicit
instruction from the system developer.**

## Design tokens — carry over exactly

```css
--primary: #0F2A4A;      /* navy */
--secondary: #147D82;    /* teal */
--bg-color: #E9F1F6;
--card-bg: #ffffff;
--text-color: #1C2530;
--text-soft: #5B6774;
--success: #1E8E5A;
--danger: #C62828;
font-family: 'Public Sans', sans-serif; /* 400, 500, 600, 700, 800 */
```

Favicon: `https://i.postimg.cc/3RHFdSvp/Jata-Negara.png`

## Live sync

Firestore `onSnapshot` listeners, not polling — except `resitBahanApi` (see receipt rule 2 above).

## Known pitfalls (Section 12 of the brief — all twelve)

1. **Date parsing:** `dd/MM/yyyy` strings go through a dedicated parser, never `new Date()`. `new Date('15/07/2026')` returns Invalid Date for day > 12.
2. **ID format dates:** always local date parts, never `toISOString()`.
3. **VCC queue type:** determined by ID suffix only (`endsWith('C')` / `endsWith('M')`). No separate field.
4. **String vs number IDs:** IDs are `Date.now()` (numeric) but cross HTML attribute boundaries as strings. Always `String()`-coerce both sides — never strict `===` against a numeric ID.
5. **Fuel entry tiebreak:** sorting `logBahanApi` by date must use `odoPengisian` ascending as secondary key. Raw fuel records carry no time field.
6. **Liter validation:** hard block > 1000. Soft warning above vehicle tank capacity from `kapasitiKenderaan`, fallback 70L. Two drivers have already typed odometer readings into this field.
7. **Character-level bugs:** trace exact literal strings before assuming logic errors. Stray braces, capitalisation in `.includes()`, and single-symbol typos have caused major issues.
8. **VCC 7-day window:** `Menunggu`/`Diproses` requests are NEVER date-limited. Only the read-only Rekod view is. A stuck request must never silently vanish.
9. **Tugasan Akan Datang:** `Diluluskan` requests with `tarikh >= today` come from a full-collection status read, NOT the windowed history query.
10. **Print templates:** `borang-permohonan.html` print/slip templates — preserve structure and layout exactly. Flag anything broken or improvable rather than silently copying it forward.
11. **Base64 receipts:** all six rules above (Section 7 of the brief) are mandatory.
12. **Auth is rules, not UI:** a login form with permissive Security Rules protects nothing. Rules are the enforcement.

## Working discipline (Section 13 of the brief — in full)

- **Strict scope.** Never touch files or configs not explicitly commanded.
- **One file per pass.** Do not bundle edits across files.
- **Permission before executing.** Ask before any file edit, new file, or terminal command.
- **Pros and cons first.** Present before executing any significant change.
- **Verbatim anchors.** Never assume code from memory. Read the actual file first.
- **Language.** Malay/English mix for domain terms (`pemandu`, `kenderaan`, `permohonan`, `bahan api`). Match existing language per context.

## Post-launch work log

- **26 Aug 2026** — `log-pemandu.html`'s `logPergerakan` listener scoped to `tarikh >= start of previous month` (same pattern as `admin.html`'s year-scoped listeners), identified via a Playwright-based Firestore read audit as the largest driver of daily reads. Added a bounded boundary-anchor query (`limit(500)`, `orderBy('tarikh','desc')`, one-time not a listener) feeding `computeOdometerMismatches()` so the odometer-continuity check still catches a mismatch across month boundaries. 7/7 Playwright baseline tests passing (`tests/log-pemandu.spec.js`) before and after. Committed `f9ab005`, pushed to GitHub, deployed to production.

## Local Firebase Emulator (testing only)

Opt-in local testing layer, additive to the live-site Playwright suite — production (`velos-pitas`) is completely unaffected. Every portal file only routes to the emulator when `location.hostname` is `localhost`/`127.0.0.1`; deployed to Hosting, the emulator-connect blocks never fire.

1. **Start the emulators** (Auth :9099, Firestore :8080, UI :4000, Hosting :5000 — see `firebase.json`):
   ```bash
   firebase emulators:start
   ```
2. **Seed the 8 role accounts** into the Auth emulator (UID-pinned to `firestore.rules`, same passwords as `.env`). Idempotent — safe to re-run. Run once the emulators are up, in a second terminal:
   ```bash
   node tests/emulator/seed.js
   ```
   `tests/emulator/seed.js` also exports `seedFirestoreDocs(collectionPath, docsById)` for seeding arbitrary fixture documents (trips, fuel entries, etc.) from any test file.
3. **Run the existing Playwright suite against the emulator** instead of live — a separate config, `npx playwright test` (no args) still defaults to live as before:
   ```bash
   npx playwright test --config=playwright.emulator.config.js
   ```

## What not to do

- Do not touch `D:\ClaudeXVelos` or any live VELOS file.
- Do not change the VCC ID format or suffix convention.
- Do not use `toISOString()` for any date string in an ID or filename.
- Do not use `new Date()` directly on `dd/MM/yyyy` strings.
- Do not propose ISO date migration — permanent decision, never revisit.
- Print/slip templates: preserve structure and layout exactly — flag anything broken or improvable rather than silently copying it forward.
- Do not write any password into any file in this repo.
- Do not put base64 image data anywhere except `resitBahanApi`.