// Conservation Officer policy. Every threshold in the console comes from this
// one file, and every one of them is PROPOSED: none has been signed off by
// NTZDC. The UI shows a "Proposed policy" tag wherever a threshold is used, and
// calls the escalation windows "targets", never deadlines.
//
// Pure data, no imports: this file runs under plain Node and in the browser.

/** Freezes an object graph so an accidental write in a rule or reducer throws instead of corrupting shared data. */
export function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const key of Object.keys(value)) deepFreeze(value[key])
  }
  return value
}

export const POLICY = deepFreeze({
  claims: {
    gpsAccuracyMaxM: 20,
    gpsInsidePlotToleranceM: 30, // allowed beyond the plot's equivalent radius
    minPhotos: 2,
    photoMaxAgeHours: 48, // capture to submission
    photoMaxDistanceM: 100, // photo GPS to claim GPS
    densityBandPerHa: [400, 2500], // 5 m to 2 m spacing
    spacingToleranceFraction: 0.35,
    duplicateWindowDays: 14,
    ndviTolerance: -0.03,
    cloudMaxFraction: 0.2,
    satelliteApplies: ['tree_planting', 'buffer_maintenance'],
    decisionSlaWorkingDays: 5, // Mon–Fri only; no public-holiday table
    countersignAreaHa: 3,
    justificationMinChars: 20,
    rejectNoteMinChars: 20,
    evidenceRequestNoteMinChars: 10,
  },
  survival: {
    threshold: 0.8,
    sampleSize: 50,
    checkpointsDays: [60, 180, 365],
    graceDays: 7,
    dueSoonDays: 14,
    z: 1.96,
  },
  boundary: {
    weights: { fenceContinuity: 0.4, canopyIntact: 0.35, beaconsAndSigns: 0.25 },
    amberBelow: 0.88,
    criticalBelow: 0.75,
    patrolIntervalDays: { normal: 14, high: 7 },
    highRiskMonths: [1, 2, 3],
    highRiskIncidentTypes: ['fire', 'illegal_logging', 'charcoal', 'encroachment'],
    alert: { ndviDropMin: 0.15, minMappingUnitHa: 0.1, bufferM: 500 },
    groundAgreementWindowDays: 14,
    satelliteVisibleTypes: ['fire', 'illegal_logging', 'charcoal', 'illegal_grazing', 'encroachment'],
    dismissNoteMinChars: 20,
    baselineDate: '2020-12-31',
  },
  incidents: { closeNoteMinChars: 20 },
  tasks: { blockReasonMinChars: 10 },
  sms: { maxChars: 160 },
})

/**
 * Escalation targets by incident type. `firstMessageMin` is the target for the
 * first KFS message (from the first report); `ackMin` is the target for a KFS
 * acknowledgement (from the latest message sent), `null` when none applies.
 * These are TARGETS, not statutory deadlines.
 */
export const ESCALATION = deepFreeze({
  fire: {
    severity: 'critical',
    firstMessageMin: 15,
    ackMin: 15,
    ladder: ['station_in_charge', 'county_ecosystem_conservator', 'kfs_commandant'],
  },
  illegal_logging: {
    severity: 'high',
    firstMessageMin: 60,
    ackMin: 60,
    ladder: ['station_in_charge', 'county_ecosystem_conservator', 'kfs_commandant'],
  },
  charcoal: {
    severity: 'high',
    firstMessageMin: 120,
    ackMin: 120,
    ladder: ['station_in_charge', 'county_ecosystem_conservator'],
  },
  encroachment: {
    severity: 'medium',
    firstMessageMin: 1440,
    ackMin: 1440,
    ladder: ['station_in_charge', 'county_ecosystem_conservator'],
  },
  illegal_grazing: {
    severity: 'low',
    firstMessageMin: 1440,
    ackMin: 1440,
    ladder: ['station_in_charge'],
  },
  beacon_or_fence_damage: {
    severity: 'low',
    firstMessageMin: 4320,
    ackMin: 4320,
    ladder: ['station_in_charge'],
  },
  other: {
    severity: 'low',
    firstMessageMin: 4320,
    ackMin: null,
    ladder: ['station_in_charge'],
  },
})

// ── Vocabulary ──────────────────────────────────────────────────────────────
// The closed lists the reducer validates against and the screens render as
// choices. Display text for each id lives in `labels.js`.

/** Incident types in display order (the escalation table's order). */
export const INCIDENT_TYPES = Object.freeze(Object.keys(ESCALATION))

/** Rungs of the KFS ladder, nearest first. */
export const RUNG_ORDER = Object.freeze(['station_in_charge', 'county_ecosystem_conservator', 'kfs_commandant'])

/** Legal incident status order. `closed` is reached only through a close action. */
export const INCIDENT_STATUS_CHAIN = Object.freeze([
  'reported',
  'triaged',
  'escalated',
  'acknowledged',
  'responding',
  'controlled',
  'closed',
])

/** The nine derived evidence rules, in the order the evidence table lists them. */
export const CLAIM_FLAGS = Object.freeze([
  'gps_outside_plot',
  'gps_low_accuracy',
  'low_photo_count',
  'photo_stale_or_far',
  'density_out_of_band',
  'spacing_mismatch',
  'duplicate_suspected',
  'satellite_contradicts',
  'satellite_unreliable',
])

export const CLAIM_TYPES = Object.freeze(['tree_planting', 'buffer_maintenance', 'erosion_control', 'invasive_removal'])

export const REJECT_REASONS = Object.freeze([
  'no_structures_found',
  'gps_outside_plot',
  'insufficient_photos',
  'quantity_not_supported',
  'satellite_contradicts',
  'duplicate',
  'other',
])

export const EVIDENCE_KINDS = Object.freeze(['photos', 'gps_retake', 'recount', 'field_check'])

export const DISMISSAL_REASONS = Object.freeze(['cloud_shadow', 'known_incident', 'seasonal_change', 'other'])

export const TASK_TYPES = Object.freeze([
  'fence_repair',
  'beacon_replacement',
  'signage',
  'firebreak_clearing',
  'invasive_clearing',
  'replanting',
  'planting',
  'field_check',
  'count_request',
  'boundary_survey_request',
])

export const PATROL_ISSUES = Object.freeze([
  'fence_gap',
  'missing_beacon_or_sign',
  'fresh_cutting',
  'livestock_sign',
  'fire_sign',
  'none',
])

export const EXPORT_TEMPLATES = Object.freeze(['kfs_register', 'jaza_miti', 'monthly_return'])
export const EXPORT_PERIODS = Object.freeze(['last_30_days', 'month_to_date', 'august_2026', 'all_time'])

/** Who acts in the activity log for every officer action. */
export const OFFICER_ID = 'CON-SR-01'
