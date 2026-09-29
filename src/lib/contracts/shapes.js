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

// ── Conservation Officer (Buffer Zones & Protected Forest) ──────────────────
// The records the Conservation Officer console reads and writes. Prototype
// shapes: every value is illustrative and every threshold is PROPOSED (see
// `src/lib/conservation/policy.js`). Conventions are this file's own:
// snake_case enums, ISO 8601 UTC timestamps, shares as decimal fractions
// (0.86, not 86). Only the view layer multiplies by 100.

/**
 * @typedef {'eastern'|'south_rift'|'north_rift'} RegionId
 * @typedef {{level:'region', regionId:RegionId}|{level:'national'}} Scope
 * @typedef {'tree_planting'|'buffer_maintenance'|'erosion_control'|'invasive_removal'} QueueClaimType   // fire_report is routed to Incidents
 * @typedef {'awaiting_decision'|'awaiting_countersign'|'evidence_requested'|'in_pipeline'|'verified'|'rejected'} ClaimStatus   // DERIVED, never stored
 * @typedef {'gps_outside_plot'|'gps_low_accuracy'|'low_photo_count'|'photo_stale_or_far'|'density_out_of_band'|'spacing_mismatch'|'duplicate_suspected'|'satellite_contradicts'|'satellite_unreliable'} ClaimFlag   // DERIVED
 * @typedef {'no_structures_found'|'gps_outside_plot'|'insufficient_photos'|'quantity_not_supported'|'satellite_contradicts'|'duplicate'|'other'} RejectReason
 * @typedef {'photos'|'gps_retake'|'recount'|'field_check'} EvidenceKind
 * @typedef {'fire'|'illegal_logging'|'charcoal'|'illegal_grazing'|'encroachment'|'beacon_or_fence_damage'|'other'} IncidentType
 * @typedef {'critical'|'high'|'medium'|'low'} IncidentSeverity
 * @typedef {'reported'|'triaged'|'escalated'|'acknowledged'|'responding'|'controlled'|'closed'} IncidentStatus
 * @typedef {'station_in_charge'|'county_ecosystem_conservator'|'kfs_commandant'} KfsRung
 * @typedef {'new'|'under_review'|'confirmed'|'dismissed'|'resolved'} AlertStatus
 * @typedef {'pass'|'borderline'|'fail'} SurvivalVerdict   // DERIVED
 * @typedef {'fence_repair'|'beacon_replacement'|'signage'|'firebreak_clearing'|'invasive_clearing'|'replanting'|'planting'|'field_check'|'count_request'|'boundary_survey_request'} TaskType
 * @typedef {'planned'|'in_progress'|'blocked'|'done'} TaskStatus
 */

/** Zone — NTZDC structure. `totalHa` is as printed in the source; never recompute it.
 * @typedef {Object} Zone
 * @property {string} zoneId  MAU-OLE
 * @property {string} name  Olenguruone
 * @property {string} forestBlock  Mau Complex
 * @property {RegionId} regionId  ASSUMED grouping
 * @property {?string} county  INFERRED from the place name
 * @property {number} teaHa
 * @property {number} treesHa
 * @property {number} totalHa
 * @property {?number} beltKm  DERIVED (pro rata to zone hectares); null when not derived
 */

/** Boundary segment — the unit patrols, integrity and incidents attach to. Lengths are illustrative allocations, not surveyed.
 * @typedef {Object} BoundarySegment
 * @property {string} segmentId  SEG-OLE-01
 * @property {string} zoneId
 * @property {string} name  Kiptunga NW
 * @property {number} lengthKm
 * @property {number} markerGapM  gaps in fence or live hedge
 * @property {number} canopyNow  fraction
 * @property {number} canopyRef  fraction at the baseline survey
 * @property {number} beaconsPresent @property {number} beaconsTotal
 * @property {number} signsPresent   @property {number} signsTotal
 */

/** Conservation claim as the officer sees it. Flags, status, readiness, overdue and countersign need are DERIVED by `rules.js`, never stored.
 * @typedef {Object} ConservationClaim
 * @property {string} claimId  VER-0142
 * @property {?string} legacyRef  VC-2048 (id in the former Block Operations queue)
 * @property {?string} legacyPlotId  KPT-BLK-07
 * @property {QueueClaimType} type
 * @property {string} plotId  map id, e.g. KIP-09
 * @property {string} zoneId
 * @property {string} reportedBy  RVT-1042. Internal only, never exported, indexed or sent.
 * @property {string} reportedAt  ISO 8601
 * @property {ClaimStage} stage  existing typedef; set by earlier pipeline steps, the officer sets only verified / rejected
 * @property {{workDate:string, trees:?number, areaHa:?number, lengthM:?number, structures:?number, spacingM:?number, mixId:?string, description:string}} work
 * @property {{gps:?{lat:number,lon:number,accuracyM:number}, photos:{capturedAt:string, lat:number, lon:number}[]}} evidence
 * @property {?{ndviBefore:number, ndviAfter:number, cloudFraction:number, passDate:string}} satellite
 * @property {?{kind:EvidenceKind, note:string, requestedAt:string}} evidenceRequest
 * @property {?string} resubmittedAt
 * @property {?{outcome:'verified'|'rejected', reason:?RejectReason, note:string, justification:?string, decidedAt:string, decidedBy:string, countersign:?{by:string, at:string}}} decision
 * @property {?string} arrivesAt  hidden until the demo clock passes it (seed items stamped after the demo start)
 */

/** Incident. `reports` carry a channel, never an identity.
 * @typedef {Object} Incident
 * @property {string} incidentId  INC-2026-0187
 * @property {IncidentType} type
 * @property {string} zoneId @property {string} segmentId @property {?string} plotId
 * @property {?number} lat @property {?number} lon  null when phoned in without a position: the SMS omits its GPS clause and the CSV cells are blank
 * @property {string} firstReportedAt
 * @property {{at:string, channel:'app'|'ussd'|'patrol'|'satellite'|'officer'}[]} reports
 * @property {?number} estAreaHa
 * @property {IncidentStatus} status
 * @property {{rung:KfsRung, channel:'sms'|'phone', sentAt:string, ackAt:?string, ackChannel:?('sms'|'phone'), ackNote:?string}[]} escalations
 * @property {string[]} sourceRefs  PR-0231, ALERT-2291
 * @property {?string} kfsRef  free text entered by the officer
 * @property {?string} note  free text from the officer's form; never a name or phone number
 * @property {?{kind:'resolved'|'false_alarm', areaAffectedHa:?number, note:string, closedAt:string}} outcome
 */

/** Satellite change alert. The two legacy alerts outside the region keep `regionId` and a null `zoneId`, and have no coordinates, pass or NDVI figures.
 * @typedef {Object} BoundaryAlert
 * @property {string} alertId  ALERT-2291
 * @property {RegionId} regionId @property {?string} zoneId @property {?string} segmentId @property {?string} plotId
 * @property {?number} lat @property {?number} lon
 * @property {string} detectedAt @property {?string} passDate
 * @property {number} areaHa @property {number} distanceM @property {?number} ndviDrop @property {?number} cloudFraction
 * @property {AlertStatus} status
 * @property {?string} incidentId @property {?{reason:'cloud_shadow'|'known_incident'|'seasonal_change'|'other', incidentId:?string, note:string}} dismissal
 */

/** Survival count. The planting (date, trees, species) comes from the linked verified claim.
 * @typedef {Object} SurvivalCheck
 * @property {string} checkId  SVC-2026-00731
 * @property {string} claimId  a verified tree_planting claim
 * @property {60|180|365} checkpointDays
 * @property {string} checkedAt @property {number} sampleSize @property {number} alive
 * @property {string} submittedBy  staff code, e.g. SUP-KIP-02
 * @property {?('accepted'|'recount_requested')} review
 * @property {?string} arrivesAt
 */

/** @typedef {Object} MaintenanceTask
 * @property {string} taskId  MT-0001 @property {TaskType} type @property {?string} segmentId @property {?string} zoneId @property {?string} plotId
 * @property {?string} linkedRef  incident, check, claim or alert ref
 * @property {string} assigneeRole  a role title, e.g. "Zone Manager, Olenguruone"
 * @property {string} dueOn @property {TaskStatus} status @property {?string} blockedReason
 * @property {?number} quantity @property {string} note @property {?string} logRef  BM- entry written on completion
 */

/** @typedef {Object} PatrolLog
 * @property {string} logId  BM-318 @property {string} segmentId @property {string} on
 * @property {'patrol'|'fence'|'planting'|'other'} kind @property {string} note @property {string[]} issues
 */

/** Append-only. Shape matches ADMIN.auditLog rows.
 * @typedef {Object} ActivityEntry
 * @property {string} ref  AL-4413 @property {string} when  "16 Sep 06:58" (the Admin audit log's format)
 * @property {string} who  CON-SR-01 @property {string} event
 * @property {string} record @property {string} hash  fnv1a:1a2b3c4d @property {'warn'|'critical'|undefined} tone
 */

/** @typedef {Object} ExportRecord
 * @property {string} exportId  EXP-0001 @property {'kfs_register'|'jaza_miti'|'monthly_return'} template
 * @property {string} period @property {number} rows @property {string} generatedAt @property {string} hash
 */

export {}
