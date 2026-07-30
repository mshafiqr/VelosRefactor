# VELOS REVAMP — Project Instructions

Full brief: [VELOS_REVAMP_BRIEF.md](VELOS_REVAMP_BRIEF.md). Read it before any substantive work — this file is a working reference, not a replacement.

## What this is

Rebuild of VELOS (Vehicle Logistics and Operations System), Hospital Pitas, from GAS + HtmlService + Firebase Realtime Database onto plain HTML/CSS/JS + Cloud Firestore + Firebase Hosting. Same functionality, same UI/design language, kept identical.

- **Working folder:** `D:\VelosRevamp` (this repo)
- **Live VELOS (DO NOT TOUCH):** `D:\ClaudeXVelos` — stays running untouched throughout. Never read, edit, or reference files there.
- **Firebase project:** new and separate from live VELOS, Spark (free) plan only.
- **Maintainer:** Shafiq — sole developer, domain expert, no formal IT background. Expects direct answers and clear reasoning.

## Modules

| File | Replaces | Role |
|---|---|---|
| `index.html` | `Admin_Velos.html` | Admin dashboard |
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

Firebase Auth, email/password. Six shared role accounts — not individual staff accounts. The addresses are usernames, not real mailboxes. No staff email is ever stored.

| Account | Portal |
|---|---|
| `driver@pitas.velos` | Portal Pemandu (`log-pemandu.html`) |
| `user@pitas.velos` | Portal Permohonan (`borang-permohonan.html`) |
| `vccc@pitas.velos` | VCC Klinikal (`dispatch.html`) |
| `vccm@pitas.velos` | VCC Jabatan (`dispatch.html`) |
| `admin@pitas.velos` | Admin dashboard (`index.html`) — full access |
| `kenderaan@pitas.velos` | Portal Kenderaan (reserved, not yet built) |

No global gate. Each portal page checks its own auth state on load; no session → show that portal's login form. `firestore.rules` is the actual enforcement — the login form alone protects nothing. Passwords live in Firebase Console only, never in this repo.

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
6. **Liter validation:** hard block > 1000. Soft warning above vehicle tank capacity from `kapasitiKenderaan`, fallback 150L. Two drivers have already typed odometer readings into this field.
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
- **When Shafiq says something was tested N times:** take it at face value. Do not suggest user error.

## What not to do

- Do not touch `D:\ClaudeXVelos` or any live VELOS file.
- Do not share Firebase projects between live VELOS and this rebuild.
- Do not use GAS at all — not even for backup or uploads.
- Do not use Realtime Database.
- Do not use Firebase Storage.
- Do not change the VCC ID format or suffix convention.
- Do not use `toISOString()` for any date string in an ID or filename.
- Do not use `new Date()` directly on `dd/MM/yyyy` strings.
- Do not propose ISO date migration — permanent decision, never revisit.
- Print/slip templates: preserve structure and layout exactly — flag anything broken or improvable rather than silently copying it forward.
- Do not write any password into any file in this repo.
- Do not put base64 image data anywhere except `resitBahanApi`.
