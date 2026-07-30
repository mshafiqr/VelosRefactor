# VELOS REVAMP — CLAUDE CODE MASTER BRIEF
**GAS + Firebase RTDB → Plain JS + Firestore**
*Revision 2 — 28 July 2026. Supersedes the earlier "Project September" brief entirely.*

---

## 1. WHAT THIS IS

A full architectural rebuild of VELOS (Vehicle Logistics and Operations System), Hospital Pitas, on a modern stack — keeping all existing functionality, UI language, and design language identical.

**The live GAS version stays running untouched throughout.** This is a parallel build. Cut over only when the rebuild is stable and tested.

**Maintainer:** Shafiq — sole developer, no formal IT background, AI-assisted development. Domain expert. Expects direct answers and clear reasoning.

**Working folder:** `D:\VelosRevamp`
**Live VELOS folder (DO NOT TOUCH):** `D:\ClaudeXVelos`

---

## 2. WHAT WE ARE REPLACING

Current stack, do not modify:

- Frontend: Google Apps Script `HtmlService`, 4 HTML templates
- Backend: GAS server functions via `google.script.run`
- Database: Firebase Realtime Database (REST via `UrlFetchApp`)
- Receipt storage: Google Drive folder `Resit_VELOS_V2`
- Routing: `doGet(e)` in `Server_Core` dispatching on `?view=`

Why: GAS HtmlService is sandboxed, slow, and untestable in a browser. No DevTools, no working console, and `google.script.run` fails cryptically.

---

## 3. TARGET ARCHITECTURE

| Layer | Current | Target |
|---|---|---|
| Frontend | GAS HtmlService | Plain HTML/CSS/JS |
| Backend | GAS server functions | Firestore SDK, client-side direct |
| Database | Realtime Database | Cloud Firestore |
| Receipt storage | Google Drive | **Compressed base64 in Firestore** |
| Hosting | GAS web app URL | Firebase Hosting |
| Auth | Client-side password string | **Firebase Auth + Firestore Security Rules** |
| Routing | `?view=` param | Separate HTML file per module |

**Firebase project:** new and separate from live VELOS.
Display name `VELOS`. Project ID is permanent and globally unique — set at creation.

**Firebase Storage is NOT used.** Since 3 February 2026 it requires the Blaze plan and a linked credit card. Everything here stays on the free Spark plan.

---

## 4. MODULES

| File | Replaces | Role |
|---|---|---|
| `index.html` | `Admin_Velos.html` | Admin dashboard |
| `log-pemandu.html` | `Log_Pemandu.html` | Driver movement + fuel log |
| `borang-permohonan.html` | `Borang_Permohonan.html` | VCC request form (user-facing) |
| `dispatch.html` | `Dispatch.html` | VCC dispatch officer dashboard |

---

## 5. FIRESTORE SCHEMA

| RTDB Path | Firestore Collection | Notes |
|---|---|---|
| `LogPergerakan/{id}` | `logPergerakan` | Driver movement log |
| `LogBahanApi/{id}` | `logBahanApi` | Fuel records — **no image data** |
| — | `resitBahanApi` | **NEW.** Receipt images, base64. Doc ID = fuel record ID |
| `PermohonanVCC/{id}` | `permohonanVCC` | VCC requests |
| `KapasitiKenderaan/{plat}` | `kapasitiKenderaan` | Per-vehicle tank capacity |
| `SistemMeta/backupStatus` | `sistemMeta` doc `backupStatus` | Backup status |
| `SistemMeta/lastFullReset` | `sistemMeta` doc `lastFullReset` | Last full reset |

### VCC ID format — unchanged
`VCC-{YYMMDD}-{3-digit random}{C|M}`
`C` = Klinikal, `M` = Jabatan. **This suffix is the only field distinguishing queue type. Preserve it exactly.**

### Date format — permanent, non-negotiable
All VCC timestamps stay `dd/MM/yyyy HH:mm` strings in Firestore. Decision made 22/7/2026. **Do not migrate to ISO. Do not propose migrating to ISO.**
Any sort or compare on these strings goes through a `dd/MM/yyyy` parser, never `new Date()` directly.

### ID and filename dates
Any `yyMMdd` or `yyyy-MM-dd` string in an ID or filename is built from local date parts (`getFullYear()`, `getMonth()`, `getDate()`). **Never `toISOString()`** — it returns UTC and gives the wrong date between midnight and 08:00 MYT.

---

## 6. AUTHENTICATION

Firebase Auth, email/password. **Six shared role accounts — not individual staff accounts.** The addresses are usernames, not real mailboxes. No staff email is ever stored.

| Account | Portal |
|---|---|
| `driver@pitas.velos` | Portal Pemandu (`log-pemandu.html`) |
| `user@pitas.velos` | Portal Permohonan (`borang-permohonan.html`) |
| `vccc@pitas.velos` | VCC Klinikal (`dispatch.html`) |
| `vccm@pitas.velos` | VCC Jabatan (`dispatch.html`) |
| `admin@pitas.velos` | Admin dashboard (`index.html`) — full access |
| `kenderaan@pitas.velos` | Portal Kenderaan (reserved, not yet built) |

**Passwords are NOT recorded in this document.** They live in the Firebase console only. Never write them into any file in this repo.

### How it works
- No global gate. The Google Sites landing page stays public and link-only.
- Each portal page checks auth state on load. No session → show login form for that portal's account.
- The user types a password; the JS calls `signInWithEmailAndPassword` with that page's fixed role address.
- `firestore.rules` enforces the actual permissions. **The login form alone protects nothing** — the rules are what stop direct SDK access.

### UID hardcoding
`firestore.rules` matches on account UIDs, pasted from Firebase Console → Authentication → Users. Placeholders are marked `PASTE_UID_...`.

---

## 7. RECEIPT IMAGES — READ CAREFULLY

Receipts are compressed client-side and stored as base64 strings in a **separate Firestore collection**.

```
resitBahanApi/{fuelRecordId}  →  { resit: "<base64 string>" }
```

### The six rules. These are load-bearing, not style preferences.

1. **Separate collection, always.** Never a field on the `logBahanApi` document. A previous version of VELOS put a base64 blob where records live and it broke the backup path. This rule is why that cannot recur.
2. **Never attach an `onSnapshot` listener to `resitBahanApi`.** Blobs would stream on every change. Single `getDoc` only.
3. **Never bulk-read it.** No `getDocs(collection(db,'resitBahanApi'))` — not for the dashboard, not for counting, not for checking. One document at a time, only when the user taps to view a receipt.
4. **CSV export excludes it explicitly.** `resitBahanApi` is never a column and never in scope. If receipt files are ever needed, that is a separate download action.
5. **Size-check before writing; fail loudly.** Measure the base64 string length after compression. Over ~900 KB → refuse the save with a clear message telling the driver to retake the photo. Never fail silently — a fuel record with a phantom receipt would go unnoticed for months.
6. **Write the receipt first, then the fuel record.** If the receipt write fails, the fuel record is never created and the driver retries cleanly. The reverse order reproduces the existing trip-saved-but-fuel-failed duplication bug.

### Compression
Canvas-based JPEG. Target ~1000px on the long edge, quality ~0.7. Typical receipt lands at 150–250 KB before encoding; base64 adds roughly a third. Verify actual output length in the browser against real driver photos — a modern phone shot is 3–5 MB raw, and silent no-op compression would only surface at the 1 MB document limit.

---

## 8. FUNCTION MAPPING

### Log_Pemandu
| `google.script.run` | Firestore |
|---|---|
| `getLogData()` | `getDocs(collection(db,'logPergerakan'))` |
| `getCapacities()` | `getDocs(collection(db,'kapasitiKenderaan'))` |
| `saveLogEntry(payload)` | `setDoc(doc(db,'logPergerakan',payload.id), payload)` |
| `simpanRekodBahanApiGAS(p)` | `setDoc(doc(db,'resitBahanApi',p.id),{resit})` **then** `setDoc(doc(db,'logBahanApi',p.id), p)` |

### Admin_Velos
| `google.script.run` | Firestore |
|---|---|
| `getLogData()` | `getDocs(collection(db,'logPergerakan'))` |
| `ambilDataBahanApiGAS()` | `getDocs(collection(db,'logBahanApi'))` |
| `getAllPermohonanData()` | `getDocs(collection(db,'permohonanVCC'))` |
| `getCapacities()` | `getDocs(collection(db,'kapasitiKenderaan'))` |
| `deleteLogEntry(id)` | `deleteDoc(doc(db,'logPergerakan',id))` |
| `deleteFuelEntry(id)` | `deleteDoc(doc(db,'logBahanApi',id))` + `deleteDoc(doc(db,'resitBahanApi',id))` |
| `updateCapacity(plat,cap)` | `setDoc(doc(db,'kapasitiKenderaan',plat),{kapasiti:cap})` |
| `sahkanKataLaluan(pw)` | Firebase Auth sign-in + Security Rules |
| `tandakResetPenuh()` | `setDoc(doc(db,'sistemMeta','lastFullReset'),{tarikh:...})` |
| `getMaklumatResetTerkini()` | `getDoc(doc(db,'sistemMeta','lastFullReset'))` |
| `backupFirebaseToSheets()` | Removed. CSV export button only. |

### Borang_Permohonan
| `google.script.run` | Firestore |
|---|---|
| `savePermohonan(dataObj)` | `setDoc(doc(db,'permohonanVCC',dataObj.id), dataObj)` with collision check |
| `semakStatusPermohonan(id)` | `getDoc(doc(db,'permohonanVCC',id))` |
| `getCapacities()` | `getDocs(collection(db,'kapasitiKenderaan'))` |
| `deletePermohonanUser(id)` | `deleteDoc` only if `status === 'Menunggu'` |

### Dispatch
| `google.script.run` | Firestore |
|---|---|
| `sahkanKataLaluanVCC(type,pw)` | Firebase Auth sign-in |
| `terimaPermohonan(id,...)` | `updateDoc(...,{status:'Diproses'})` |
| `approvePermohonan(id,...)` | `updateDoc` with status, kenderaan, pemandu, pelulus, masaKeputusan |
| `rejectPermohonan(id,...)` | `updateDoc` with status 'Ditolak', namaTindakan, catatan, masaKeputusan |
| `tindakanLainPermohonan(...)` | `updateDoc` with namaTindakan, catatanTindakan, masaTindakanLain |
| `getPermohonanAktif(vccType)` | `getDocs` where `status in ['Menunggu','Diproses']` |
| `getAllVccRecords(vccType)` | `getDocs` with date filter on ID prefix |
| `forceDeletePermohonan(id,...)` | `deleteDoc` — each VCC account deletes only its own queue's history (`C` deletes `C`, `M` deletes `M`); admin can delete any |
| `getLiveStatuses(idArray)` | `getDoc` per ID |

---

## 9. LIVE SYNC

Current VELOS polls every 30 seconds via `setInterval`. Replace with Firestore `onSnapshot` listeners — instant updates, no polling.

**Except `resitBahanApi`.** See rule 2 in Section 7.

---

## 10. DESIGN TOKENS — carry over exactly

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

---

## 11. BACKUP

No automated trigger. Admin dashboard CSV export buttons only — keep and improve the existing ones. Receipts are excluded from all exports.

---

## 12. KNOWN PITFALLS

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
11. **Base64 receipts:** all six rules in Section 7 are mandatory.
12. **Auth is rules, not UI:** a login form with permissive Security Rules protects nothing. Rules are the enforcement.

---

## 13. WORKING DISCIPLINE

- **Strict scope.** Never touch files or configs not explicitly commanded.
- **One file per pass.** Do not bundle edits across files.
- **Permission before executing.** Ask before any file edit, new file, or terminal command.
- **Pros and cons first.** Present before executing any significant change.
- **Verbatim anchors.** Never assume code from memory. Read the actual file first.
- **Language.** Malay/English mix for domain terms (`pemandu`, `kenderaan`, `permohonan`, `bahan api`). Match existing language per context.
- **When Shafiq says something was tested N times:** take it at face value. Do not suggest user error.

---

## 14. FIRST SESSION — SCAFFOLD ONLY

**Historical.** This section describes the initial scaffold session, completed in commit `456d04d`. It is a record of what was done then, not an active instruction — the repo has moved well past this point (all 4 portals and the admin dashboard are now fully built). Note also that `auth.js`, listed in the file tree below as originally scaffolded, was later removed as dead code (commit `53b1ac4`): each portal ended up wiring its own inline Firebase Auth instead of sharing a helper.

No feature code. Structure and configuration only.

Target structure:

```
D:\VelosRevamp\
├── index.html            (Admin dashboard)
├── log-pemandu.html      (Driver log — first module to build)
├── borang-permohonan.html
├── dispatch.html
├── auth.js               (shared sign-in helper)
├── firebase-config.js    (Firebase project config)
├── firebase.json         (Hosting config)
├── .firebaserc
├── firestore.rules       (already written — UIDs pasted in)
├── .gitignore
└── CLAUDE.md
```

Steps:
1. `git init` in `D:\VelosRevamp`
2. Create the file structure above. HTML files are empty placeholders with correct titles only.
3. `firebase.json` — Hosting config with all 4 HTML files as entry points.
4. `.gitignore` — standard Node/Firebase ignores.
5. `CLAUDE.md` — adapted from the live VELOS one, updated with everything in this brief.
6. Baseline commit: `feat: VELOS revamp scaffold`
7. **Stop and report.**

`firebase-config.js` is intentionally NOT gitignored — Firebase client config is public by design. Security Rules are what protect the data.

**Second session:** build `log-pemandu.html` as proof of concept — full functionality, Firestore reads/writes, base64 receipts. Browser-testable via `firebase serve`.

---

## 15. WHAT NOT TO DO

- Do not touch `D:\ClaudeXVelos` or any live VELOS file
- Do not share Firebase projects between live VELOS and this rebuild
- Do not use GAS at all — not even for backup or uploads
- Do not use Realtime Database
- Do not use Firebase Storage
- Do not change the VCC ID format or suffix convention
- Do not use `toISOString()` for any date string in an ID or filename
- Do not use `new Date()` directly on `dd/MM/yyyy` strings
- Do not propose ISO date migration — permanent decision, never revisit
- Print/slip templates: preserve structure and layout exactly — flag anything broken or improvable rather than silently copying it forward
- Do not write any password into any file in this repo
- Do not put base64 image data anywhere except `resitBahanApi`

---

*End of brief. Read everything above before touching any file.*
