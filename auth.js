// VELOS REVAMP — shared auth helper
//
// Scaffold only. Not imported or wired into any HTML file yet.
//
// Firebase Auth SDK v10, modular imports.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Signs in with one of the six fixed role accounts (see CLAUDE.md).
// Returns the signInWithEmailAndPassword promise so the caller can catch
// wrong-password / too-many-attempts errors itself.
export function signInRole(roleEmail, password) {
  return signInWithEmailAndPassword(auth, roleEmail, password);
}

// Call once per portal page on load. No session -> redirect to loginUrl,
// that portal's own login view. There is no global gate; each portal
// enforces its own session independently.
export function requireAuth(loginUrl) {
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = loginUrl;
    }
  });
}
