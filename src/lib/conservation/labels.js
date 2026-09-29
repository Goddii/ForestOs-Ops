// Display labels, tones, formatting and the one time formatter for the
// Conservation Officer console. Pure: no React, no icons, no rules. Node-importable.
//
// Tones are the DashboardKit pill tones (`positive` | `warn` | `critical` |
// `neutral`). The kit guesses a tone from the status word when none is passed,
// so every pill in this console gets an explicit one from the maps below.

import { POLICY } from './policy.js'

// ── Time ────────────────────────────────────────────────────────────────────
// All stored timestamps are UTC ISO strings. Display is East Africa Time
// (UTC+3, no daylight saving) through this one function. The month names come
// from a fixed table on purpose: engines disagree on the English short month
// ("Sep" vs "Sept"), and the copy is "16 Sep 2026".

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const EAT_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Nairobi',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Formats an instant (epoch milliseconds, or anything `Date.parse` reads) in EAT.
 * Styles: `date` → `16 Sep 2026` · `time` → `07:12` · `datetime` → `16 Sep 07:12`
 * (the Admin audit log's format) · `stamp` → `2026-09-16 07:12` (CSV).
 */
export function formatEat(instant, style = 'datetime') {
  const ms = typeof instant === 'number' ? instant : Date.parse(instant)
  const parts = {}
  for (const part of EAT_FORMAT.formatToParts(ms)) {
    if (part.type !== 'literal') parts[part.type] = part.value
  }
  const month = MONTHS[Number(parts.month) - 1]
  const day = String(Number(parts.day))
  const time = `${parts.hour}:${parts.minute}`
  switch (style) {
    case 'date':
      return `${day} ${month} ${parts.year}`
    case 'time':
      return time
    case 'stamp':
      return `${parts.year}-${parts.month}-${parts.day} ${time}`
    case 'datetime':
    default:
      return `${day} ${month} ${time}`
  }
}

/** `2026-09-19` → `19 Sep` (or `19 Sep 2026` with `withYear`). A calendar date has no time zone. */
export function formatDay(dateKey, withYear = false) {
  const [year, month, day] = String(dateKey).slice(0, 10).split('-')
  const base = `${Number(day)} ${MONTHS[Number(month) - 1]}`
  return withYear ? `${base} ${year}` : base
}

/** `2026-09` style month heading for an instant: `Sep 2026`. */
export function formatEatMonth(instant) {
  return formatEat(instant, 'date').split(' ').slice(1).join(' ')
}

// ── Numbers ─────────────────────────────────────────────────────────────────

/** `1800` → `1,800` (integers and decimals; no locale lookup). */
export function formatCount(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  const [whole, fraction] = String(n).split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fraction ? `${grouped}.${fraction}` : grouped
}

/** Hectares without trailing zeros: `3` , `0.15`, `41.4`. */
export function formatHa(n) {
  if (n === null || n === undefined) return '—'
  return formatCount(Number(Number(n).toFixed(2)))
}

/** A fraction as a percentage string: `0.9356` → `94%`; `digits` = 1 gives `93.6%`. */
export function formatPct(fraction, digits = 0) {
  if (fraction === null || fraction === undefined || Number.isNaN(fraction)) return '—'
  return `${(fraction * 100).toFixed(digits)}%`
}

/**
 * A length of time in words: `<1 min`, `14 min`, `50 h`. Minutes below an hour,
 * whole hours above; always rounded down so "due in 50 h" never promises more
 * time than there is.
 */
export function formatDuration(minutes) {
  const m = Math.max(0, minutes)
  if (m < 1) return '<1 min'
  if (m < 60) return `${Math.floor(m)} min`
  return `${Math.floor(m / 60)} h`
}

// ── Claims ──────────────────────────────────────────────────────────────────

export const CLAIM_TYPE_LABEL = {
  tree_planting: 'Tree planting',
  buffer_maintenance: 'Buffer maintenance',
  erosion_control: 'Erosion control',
  invasive_removal: 'Invasive removal',
}

export const CLAIM_STATUS_LABEL = {
  awaiting_decision: 'Awaiting decision',
  awaiting_countersign: 'Awaiting countersign',
  evidence_requested: 'Evidence requested',
  in_pipeline: 'In pipeline',
  verified: 'Verified',
  rejected: 'Rejected',
}

export const CLAIM_STATUS_TONE = {
  awaiting_decision: 'neutral',
  awaiting_countersign: 'neutral',
  evidence_requested: 'warn',
  in_pipeline: 'neutral',
  verified: 'positive',
  rejected: 'warn',
}

/** The stored pipeline stages, in order, as the stepper shows them. */
export const CLAIM_STAGE_STEPS = [
  { stage: 'reported', label: 'Reported' },
  { stage: 'field_verified', label: 'Field verified' },
  { stage: 'evidence_attached', label: 'Evidence attached' },
  { stage: 'satellite_checked', label: 'Satellite cross-check' },
  { stage: 'verified', label: 'Verified' },
]

export const FLAG_LABEL = {
  gps_outside_plot: 'GPS outside plot',
  gps_low_accuracy: 'GPS accuracy low',
  low_photo_count: 'Too few photos',
  photo_stale_or_far: 'Photo stale or far',
  density_out_of_band: 'Density out of range',
  spacing_mismatch: 'Spacing mismatch',
  duplicate_suspected: 'Possible duplicate',
  satellite_contradicts: 'Satellite contradicts',
  satellite_unreliable: 'Satellite unreliable',
}

/** Plain-language rule and the proposed policy value behind each evidence check. */
export const FLAG_RULE = {
  gps_outside_plot: 'GPS is inside the plot',
  gps_low_accuracy: 'GPS accuracy is good enough',
  low_photo_count: 'Enough photos attached',
  photo_stale_or_far: 'Photos are fresh and taken at the site',
  density_out_of_band: 'Planting density is plausible',
  spacing_mismatch: 'Density matches the stated spacing',
  duplicate_suspected: 'Not a duplicate of an earlier claim',
  satellite_contradicts: 'Satellite does not contradict the work',
  satellite_unreliable: 'Satellite pass is clear enough to rely on',
}

const c = POLICY.claims
export const FLAG_POLICY = {
  gps_outside_plot: `Within the plot’s equivalent radius + ${c.gpsInsidePlotToleranceM} m`,
  gps_low_accuracy: `Accuracy ${c.gpsAccuracyMaxM} m or better`,
  low_photo_count: `At least ${c.minPhotos} photos`,
  photo_stale_or_far: `Taken within ${c.photoMaxAgeHours} h of submission and ${c.photoMaxDistanceM} m of the GPS point`,
  density_out_of_band: `${formatCount(c.densityBandPerHa[0])} to ${formatCount(c.densityBandPerHa[1])} trees per ha`,
  spacing_mismatch: `Within ${Math.round(c.spacingToleranceFraction * 100)}% of 10,000 ÷ spacing²`,
  duplicate_suspected: `No earlier claim of the same type on the plot within ${c.duplicateWindowDays} days`,
  satellite_contradicts: `NDVI change no lower than ${c.ndviTolerance.toFixed(2).replace('-', '−')}`,
  satellite_unreliable: `Cloud at or below ${Math.round(c.cloudMaxFraction * 100)}%`,
}

export const REJECT_REASON_LABEL = {
  no_structures_found: 'No structures found',
  gps_outside_plot: 'GPS outside the plot',
  insufficient_photos: 'Not enough photos',
  quantity_not_supported: 'Quantity not supported by the evidence',
  satellite_contradicts: 'Satellite contradicts the claim',
  duplicate: 'Duplicate of another claim',
  other: 'Other (explain in the note)',
}

export const EVIDENCE_KIND_LABEL = {
  photos: 'More photos',
  gps_retake: 'GPS re-take',
  recount: 'Recount',
  field_check: 'Field check',
}

// ── Incidents ───────────────────────────────────────────────────────────────

export const INCIDENT_TYPE_LABEL = {
  fire: 'Fire',
  illegal_logging: 'Illegal logging',
  charcoal: 'Charcoal burning',
  illegal_grazing: 'Illegal grazing',
  encroachment: 'Encroachment',
  beacon_or_fence_damage: 'Beacon or fence damage',
  other: 'Other incident',
}

/** Word used in the KFS text message: short, upper case, GSM-safe. */
export const SMS_TYPE = {
  fire: 'FIRE',
  illegal_logging: 'LOGGING',
  charcoal: 'CHARCOAL',
  illegal_grazing: 'GRAZING',
  encroachment: 'ENCROACHMENT',
  beacon_or_fence_damage: 'FENCE DAMAGE',
  other: 'INCIDENT',
}

export const SEVERITY_LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }
export const SEVERITY_TONE = { critical: 'critical', high: 'warn', medium: 'neutral', low: 'neutral' }

export const INCIDENT_STATUS_LABEL = {
  reported: 'Reported',
  triaged: 'Triaged',
  escalated: 'Escalated',
  acknowledged: 'Acknowledged',
  responding: 'Responding',
  controlled: 'Controlled',
  closed: 'Closed',
}

export const INCIDENT_STATUS_TONE = {
  reported: 'neutral',
  triaged: 'neutral',
  escalated: 'warn',
  acknowledged: 'neutral',
  responding: 'neutral',
  controlled: 'positive',
  closed: 'neutral',
}

/** The button text for stepping an incident to the next status. */
export const INCIDENT_STATUS_ACTION = {
  triaged: 'Mark triaged',
  escalated: 'Mark escalated',
  acknowledged: 'Mark acknowledged',
  responding: 'Mark responding',
  controlled: 'Mark controlled',
}

export const RUNG_STATE_LABEL = {
  waiting: 'Waiting',
  due: 'Due',
  sent: 'Sent',
  overdue: 'Overdue',
  acknowledged: 'Acknowledged',
  not_needed: 'Not needed',
}

export const RUNG_STATE_TONE = {
  waiting: 'neutral',
  due: 'warn',
  sent: 'neutral',
  overdue: 'critical',
  acknowledged: 'positive',
  not_needed: 'neutral',
}

export const REPORT_CHANNEL_LABEL = {
  app: 'Mobile app',
  ussd: 'USSD',
  patrol: 'Patrol',
  satellite: 'Satellite',
  officer: 'Officer',
}

export const KFS_CHANNEL_LABEL = { sms: 'SMS', phone: 'Phone' }

export const OUTCOME_LABEL = { resolved: 'Resolved', false_alarm: 'False alarm' }

// ── Boundary ────────────────────────────────────────────────────────────────

export const ALERT_STATUS_LABEL = {
  new: 'New',
  under_review: 'Under review',
  confirmed: 'Confirmed',
  dismissed: 'Dismissed',
  resolved: 'Resolved',
}

export const ALERT_STATUS_TONE = {
  new: 'warn',
  under_review: 'neutral',
  confirmed: 'neutral',
  dismissed: 'neutral',
  resolved: 'positive',
}

export const DISMISSAL_LABEL = {
  cloud_shadow: 'Cloud shadow',
  known_incident: 'Known incident',
  seasonal_change: 'Seasonal change',
  other: 'Other',
}

/** Ground agreement: does the ground report agree with the satellite signal? */
export const AGREEMENT_LABEL = { both: 'Both', satellite_only: 'Satellite only', ground_only: 'Ground only' }
export const AGREEMENT_TONE = { both: 'neutral', satellite_only: 'warn', ground_only: 'neutral' }

// ── Survival, patrols, tasks ────────────────────────────────────────────────

export const VERDICT_LABEL = { pass: 'Pass', borderline: 'Borderline', fail: 'Fail' }
export const VERDICT_TONE = { pass: 'positive', borderline: 'neutral', fail: 'warn' }

export const COUNT_STATE_LABEL = { upcoming: 'Upcoming', due: 'Due', overdue: 'Overdue' }
export const COUNT_STATE_TONE = { upcoming: 'neutral', due: 'warn', overdue: 'critical' }

export const CHECKPOINT_LABEL = { 60: '60 days', 180: '180 days', 365: '365 days' }

export const PATROL_STATE_TONE = { on_schedule: 'positive', due_today: 'neutral', overdue: 'critical' }

export const TASK_TYPE_LABEL = {
  fence_repair: 'Fence repair',
  beacon_replacement: 'Beacon replacement',
  signage: 'Signage',
  firebreak_clearing: 'Firebreak clearing',
  invasive_clearing: 'Invasive clearing',
  replanting: 'Replanting',
  planting: 'Planting',
  field_check: 'Field check',
  count_request: 'Survival count request',
  boundary_survey_request: 'Boundary survey request',
}

/** Unit for a task's quantity; `null` where a quantity does not apply. */
export const TASK_UNIT = {
  fence_repair: 'm',
  beacon_replacement: 'beacons',
  signage: 'signs',
  firebreak_clearing: 'm',
  invasive_clearing: 'ha',
  replanting: 'trees',
  planting: 'trees',
  field_check: null,
  count_request: 'trees',
  boundary_survey_request: null,
}

export const TASK_STATUS_LABEL = { planned: 'Planned', in_progress: 'In progress', blocked: 'Blocked', done: 'Done' }
export const TASK_STATUS_TONE = { planned: 'neutral', in_progress: 'neutral', blocked: 'warn', done: 'positive' }

export const PATROL_ISSUE_LABEL = {
  fence_gap: 'Fence gap',
  missing_beacon_or_sign: 'Missing beacon or sign',
  fresh_cutting: 'Fresh cutting',
  livestock_sign: 'Livestock sign',
  fire_sign: 'Fire sign',
  none: 'None',
}

export const LOG_KIND_LABEL = { patrol: 'Patrol', fence: 'Fence', planting: 'Planting', other: 'Other' }

/** `12 beacons`, `400 m`, `1.5 ha`; empty when the task carries no quantity. */
export function formatTaskQuantity(task) {
  const unit = TASK_UNIT[task.type]
  if (task.quantity === null || task.quantity === undefined || !unit) return ''
  return `${formatCount(task.quantity)} ${unit}`
}

/** One-line summary of the work a claim reports: `1,800 trees · 2.4 ha`. */
export function quantitySummary(claim) {
  const { work } = claim
  const parts = []
  if (work.trees !== null && work.trees !== undefined) parts.push(`${formatCount(work.trees)} trees`)
  if (work.structures !== null && work.structures !== undefined) {
    parts.push(`${formatCount(work.structures)} ${claim.type === 'erosion_control' ? 'check-dams' : 'structures'}`)
  }
  if (work.lengthM !== null && work.lengthM !== undefined) parts.push(`${formatCount(work.lengthM)} m`)
  if (work.areaHa !== null && work.areaHa !== undefined) parts.push(`${formatHa(work.areaHa)} ha`)
  return parts.join(' · ')
}

// ── Reports and exports ─────────────────────────────────────────────────────

export const EXPORT_TEMPLATE_LABEL = {
  kfs_register: 'KFS incident & encroachment register',
  jaza_miti: 'Jaza Miti planting sheet',
  monthly_return: 'Head-office monthly return',
}

export const EXPORT_TEMPLATE_SLUG = {
  kfs_register: 'kfs-register',
  jaza_miti: 'jaza-miti',
  monthly_return: 'monthly-return',
}

export const PERIOD_SLUG = {
  last_30_days: 'last-30-days',
  month_to_date: 'month-to-date',
  august_2026: 'august-2026',
  all_time: 'all-time',
}

/** Period choices for the picker. Month to date follows the demo clock. */
export function periodLabel(periodId, now) {
  switch (periodId) {
    case 'last_30_days':
      return 'Last 30 days'
    case 'month_to_date':
      return `Month to date (${formatEatMonth(now)})`
    case 'august_2026':
      return 'August 2026'
    case 'all_time':
    default:
      return 'All time'
  }
}

/** The form stored on an export record and shown in the history: `last 30 days`, `August 2026`, `all time`. */
export function periodRecordLabel(periodId, now) {
  switch (periodId) {
    case 'last_30_days':
      return 'last 30 days'
    case 'month_to_date':
      return `month to date (${formatEatMonth(now)})`
    case 'august_2026':
      return 'August 2026'
    case 'all_time':
    default:
      return 'all time'
  }
}

// ── Copy shared by several screens ──────────────────────────────────────────

export const COPY = {
  saved: 'Recorded in this session only. Prototype: nothing is written to a server.',
  proposedPolicy: 'Proposed policy',
  illustrativeSms: 'Illustrative message. Not sent to KFS.',
  smsSent: 'Sent (simulated). Nothing left this browser.',
  ndviGloss: 'NDVI, a satellite greenness index',
  noPersonalData: 'No personal identifiers: check passed',
  phoneKfs: 'No acknowledgement after all rungs. Phone KFS directly.',
  agreement:
    'Agreement is the evidence: a satellite signal nobody on the ground has seen, or a ground report the satellite does not show, is the interesting case.',
  mockNames:
    'Prototype data. Zone, segment, plot and place names in this console are mock and not surveyed. Do not send these files to KFS, KEFRI or head office.',
}
