// tests/emulator/seed.js — Firebase Emulator Suite data layer (local-only).
//
// Two jobs:
//   1. Run directly (`node tests/emulator/seed.js`) to create the 8 shared
//      role accounts in the Auth emulator, UID-pinned to match
//      firestore.rules exactly (verified against the file, not memory —
//      see the ROLE_ACCOUNTS table below). Passwords come from the same
//      .env vars the live Playwright suite already uses
//      (tests/smoke/auth.spec.js) — same passwords, fake local accounts.
//      Idempotent: safe to re-run, existing users are updated in place.
//   2. Export seedFirestoreDocs() so any test can drop arbitrary fixture
//      documents (trips, fuel entries, etc.) into the Firestore emulator.
//
// Requires the emulators to already be running (`firebase emulators:start`)
// — this only talks to 127.0.0.1:9099 / 127.0.0.1:8080, never to the real
// velos-pitas project, regardless of what's in .env.
//
// Ports must match firebase.json's "emulators" block.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
// .firebaserc has no recognized extension, so require() can't parse it as
// JSON -- read and parse it explicitly instead.
const { projects } = JSON.parse(fs.readFileSync(path.join(__dirname, '../../.firebaserc'), 'utf8'));

const AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_EMULATOR_HOST;
process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;

// firebase-admin v14 dropped the namespaced admin.auth()/admin.firestore()
// API -- use the modular per-service imports instead.
const app = initializeApp({ projectId: projects.default });
const auth = getAuth(app);
const db = getFirestore(app);

// UIDs copied verbatim from firestore.rules — keep in sync with that file,
// not with memory. If firestore.rules changes a UID, update it here too.
const ROLE_ACCOUNTS = [
  { role: 'admin',     uid: 'C9b8wUiNz7Z2zTnBMd8QBZlSJC33', email: 'admin@pitas.velos',     passwordEnv: 'VELOS_ADMIN_PASS' },
  { role: 'driver',    uid: '8xdF5F6v2Ggs9ekLyo7DNwnmbUC3', email: 'driver@pitas.velos',    passwordEnv: 'VELOS_DRIVER_PASS' },
  { role: 'user',      uid: '74UrpMh3v8X87x9qP1PP1pbV18c2', email: 'user@pitas.velos',      passwordEnv: 'VELOS_USER_PASS' },
  { role: 'vccc',      uid: 'LZiT3i8OsMUy23vX5a1CAubpuDw2', email: 'vccc@pitas.velos',      passwordEnv: 'VELOS_VCCC_PASS' },
  { role: 'vccm',      uid: 'y4WorrRkS2f0vWP9bOZCsXAwFF23', email: 'vccm@pitas.velos',      passwordEnv: 'VELOS_VCCM_PASS' },
  { role: 'kenderaan', uid: 'OrpSCtNOF6X44YdTJi1xkxrtcy82', email: 'kenderaan@pitas.velos', passwordEnv: 'VELOS_KENDERAAN_PASS' },
  { role: 'master',    uid: '0NnSA4HSbnaZejQAjQ1NOJ3Kt8d2', email: 'master@pitas.velos',    passwordEnv: 'VELOS_MASTER_PASS' },
  { role: 'visitor',   uid: '89fwBTQsc9dAB68P1RnMBgorxrg1', email: 'visitor@pitas.velos',   passwordEnv: 'VELOS_VISITOR_PASS' },
];

// Creates (or updates, if already present) all 8 role accounts in the Auth
// emulator with UID/email/password matching production exactly.
async function seedAuthUsers() {
  for (const acct of ROLE_ACCOUNTS) {
    const password = process.env[acct.passwordEnv];
    if (!password) {
      throw new Error(`Missing ${acct.passwordEnv} in .env — cannot seed ${acct.email}`);
    }
    try {
      await auth.createUser({ uid: acct.uid, email: acct.email, password, emailVerified: true });
      console.log(`created  ${acct.role.padEnd(10)} ${acct.email}`);
    } catch (err) {
      if (err.code === 'auth/uid-already-exists' || err.code === 'auth/email-already-exists') {
        await auth.updateUser(acct.uid, { email: acct.email, password, emailVerified: true });
        console.log(`updated  ${acct.role.padEnd(10)} ${acct.email}`);
      } else {
        throw err;
      }
    }
  }
}

// Reusable fixture writer for any future test — seeds arbitrary documents
// into a Firestore emulator collection, keyed by ID.
//
//   await seedFirestoreDocs('logPergerakan', {
//     'trip-1': { tarikh: '01/07/2026', kenderaan: 'BNU9974', ... },
//   });
async function seedFirestoreDocs(collectionPath, docsById) {
  const batch = db.batch();
  for (const [id, data] of Object.entries(docsById)) {
    batch.set(db.collection(collectionPath).doc(String(id)), data);
  }
  await batch.commit();
}

module.exports = { app, auth, db, ROLE_ACCOUNTS, seedAuthUsers, seedFirestoreDocs };

if (require.main === module) {
  seedAuthUsers()
    .then(() => { console.log('\nDone — 8 role accounts seeded in the Auth emulator.'); process.exit(0); })
    .catch((err) => { console.error(err); process.exit(1); });
}
