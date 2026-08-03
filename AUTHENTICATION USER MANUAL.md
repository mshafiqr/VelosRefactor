# VELOS — Authentication Manual

Handover reference for whoever administers VELOS next. Explains how login works across the four portals, why it's built this way, and how to operate and change it safely. Pairs with [CLAUDE.md](CLAUDE.md), which holds the account table and the wider project rules this doc doesn't repeat.

## 1. The model, in plain terms

VELOS does not have individual staff logins. There is no "Ali's account" or "Siti's account" — everyone who does a given job shares one login for that job. For example, every driver on every shift logs into the driver portal with the same `driver@pitas.velos` / password pair.

Two things follow from that:

- **The "email" addresses are usernames, not mailboxes.** `driver@pitas.velos` does not receive email and nobody should try to email it. It exists only because Firebase Auth requires an email-shaped identifier.
- **No personal staff email is stored anywhere in the system.** This is deliberate — it keeps the system from holding any personal data on individual staff that would need protecting or would leak in a breach.

The tradeoff: because logins are shared, there is no audit trail of *which person* did a given action, only which *role* did it. If that ever becomes a requirement, it means moving to individual accounts — a real redesign, not a config change.

The system runs on **Firebase Authentication** (email/password) for login, and **Cloud Firestore Security Rules** for enforcement. These are two different layers — see §5.

## 2. The eight accounts

| Account | Used by | Purpose |
|---|---|---|
| `admin@pitas.velos` | `admin.html` | Full administrative access |
| `master@pitas.velos` | All four portals | Universal override login — see §4 |
| `visitor@pitas.velos` | `admin.html` | Read-only dashboard viewing, no edit rights |
| `driver@pitas.velos` | `log-pemandu.html` | Driver movement + fuel logging |
| `user@pitas.velos` | `borang-permohonan.html` | Submitting VCC vehicle requests |
| `vccc@pitas.velos` | `dispatch.html` | VCC dispatch — Klinikal queue |
| `vccm@pitas.velos` | `dispatch.html` | VCC dispatch — Jabatan (Pegawai Kenderaan) queue |
| `kenderaan@pitas.velos` | *(none yet)* | Reserved for Portal Kenderaan, not built |

Each account's password is set once in Firebase Console and known only to whoever needs to log in as that role. Passwords are **never** written to this repository, this file included — see §7.

## 3. How each portal's login actually works

Each portal (`admin.html`, `dispatch.html`, `borang-permohonan.html`, `log-pemandu.html`) has its own login form wired independently — there's no shared login page or shared auth code file. Each form has a single password field. On submit, the code tries that password against a short list of accounts, one at a time, stopping at the first one that succeeds:

**`admin.html`**
1. `admin@pitas.velos`
2. `master@pitas.velos`
3. `visitor@pitas.velos`

The signed-in account's UID is checked against a hardcoded "visitor" ID to decide whether to render the dashboard read-only.

**`dispatch.html`**
1. `vccc@pitas.velos`
2. `vccm@pitas.velos`
3. `master@pitas.velos` — since master isn't tied to a queue, a successful master login pops a prompt asking the operator to pick Klinikal or Jabatan for that session. The choice is remembered in the browser (`localStorage`) so reloading the page doesn't ask again.

**`borang-permohonan.html`**
1. `user@pitas.velos`
2. `master@pitas.velos`

**`log-pemandu.html`**
1. `driver@pitas.velos`
2. `master@pitas.velos`

Practically: if a staff member mistypes their portal's password but happens to type the *master* password instead, they'll still get in — the page can't tell the difference, and doesn't try to.

## 4. `master@pitas.velos` — what it is and why it's risky

Master is not a Firebase feature — it's an ordinary account that every portal happens to try as a fallback. Its only special property is that its password currently equals `admin@pitas.velos`'s password, and every portal is coded to attempt it. Anyone who knows that one password can get a fully privileged session on **any of the four portals**, not just the admin dashboard.

This is confirmed at the enforcement layer, not just the login form: Firestore Security Rules give master read/write on every collection the app uses — driver logs, fuel logs, receipts, VCC requests, vehicle capacities, system settings, and configuration lists. It is exactly as powerful as the admin account everywhere.

**What this means operationally:**
- Treat the master password with the same care as the admin password — because it functionally *is* the admin password, usable from four login screens instead of one.
- If it needs rotating, rotate it in Firebase Console under the `master@pitas.velos` user (see §6). Changing `admin@pitas.velos`'s password does not change master's — they are separate accounts that currently happen to share a password by choice, not by mechanism.
- There is no way to disable the master fallback per portal without a code change (removing the retry step in that portal's login handler) — it isn't a togglable setting.

## 5. `visitor@pitas.velos` — read-only viewer

Only reachable through `admin.html`, as the last account tried in its cascade. Unlike the other accounts, once signed in, the app identifies it by comparing the signed-in user's UID against a hardcoded constant, not by remembering which password path got it there. Firestore Security Rules mirror this — the visitor role can read driver logs, fuel logs, receipts, VCC requests, and system settings, but has no write access to anything.

## 6. `kenderaan@pitas.velos` — reserved, not active

This account exists in Firebase Auth and is already wired into the Firestore rules helper functions, but no portal currently logs into it — Portal Kenderaan, the app meant to use it, hasn't been built. Safe to leave as-is; nothing depends on it yet.

## 7. The enforcement layer — why the login form isn't the real lock

The login form only decides whether a browser tab shows a portal's dashboard or its login screen. It is not what stops someone from reading or writing data they shouldn't. **The real gate is `firestore.rules`**, deployed separately to Firebase, which every read and write is checked against regardless of which HTML page sent it.

The rules work like this:
- Each account has a fixed Firebase User ID (UID) — a long random string assigned when the account was created, visible in Firebase Console → Authentication → Users.
- `firestore.rules` defines one yes/no helper function per account (`isAdmin()`, `isMaster()`, `isDriver()`, etc.), each of which checks "is the signed-in UID equal to this specific account's UID?"
- Every collection (driver logs, fuel logs, VCC requests, etc.) then states, per operation — read, create, update, delete — which of those helper functions must return true.
- A catch-all rule at the very bottom denies anything not explicitly allowed above it. Nothing is open by default.

If `admin.html`'s login form were somehow bypassed entirely, an attacker still could not read or write data without a valid password for an account the rules actually grant access to — because the rules are enforced by Firebase's servers, not by the page's JavaScript.

**Two rules-specific things worth knowing before editing `firestore.rules`:**
- VCC request reads are intentionally *not* split between the Klinikal and Jabatan dispatch accounts — both can read every request. Only writes are restricted, by checking whether the request's ID ends in `C` or `M`. This is explained in a comment at the bottom of the rules file; it's a deliberate limitation of how Firestore rules can filter data, not an oversight.
- Vehicle capacity data and configuration lists are readable by anyone signed in, but only admin/master can write them.

## 8. Operating procedures

**Reset a password:**
Firebase Console → Authentication → Users → find the account row → ⋮ menu → Reset password (sends a reset link) or delete and recreate the user with a new password. If you recreate a user instead of resetting, its UID changes — you must then update that account's UID in `firestore.rules` and redeploy rules (see below), or its access silently breaks.

**Change the master or admin password:**
Same steps as above, on the `master@pitas.velos` or `admin@pitas.velos` user specifically. Remember they're independent accounts — changing one does not change the other, even though they're meant to be kept in sync by convention (§4).

**Deploy a change to `firestore.rules`:**
Editing the file in this repo does nothing on its own — Firestore rules only take effect once deployed. From the project root:
```bash
firebase deploy --only firestore:rules
```
Requires the Firebase CLI installed and logged into an account with access to the `velos-pitas` project.

**Add a brand-new role account:**
1. Create the user in Firebase Console → Authentication → Users → Add user.
2. Copy its UID.
3. Add a `uidX()` and `isX()` helper pair in `firestore.rules`, following the existing pattern.
4. Add `isX()` into the `allow` rules of whichever collections that role needs.
5. Deploy rules (above).
6. Wire the new account into the relevant portal's login cascade in its HTML file, and update the account table in [CLAUDE.md](CLAUDE.md).

**Deploy a change to the portal HTML/JS files:**
```bash
firebase deploy --only hosting
```

## 9. Handover checklist

Whoever takes over VELOS administration needs, at minimum:
- Firebase Console access to the `velos-pitas` project (Owner or Editor role), so they can reach Authentication and Firestore.
- GitHub access to this repository.
- All eight account passwords, recorded somewhere outside this repo — a password manager or sealed physical note, not a text file in this project.
- This document and [CLAUDE.md](CLAUDE.md), read together.
- Awareness of §4: the master account is a full-access skeleton key across every portal, not a minor convenience account.

## 10. Password handling

Passwords exist only in Firebase Console → Authentication → Users, and wherever the outgoing administrator records them for handover (§9). They are never written into this repository — not in this file, not in `CLAUDE.md`, not in code comments in `firestore.rules` or any portal's HTML. There is no way to read a password back out of Firebase once it's set; losing it means resetting it, not recovering it.
