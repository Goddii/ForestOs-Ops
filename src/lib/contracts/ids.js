// ── Forest Line ID conventions ───────────────────────────────────────────────
// One place for the identifier prefixes the Forest Line docs use, so mock data,
// the contract adapters (`src/lib/contracts/adapters.js`) and any future backend
// all speak the same scheme. Prefixes are drawn from the Concept Brief and the
// existing ForestOS data (`RVT-`, `TR-`, `AL-`, `BM-`, `CON-`, `FL-`).

export const ID_PREFIX = {
  farmer: 'RVT', // registered farmer / worker  — RVT-0887
  plot: 'NTZ', // NTZDC block+plot             — NTZ-A-014
  batch: 'TL', // production batch / trace id  — TL-2026-00482
  harvest: 'HRV', // one recorded harvest        — HRV-2026-0412
  verification: 'VER', // verification claim     — VER-0142
  problem: 'PR', // farmer problem report       — PR-0231
  passport: 'CP', // conservation passport       — CP-2026-0007
  conservation: 'CON', // conservation activity  — CON-90218
  fieldReport: 'FL', // field-officer report ref — FL-58291
  auditLog: 'AL', // append-only audit entry    — AL-231
  training: 'TR', // training session            — TR-092
  buffer: 'BM', // buffer-maintenance action    — BM-318
  incident: 'INC', // fire / logging / encroachment incident — INC-2026-0187
  survival: 'SVC', // tree survival count         — SVC-2026-00731
  maintenance: 'MT', // patrol / maintenance task — MT-0001
  exportRecord: 'EXP', // generated export file   — EXP-0001
  segment: 'SEG', // boundary segment             — SEG-OLE-01
  alert: 'ALERT', // satellite change alert       — ALERT-2291
}

const pad = (n, width) => String(n).padStart(width, '0')

/** `TL-2026-00482` from (2026, 482). */
export function makeBatchId(year, seq) {
  return `${ID_PREFIX.batch}-${year}-${pad(seq, 5)}`
}

/** `HRV-2026-0412` from (2026, 412). */
export function makeHarvestId(year, seq) {
  return `${ID_PREFIX.harvest}-${year}-${pad(seq, 4)}`
}

/** `VER-0142` from 142. */
export function makeClaimId(seq) {
  return `${ID_PREFIX.verification}-${pad(seq, 4)}`
}

/** `PR-0231` from 231. */
export function makeProblemId(seq) {
  return `${ID_PREFIX.problem}-${pad(seq, 4)}`
}

/** `CP-2026-0007` from (2026, 7). */
export function makePassportId(year, seq) {
  return `${ID_PREFIX.passport}-${year}-${pad(seq, 4)}`
}

/** `INC-2026-0187` from (2026, 187). */
export function makeIncidentId(year, seq) {
  return `${ID_PREFIX.incident}-${year}-${pad(seq, 4)}`
}

/** `SVC-2026-00731` from (2026, 731). */
export function makeSurvivalId(year, seq) {
  return `${ID_PREFIX.survival}-${year}-${pad(seq, 5)}`
}

/** `MT-0001` from 1. */
export function makeTaskId(seq) {
  return `${ID_PREFIX.maintenance}-${pad(seq, 4)}`
}

/** `EXP-0001` from 1. */
export function makeExportId(seq) {
  return `${ID_PREFIX.exportRecord}-${pad(seq, 4)}`
}

/** `SEG-OLE-01` from ('OLE', 1). The zone code is the part of the zone id after the dash. */
export function makeSegmentId(zoneCode, seq) {
  return `${ID_PREFIX.segment}-${zoneCode}-${pad(seq, 2)}`
}

/** `ALERT-2291` from 2291. */
export function makeAlertId(seq) {
  return `${ID_PREFIX.alert}-${pad(seq, 4)}`
}

/** `AL-4413` from 4413. */
export function makeAuditLogId(seq) {
  return `${ID_PREFIX.auditLog}-${pad(seq, 4)}`
}

/** `BM-318` from 318. */
export function makeBufferLogId(seq) {
  return `${ID_PREFIX.buffer}-${pad(seq, 3)}`
}

/** True when `id` looks like it uses `prefix` (case-insensitive). */
export function hasPrefix(id, prefix) {
  return typeof id === 'string' && id.toUpperCase().startsWith(`${prefix.toUpperCase()}-`)
}
