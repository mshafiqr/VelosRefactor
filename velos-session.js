/* ---------------------------------------------------------------------
   VELOS SESSION HELPERS — inactivity auto-logout, badge-count sync, and
   datalist labelling. Extracted in Phase 3 from identical/near-identical
   copies in dispatch.html, borang-permohonan.html, and log-pemandu.html.
   Behaviour is unchanged from the per-file copies.
--------------------------------------------------------------------- */

export function createInactivityWatcher(auth, signOut, ms) {
  ms = ms || 30 * 60 * 1000;
  var events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'click', 'scroll'];
  var timer = null;
  function reset() {
    clearTimeout(timer);
    timer = setTimeout(function () { signOut(auth); }, ms);
  }
  function start() {
    events.forEach(function (evt) { document.addEventListener(evt, reset, true); });
    reset();
  }
  function stop() {
    clearTimeout(timer);
    events.forEach(function (evt) { document.removeEventListener(evt, reset, true); });
  }
  return { start: start, stop: stop };
}

// Public landing-page badge counter (sistemMeta/badgeCounts) -- two numbers
// only, no patient data. Recomputed from the full snapshot each time so a
// stale write from either portal is harmless (see firestore.rules).
export function updateBadgeCounts(db, setDoc, doc, list) {
  const menunggu = list.filter(function (i) { return i.status === 'Menunggu'; }).length;
  const diproses = list.filter(function (i) { return i.status === 'Diproses'; }).length;
  setDoc(doc(db, 'sistemMeta', 'badgeCounts'), { menungguCount: menunggu, diprosesCount: diproses }, { merge: true })
    .catch(function (err) { console.error('Ralat kemaskini badgeCounts:', err); });
}

export function datalistLabel(val) {
  const m = val.match(/\(([^)]+)\)$/);
  return m ? m[1] + ' — ' + val.replace(/\s*\([^)]+\)$/, '').trim() : val;
}
