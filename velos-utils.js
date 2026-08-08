/* ---------------------------------------------------------------------
   VELOS SHARED UTILITIES — date formatting + liter validation helpers
   used identically across multiple portals. Extracted in Phase 3 to
   remove duplication; behaviour is unchanged from the per-file copies.

   Guardrails (see CLAUDE.md Section 13 / handoff critical guardrails):
   - Do not add fillOdoKey, computeMonthStats, computeFuelStatsForMonth,
     c_guna, c_sisa, or any fuel accumulator logic here. Those stay
     exactly where they are in admin.html.
   - Do not change parseTarikhMasaVELOS's parsing rule (dd/MM/yyyy
     HH:mm, local date parts only) -- it must stay byte-for-byte
     compatible with the strings already stored in permohonanVCC.
--------------------------------------------------------------------- */

export function pad2(n) {
  return String(n).padStart(2, '0');
}

// Builds the dd/MM/yyyy HH:mm format used for permohonanVCC timestamps.
// This format is permanent (CLAUDE.md: "Date format is permanent") --
// never switch this to toISOString() or any ISO variant.
export function buildTimestampDMY() {
  const d = new Date();
  return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

// yyyy-MM-dd for today, local date parts only (never toISOString(),
// which shifts to UTC and can roll the date over near midnight).
export function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

// Explicit parser for "dd/MM/yyyy HH:mm" -- new Date() reads slash-
// separated strings as MM/dd/yyyy, silently misordering any day > 12.
export function parseTarikhMasaVELOS(str) {
  if (!str) return new Date(0);
  const [datePart, timePart] = str.split(' ');
  const [d, m, y] = datePart.split('/').map(Number);
  const [h, min] = (timePart || "00:00").split(':').map(Number);
  return new Date(y, m - 1, d, h, min);
}

// Liter validation chain (CLAUDE.md pitfall #6): hard block above 1000L
// almost always means an odometer reading was typed into the liter
// field; a soft warning above the vehicle's tank capacity still allows
// the entry (drivers occasionally top up slightly over rated capacity).
export function classifyLiterFill(liter, capTangki) {
  let cls = 'ok', prefix = '';
  if (liter > 1000) { cls = 'danger'; prefix = '⚠ '; }
  else if (liter > capTangki) { cls = 'warn'; prefix = '⚠ '; }
  return { cls, prefix };
}
