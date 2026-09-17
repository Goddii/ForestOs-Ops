// ── Forest Line — frontend ↔ backend data contracts ─────────────────────────
// The shapes the UI screens expect, so the frontend (mock) and backend (real
// API) can be built in parallel and swapped without surprises. These match the
// team's "Forest Line — frontend data contracts" doc; where the UI needs a field
// the doc does not carry, it is marked PROPOSED and listed for the stakeholder
// meeting rather than silently invented.
//
// Conventions: ids use the prefixes in `./ids.js`; timestamps are ISO 8601
// (UTC); rates that are shares (rejection rate, training coverage) are decimal
// fractions, not percentages. Redaction happens at the API boundary — the buyer
// and consumer payloads simply omit `farmerId` / `reportedBy` server-side.

/**
 * @typedef {'tree_planting'|'buffer_maintenance'|'erosion_control'|'invasive_removal'|'fire_report'} ClaimType
 * @typedef {'reported'|'field_verified'|'evidence_attached'|'satellite_checked'|'verified'|'rejected'} ClaimStage
 * @typedef {'pest'|'disease'|'poor_growth'|'drought'|'flooding'|'weeds'|'erosion'|'fire'|'other'} ProblemType
 * @typedef {'low'|'medium'|'high'} Severity
 * @typedef {'received'|'officer_notified'|'field_verification'|'intervention'|'outcome_recorded'} ProblemStatus
 * @typedef {'direct_sold'|'branded'|'auction'} Channel
 * @typedef {'verified'|'pending'|'flagged'} ConservationStatus
 * @typedef {'active'|'pending_renewal'|'expired'} PassportStatus
 */

export const CLAIM_TYPES = ['tree_planting', 'buffer_maintenance', 'erosion_control', 'invasive_removal', 'fire_report']
export const CLAIM_STAGES = ['reported', 'field_verified', 'evidence_attached', 'satellite_checked', 'verified', 'rejected']
export const PROBLEM_TYPES = ['pest', 'disease', 'poor_growth', 'drought', 'flooding', 'weeds', 'erosion', 'fire', 'other']
export const SEVERITIES = ['low', 'medium', 'high']
export const PROBLEM_STATUSES = ['received', 'officer_notified', 'field_verification', 'intervention', 'outcome_recorded']
export const CHANNELS = ['direct_sold', 'branded', 'auction']

/**
 * Verification claim — Verification Queue.
 * @typedef {Object} VerificationClaim
 * @property {string}   claimId       VER-0142
 * @property {ClaimType} type
 * @property {string}   plotId        NTZ-A-014
 * @property {string}   blockId       KIP
 * @property {string}   reportedBy    RVT-0887  — internal only, never in buyer/consumer payloads
 * @property {string}   reportedAt    ISO 8601
 * @property {ClaimStage} stage
 * @property {?string}  officerNote
 * @property {?string}  photoUrl
 * @property {?{lat:number,lng:number}} gpsCoords
 * @property {?number}  ndviDelta     same source as Satellite Recovery
 * @property {?string}  verifiedAt    ISO 8601, null until verified
 * @property {?string}  reportedWork  PROPOSED — the submission's quantity/description text
 * @property {?string}  assignedOfficer PROPOSED — the field officer's name/handle
 * @property {?number}  ndviBaseline  PROPOSED — needed to draw the baseline→current bars
 * @property {?number}  ndviCurrent   PROPOSED
 * @property {?number}  photoCount    PROPOSED — the UI shows an evidence tile per photo
 */

/**
 * Problem report — Problem Reports.
 * @typedef {Object} ProblemReport
 * @property {string} reportId          PR-0231
 * @property {string} farmerId          RVT-0912  — internal only
 * @property {string} centre            Tinet
 * @property {ProblemType} problemType
 * @property {Severity} severity
 * @property {ProblemStatus} status
 * @property {?string} assignedOfficer  Node A
 * @property {string} reportedAt        ISO 8601
 * @property {?string} outcome
 * @property {?boolean} overdue         PROPOSED — past the response window and not yet closed
 */

/**
 * Zone comparison row — NTZDC Management → Zone Comparison.
 * @typedef {Object} ZoneComparisonRow
 * @property {string} zoneId                 SW-MAU
 * @property {string} zoneName               South West Mau
 * @property {number} baseRateKes
 * @property {number} qualityPremiumKes
 * @property {number} conservationPremiumKes
 * @property {number} totalPayoutKes
 * @property {number} rejectionRate          decimal fraction (0.042)
 * @property {number} trainingCoverage       decimal fraction (0.95)
 */

/**
 * Conservation passport — Buyer / Brand View → Conservation Passport.
 * @typedef {Object} ConservationPassport
 * @property {string}   passportId               CP-2026-0007
 * @property {string}   brand
 * @property {string[]} bufferZones              PROPOSED plural — a buyer sources from several
 * @property {number}   volumeSourcedKg
 * @property {string}   conservationActivity     free-text summary
 * @property {number}   farmersRepresented       count only — never names or ids
 * @property {number}   bufferHectaresAttributed
 * @property {string[]} verificationRecords      ["EUDR-C-118", "NDVI-2026Q3"]
 * @property {PassportStatus} status
 */

/**
 * Batch record — shared across internal Batch Lookup, Buyer Portal and the
 * public QR site. One shape, three redaction levels (the payload for buyer /
 * consumer omits `farmerId`).
 * @typedef {Object} BatchRecord
 * @property {string} batchId              TL-2026-00482
 * @property {string} originZone           Nyayo Tea Zone / South West Mau
 * @property {string} blockId              NTZ-A-014
 * @property {string} collectionCentre     Kiptunga
 * @property {string} harvestDate          ISO date
 * @property {number} quantityKg
 * @property {Channel} channel             buyer / consumer never see 'auction'
 * @property {ConservationStatus} conservationStatus
 * @property {('field'|'satellite')[]} verificationMethod
 * @property {?string} farmerId            internal-only — omit from buyer and consumer payloads
 */

/**
 * Visitor passport — PROPOSED. The record a tenant-owned consumer experience
 * (`/passport/:tenantSlug/:batchId`, `TenantEarnSection`) needs once a real
 * backend exists to make "every scan progressively builds something around
 * this person" actually durable, instead of the visual-only, derived-from-
 * the-batch-id preview it renders today. Shared across channels by design —
 * the web frontend, the companion mobile app, and USSD flows should all read
 * and write the same passport rather than each keeping their own notion of a
 * visitor's collection/status.
 * @typedef {Object} VisitorPassport
 * @property {string} passportId          PSP-2026-00931 — see `ID_PREFIX`; add a `passport` entry there once this is real
 * @property {string} tenantSlug          majani — → `src/lib/tenants.js` TENANTS
 * @property {Stamp[]} stamps
 * @property {string} tier                matches the owning tenant's `collection.tierLabel`
 * @property {?string} ownerContact       PROPOSED — phone number or other identifier once a real identity exists (no accounts today; USSD in particular will need one)
 */

/**
 * @typedef {Object} Stamp
 * @property {string} batchId             the scanned batch that earned this stamp
 * @property {string} tenantSlug
 * @property {string} earnedAt            ISO 8601
 * @property {?{lat:number,lng:number}} geo   PROPOSED — only if the scan flow captures location
 */

export {}
