// ONE-TIME SEED SCRIPT — run once, then delete this file.
//
// Seeds vehicleProfiles/BNU9974 with the downtime state BNU 9974 was already in
// before the statusSemasa/downtimeStartDate fields existed, so the new downtime
// tracking (CLAUDE.md-adjacent change: Portal Kenderaan downtime timer) picks it
// up correctly instead of showing "Tiada Downtime" for a vehicle that's actually
// been down since 30 Jul 2026.
//
// Usage:
//   node seed-bnu9974-downtime.js
//
// Requires Firebase Admin credentials for the "velos-pitas" project. Either:
//   - run `gcloud auth application-default login` once beforehand, or
//   - set GOOGLE_APPLICATION_CREDENTIALS to a service account key JSON path
//     (Firebase Console -> Project Settings -> Service Accounts -> Generate key).
//     Do not commit that key file to this repo.

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'velos-pitas',
});

const db = admin.firestore();

// vehicleProfiles doc IDs are plate numbers with spaces stripped (see
// portal-kenderaan-admin.html's profile save: `.replace(/\s+/g, '')`).
// Double-check this matches the actual doc ID in Firestore before running.
const PLATE = 'BNU9974';

(async () => {
  const ref = db.collection('vehicleProfiles').doc(PLATE);
  const snap = await ref.get();
  if (!snap.exists) {
    console.error(`vehicleProfiles/${PLATE} does not exist. Check the exact doc ID in Firestore (Console) and update PLATE above.`);
    process.exit(1);
  }

  await ref.update({
    statusSemasa: 'rosak',
    downtimeStartDate: '2026-07-30',
  });

  console.log(`vehicleProfiles/${PLATE} updated: statusSemasa='rosak', downtimeStartDate='2026-07-30'.`);
  process.exit(0);
})().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
