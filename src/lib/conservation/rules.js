// The Conservation Officer rules: pure functions of their inputs and `now`.
// No React, no clock, no randomness. `now` is the demo clock in epoch
// milliseconds and is always passed in. Every threshold comes from `policy.js`.
// Node-importable: the check script loads this file directly.

import { CLAIM_FLAGS, ESCALATION, INCIDENT_STATUS_CHAIN, POLICY } from './policy.js'
import { FLAG_POLICY, FLAG_RULE, SMS_TYPE, formatCount, formatDay, formatEat, formatHa } from './labels.js'

// ── Time ────────────────────────────────────────────────────────────────────

export const MINUTE_MS = 60 * 1000
export const HOUR_MS = 60 * MINUTE_MS
export const DAY_MS = 24 * HOUR_MS
const EAT_OFFSET_MS = 3 * HOUR_MS // East Africa Time is UTC+3 with no daylight saving

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** Epoch ms of a number, an ISO timestamp, or a bare `YYYY-MM-DD` date (taken as 00:00 EAT). */
export function msOf(value) {
  if (typeof value === 'number') return value
  if (DATE_ONLY.test(value)) return Date.parse(`${value}T00:00:00+03:00`)
  return Date.parse(value)
}

/** ISO 8601 UTC string, to the second, for an instant. */
export function isoOf(ms) {
  return new Date(Math.floor(ms / 1000) * 1000).toISOString().replace('.000Z', 'Z')
}

/** Days since 1970-01-01 of the EAT calendar day that contains an instant (or that a bare date names). */
export function eatDay(value) {
  if (typeof value === 'string' && DATE_ONLY.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS)
  }
  return Math.floor((msOf(value) + EAT_OFFSET_MS) / DAY_MS)
}

/** `YYYY-MM-DD` of an EAT day index. */
export function dayKey(dayIndex) {
  return new Date(dayIndex * DAY_MS).toISOString().slice(0, 10)
}

/** `YYYY-MM-DD` of the EAT day that contains an instant. */
export function eatDateKey(value) {
  return dayKey(eatDay(value))
}

/** `YYYY-MM` of the EAT month that contains an instant. */
export function eatMonthKey(value) {
  return eatDateKey(value).slice(0, 7)
}

/** `YYYY-MM-DD` a number of days after a calendar date (negative goes back). */
export function addDaysKey(dateKey, days) {
  return dayKey(eatDay(dateKey) + days)
}

/** Midnight EAT at the start of the EAT month that contains an instant. */
export function eatMonthStartMs(value) {
  return msOf(`${eatMonthKey(value)}-01`)
}

/** 0 = Sunday … 6 = Saturday, of an EAT day index (1 January 1970 was a Thursday). */
function weekdayOf(dayIndex) {
  return (((dayIndex + 4) % 7) + 7) % 7
}

/**
 * Working days (Monday to Friday; no public-holiday table) counted AFTER the
 * starting day, up to and including the end day. Both ends may be instants or
 * bare dates; the days are EAT calendar days.
 */
export function workingDaysElapsed(from, to) {
  const start = eatDay(from)
  const end = eatDay(to)
  let count = 0
  for (let day = start + 1; day <= end; day += 1) {
    const weekday = weekdayOf(day)
    if (weekday !== 0 && weekday !== 6) count += 1
  }
  return count
}

/** True when a record has arrived: no `arrivesAt`, or the demo clock has passed it. */
export function isVisible(record, now) {
  return !record.arrivesAt || msOf(record.arrivesAt) <= now
}

export function median(values) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// ── Geodesy ─────────────────────────────────────────────────────────────────
// Spherical, pinned so every implementation agrees. Coordinates are stored
// unrounded and rounded to four decimals only on output.

export const EARTH_RADIUS_M = 6371008.8

const toRad = (degrees) => (degrees * Math.PI) / 180
const toDeg = (radians) => (radians * 180) / Math.PI

/** Great-circle distance in metres between two `{ lat, lon }` points. */
export function haversine(a, b) {
  const phi1 = toRad(a.lat)
  const phi2 = toRad(b.lat)
  const dPhi = phi2 - phi1
  const dLambda = toRad(b.lon - a.lon)
  const h = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Spherical destination point: bearing clockwise from north, distance in metres. */
export function destination(point, bearingDeg, distanceM) {
  const delta = distanceM / EARTH_RADIUS_M
  const theta = toRad(bearingDeg)
  const phi1 = toRad(point.lat)
  const lambda1 = toRad(point.lon)
  const phi2 = Math.asin(Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta))
  const lambda2 =
    lambda1 +
    Math.atan2(Math.sin(theta) * Math.sin(delta) * Math.cos(phi1), Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2))
  return { lat: toDeg(phi2), lon: toDeg(lambda2) }
}

/** Radius in metres of the circle with the same area as a plot. Never derived from the schematic ring. */
export function plotRadiusM(hectares) {
  return Math.sqrt((hectares * 10000) / Math.PI)
}

/** Coordinates to four decimals, as text. */
export function formatCoord(value) {
  return value.toFixed(4)
}

// ── Claims ──────────────────────────────────────────────────────────────────

const C = POLICY.claims

/** `VER-0142` → 142. */
export function claimNumber(claimId) {
  return Number(String(claimId).split('-')[1])
}

const plotOf = (ctx, plotId) => ctx.ref.plots.find((p) => p.id === plotId) ?? null
const round0 = (n) => Math.round(n)

/**
 * The nine evidence rules for a claim, one row each, in a fixed order. `result`
 * is `pass` | `flag` | `not_applicable`; `detail` carries the numbers behind
 * it and `policy` the proposed value. Flags are derived from this table, so
 * the screen and the rules can never disagree.
 */
export function claimChecks(claim, ctx) {
  const plot = plotOf(ctx, claim.plotId)
  const gps = claim.evidence.gps
  const photos = claim.evidence.photos
  const submittedMs = msOf(claim.reportedAt)
  const { work } = claim
  const satelliteApplies = C.satelliteApplies.includes(claim.type)
  const rows = {}

  // 1. GPS inside the plot
  if (!gps) {
    rows.gps_outside_plot = { result: 'flag', detail: 'No GPS point was recorded with this claim.' }
  } else if (!plot) {
    rows.gps_outside_plot = { result: 'flag', detail: 'The plot is not on the map, so the GPS point cannot be checked.' }
  } else {
    const distance = haversine(gps, plot)
    const radius = plotRadiusM(plot.hectares)
    const limit = radius + C.gpsInsidePlotToleranceM
    rows.gps_outside_plot = {
      result: distance > limit ? 'flag' : 'pass',
      detail: `GPS is ${round0(distance)} m from the plot centre; plot radius ${round0(radius)} m + ${C.gpsInsidePlotToleranceM} m tolerance.`,
    }
  }

  // 2. GPS accuracy
  rows.gps_low_accuracy = gps
    ? {
        result: gps.accuracyM > C.gpsAccuracyMaxM ? 'flag' : 'pass',
        detail: `Reported GPS accuracy is ${round0(gps.accuracyM)} m.`,
      }
    : { result: 'not_applicable', detail: 'No GPS point to measure.' }

  // 3. Photo count
  rows.low_photo_count = {
    result: photos.length < C.minPhotos ? 'flag' : 'pass',
    detail: `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'} attached; ${C.minPhotos} needed.`,
  }

  // 4. Photo age and distance
  if (photos.length === 0) {
    rows.photo_stale_or_far = { result: 'not_applicable', detail: 'No photos to check.' }
  } else {
    const oldestHours = Math.max(...photos.map((p) => (submittedMs - msOf(p.capturedAt)) / HOUR_MS))
    const farthestM = gps ? Math.max(...photos.map((p) => haversine(p, gps))) : null
    const stale = oldestHours > C.photoMaxAgeHours
    const far = farthestM !== null && farthestM > C.photoMaxDistanceM
    rows.photo_stale_or_far = {
      result: stale || far ? 'flag' : 'pass',
      detail:
        `Oldest photo was taken ${round0(oldestHours)} h before submission` +
        (farthestM === null ? '; distance not checked without GPS.' : `; farthest is ${round0(farthestM)} m from the GPS point.`),
    }
  }

  // 5. Planting density
  const planting = claim.type === 'tree_planting'
  const hasDensity = planting && work.trees > 0 && work.areaHa > 0
  const density = hasDensity ? work.trees / work.areaHa : null
  if (!hasDensity) {
    rows.density_out_of_band = {
      result: 'not_applicable',
      detail: planting ? 'No tree count or area to compute a density.' : 'Applies to tree planting only.',
    }
  } else {
    const [low, high] = C.densityBandPerHa
    rows.density_out_of_band = {
      result: density < low || density > high ? 'flag' : 'pass',
      detail: `${formatCount(round0(density))} trees per ha (${formatCount(work.trees)} trees on ${formatHa(work.areaHa)} ha).`,
    }
  }

  // 6. Spacing against density
  if (!hasDensity || !work.spacingM) {
    rows.spacing_mismatch = {
      result: 'not_applicable',
      detail: !planting ? 'Applies to tree planting only.' : 'No planting spacing was reported.',
    }
  } else {
    const expected = 10000 / (work.spacingM * work.spacingM)
    const apart = Math.abs(density - expected) / expected
    rows.spacing_mismatch = {
      result: apart > C.spacingToleranceFraction ? 'flag' : 'pass',
      detail: `${formatCount(round0(density))} trees per ha reported; ${formatCount(round0(expected))} expected at ${work.spacingM} m spacing (${round0(apart * 100)}% apart).`,
    }
  }

  // 7. Duplicate of an earlier claim
  const earlier = ctx.state.claims
    .filter(
      (other) =>
        other.claimId !== claim.claimId &&
        isVisible(other, ctx.now) &&
        other.type === claim.type &&
        other.plotId === claim.plotId &&
        other.decision?.outcome !== 'rejected' &&
        (msOf(other.reportedAt) < submittedMs ||
          (msOf(other.reportedAt) === submittedMs && claimNumber(other.claimId) < claimNumber(claim.claimId))) &&
        submittedMs - msOf(other.reportedAt) <= C.duplicateWindowDays * DAY_MS,
    )
    .sort((a, b) => msOf(b.reportedAt) - msOf(a.reportedAt))
  rows.duplicate_suspected = earlier.length
    ? {
        result: 'flag',
        detail: `${earlier[0].claimId} (same type, same plot) was reported ${round0((submittedMs - msOf(earlier[0].reportedAt)) / DAY_MS)} days earlier.`,
      }
    : { result: 'pass', detail: `No earlier claim of this type on ${claim.plotId} in the last ${C.duplicateWindowDays} days.` }

  // 8 and 9. Satellite
  const sat = claim.satellite
  if (!satelliteApplies) {
    const na = {
      result: 'not_applicable',
      detail: `Not applicable: structures and cleared areas are not reliably visible at 10 m.`,
    }
    rows.satellite_contradicts = na
    rows.satellite_unreliable = na
  } else if (!sat) {
    const na = { result: 'not_applicable', detail: 'No satellite result yet.' }
    rows.satellite_contradicts = na
    rows.satellite_unreliable = na
  } else {
    // Rounded to 4 places so a change of exactly the tolerance is not tipped over by float noise.
    const change = Math.round((sat.ndviAfter - sat.ndviBefore) * 10000) / 10000
    rows.satellite_contradicts = {
      result: change < C.ndviTolerance ? 'flag' : 'pass',
      detail: `NDVI ${sat.ndviBefore.toFixed(2)} → ${sat.ndviAfter.toFixed(2)} (${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(2)}).`,
    }
    rows.satellite_unreliable = {
      result: sat.cloudFraction > C.cloudMaxFraction ? 'flag' : 'pass',
      detail: `Cloud cover on the ${formatDay(sat.passDate)} pass was ${round0(sat.cloudFraction * 100)}%.`,
    }
  }

  return CLAIM_FLAGS.map((flag) => ({
    flag,
    rule: FLAG_RULE[flag],
    policy: FLAG_POLICY[flag],
    ...rows[flag],
  }))
}

/** The flags a claim raises (derived, never stored), in the evidence table's order. */
export function claimFlags(claim, ctx) {
  return claimChecks(claim, ctx)
    .filter((row) => row.result === 'flag')
    .map((row) => row.flag)
}

/** Ready for a decision: satellite step done, or (for types the satellite cannot see) evidence attached. */
export function isReady(claim) {
  if (claim.stage === 'satellite_checked') return true
  return !C.satelliteApplies.includes(claim.type) && claim.stage === 'evidence_attached'
}

/** What an in-pipeline claim is waiting on, in words; `null` when it is not waiting. */
export function waitingOn(claim, ref) {
  switch (claim.stage) {
    case 'reported':
      return 'Waiting on: field verification'
    case 'field_verified':
      return 'Waiting on: evidence to be attached'
    case 'evidence_attached':
      return C.satelliteApplies.includes(claim.type)
        ? `Waiting on: next Sentinel-2 pass, ${formatDay(ref.sentinel.nextPass)}`
        : null
    default:
      return null
  }
}

/** A countersign is needed when the claim has any flag or covers 3 ha or more. */
export function needsCountersign(claim, ctx) {
  return claimFlags(claim, ctx).length > 0 || (claim.work.areaHa ?? 0) >= C.countersignAreaHa
}

/** Derived status; first match wins. */
export function claimStatus(claim, ctx) {
  const decision = claim.decision
  if (decision?.outcome === 'rejected') return 'rejected'
  if (decision?.outcome === 'verified') {
    return !decision.countersign && needsCountersign(claim, ctx) ? 'awaiting_countersign' : 'verified'
  }
  if (claim.evidenceRequest) return 'evidence_requested'
  if (isReady(claim)) return 'awaiting_decision'
  return 'in_pipeline'
}

/** The SLA clock starts at the report, or restarts from zero when evidence comes back. */
export function slaStart(claim) {
  return claim.resubmittedAt ?? claim.reportedAt
}

export function claimWorkingDays(claim, now) {
  return workingDaysElapsed(slaStart(claim), now)
}

/** Overdue applies only to claims waiting on the officer (or on the countersign). */
export function isClaimOverdue(claim, ctx) {
  const status = claimStatus(claim, ctx)
  return (
    (status === 'awaiting_decision' || status === 'awaiting_countersign') &&
    claimWorkingDays(claim, ctx.now) > C.decisionSlaWorkingDays
  )
}

/** When the claim's decision moved to a final state: the countersign if there is one, else the decision. */
export function completedAt(claim) {
  const d = claim.decision
  if (!d || d.outcome !== 'verified') return null
  return d.countersign ? d.countersign.at : d.decidedAt
}

/**
 * Why Approve is (not) available. `hard` blocks are the two the officer cannot
 * justify away: too few photos, or no GPS point.
 */
export function approveBlockers(claim, ctx) {
  const blockers = []
  const status = claimStatus(claim, ctx)
  if (status === 'rejected' || status === 'verified') {
    blockers.push({ code: 'final', hard: false, message: 'This claim already has a final decision.' })
  } else if (status === 'awaiting_countersign') {
    blockers.push({ code: 'approved', hard: false, message: 'Already approved. Waiting for the countersign.' })
  } else if (status === 'evidence_requested') {
    blockers.push({ code: 'evidence', hard: false, message: 'An evidence request is open. Mark it received before deciding.' })
  } else if (status === 'in_pipeline') {
    blockers.push({ code: 'not_ready', hard: false, message: waitingOn(claim, ctx.ref) ?? 'Not ready for a decision yet.' })
  }
  if (claim.evidence.photos.length < C.minPhotos) {
    blockers.push({
      code: 'photos',
      hard: true,
      message: `Blocks approval: at least ${C.minPhotos} photos are needed (${claim.evidence.photos.length} attached).`,
    })
  }
  if (!claim.evidence.gps) {
    blockers.push({ code: 'gps', hard: true, message: 'Blocks approval: there is no GPS point.' })
  }
  return blockers
}

/** A whole number of trees per species, summing exactly to `trees` (largest remainder; ties to the species listed first). */
export function speciesSplit(mix, trees) {
  const total = mix.species.reduce((sum, s) => sum + s.share, 0)
  const exact = mix.species.map((s) => (trees * s.share) / total)
  const counts = exact.map(Math.floor)
  let left = trees - counts.reduce((sum, n) => sum + n, 0)
  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  for (let i = 0; left > 0; i += 1, left -= 1) counts[order[i].index] += 1
  return counts
}

/** Species rows for a planting: `{ name, trees }`, in the mix's order. */
export function speciesRows(mix, trees) {
  const counts = speciesSplit(mix, trees)
  return mix.species.map((s, i) => ({ name: s.name, trees: counts[i] }))
}

// ── Tree survival ───────────────────────────────────────────────────────────

const S = POLICY.survival

/** Wilson score interval for `alive` of `n`. Fractions in 0..1. */
export function wilson(alive, n, z = S.z) {
  const p = alive / n
  const zz = z * z
  const d = 1 + zz / n
  const centre = (p + zz / (2 * n)) / d
  const half = (z * Math.sqrt((p * (1 - p)) / n + zz / (4 * n * n))) / d
  return { p, lower: Math.max(0, centre - half), upper: Math.min(1, centre + half) }
}

/**
 * `pass` at or above the threshold; `fail` when even the UPPER bound is below
 * it (decisively below); otherwise `borderline`: below the threshold but a
 * sample this size cannot rule out that the planting is fine, so recount
 * before ordering replanting.
 */
export function survivalVerdict(alive, n) {
  const { p, upper } = wilson(alive, n)
  if (p >= S.threshold) return 'pass'
  if (upper < S.threshold) return 'fail'
  return 'borderline'
}

/** Survival read-out for one count. */
export function survivalOf(check) {
  const interval = wilson(check.alive, check.sampleSize)
  return { ...interval, verdict: survivalVerdict(check.alive, check.sampleSize) }
}

/** Trees credited from a planting given its latest count: the point estimate, and the conservative lower bound. */
export function survivalCredit(trees, check) {
  const { lower } = wilson(check.alive, check.sampleSize)
  return {
    point: Math.round((trees * check.alive) / check.sampleSize),
    conservative: Math.floor(trees * lower),
  }
}

/** Replanting (beating-up) quantity: the planting's trees less the trees estimated alive. */
export function replantingQuantity(trees, check) {
  return trees - Math.round((trees * check.alive) / check.sampleSize)
}

/**
 * The next survival count due for a planting: the checkpoint after its latest
 * recorded count (the first if none), due `checkpointDays` after the work date.
 * `upcoming` before the due date, `due` from the due date through the grace
 * period, `overdue` after it. Earlier missed checkpoints are ignored.
 */
export function nextCount(claim, latestCheck, now) {
  const next = latestCheck
    ? S.checkpointsDays.find((days) => days > latestCheck.checkpointDays)
    : S.checkpointsDays[0]
  if (next === undefined) return null
  const dueOn = addDaysKey(claim.work.workDate, next)
  const daysPast = eatDay(now) - eatDay(dueOn)
  const state = daysPast < 0 ? 'upcoming' : daysPast <= S.graceDays ? 'due' : 'overdue'
  return { claimId: claim.claimId, checkpointDays: next, dueOn, daysPast, state }
}

// ── Boundary ────────────────────────────────────────────────────────────────

const B = POLICY.boundary

/** Integrity of one segment (0..1) with its three components. */
export function segmentIntegrity(seg) {
  const fenceContinuity = 1 - seg.markerGapM / (seg.lengthKm * 1000)
  const canopyIntact = Math.min(1, seg.canopyNow / seg.canopyRef)
  const beaconsAndSigns = (seg.beaconsPresent + seg.signsPresent) / (seg.beaconsTotal + seg.signsTotal)
  const integrity =
    B.weights.fenceContinuity * fenceContinuity +
    B.weights.canopyIntact * canopyIntact +
    B.weights.beaconsAndSigns * beaconsAndSigns
  return { fenceContinuity, canopyIntact, beaconsAndSigns, integrity }
}

/** Length-weighted integrity of a set of segments; `null` when there are none. */
export function regionIntegrity(segments) {
  const km = segments.reduce((sum, s) => sum + s.lengthKm, 0)
  if (km === 0) return null
  return segments.reduce((sum, s) => sum + segmentIntegrity(s).integrity * s.lengthKm, 0) / km
}

/** `critical` under 0.75, `amber` under 0.88, else `ok`. */
export function integrityBand(integrity) {
  if (integrity < B.criticalBelow) return 'critical'
  if (integrity < B.amberBelow) return 'amber'
  return 'ok'
}

/** Beacons and signs missing across a set of segments. */
export function missingMarkers(segments) {
  return segments.reduce(
    (total, s) => ({
      beacons: total.beacons + (s.beaconsTotal - s.beaconsPresent),
      signs: total.signs + (s.signsTotal - s.signsPresent),
    }),
    { beacons: 0, signs: 0 },
  )
}

/** Alerts dismissed as cloud shadow, seasonal change or other are not evidence of anything. */
function alertCounts(alert) {
  const reason = alert.dismissal?.reason
  return !(reason === 'cloud_shadow' || reason === 'seasonal_change' || reason === 'other')
}

const groundWindowMs = B.groundAgreementWindowDays * DAY_MS

/**
 * Ground agreement for a satellite alert: `both` when an incident of a type the
 * satellite can see was first reported on the same segment within 14 days
 * either side (an incident created from the alert counts); otherwise
 * `satellite_only`. `null` when the alert has no segment to compare against.
 */
export function groundAgreement(alert, incidents) {
  if (!alert.segmentId) return null
  const detected = msOf(alert.detectedAt)
  const agrees = incidents.some(
    (incident) =>
      incident.incidentId === alert.incidentId ||
      (incident.segmentId === alert.segmentId &&
        B.satelliteVisibleTypes.includes(incident.type) &&
        Math.abs(msOf(incident.firstReportedAt) - detected) <= groundWindowMs),
  )
  return agrees ? 'both' : 'satellite_only'
}

/** The mirror of `groundAgreement` for an incident: `both`, `ground_only`, or `null` for types the satellite cannot see. */
export function satelliteView(incident, alerts) {
  if (!B.satelliteVisibleTypes.includes(incident.type)) return null
  const first = msOf(incident.firstReportedAt)
  const seen = alerts.some(
    (alert) =>
      alertCounts(alert) &&
      (alert.incidentId === incident.incidentId ||
        (alert.segmentId === incident.segmentId && Math.abs(msOf(alert.detectedAt) - first) <= groundWindowMs)),
  )
  return seen ? 'both' : 'ground_only'
}

/** Whether a change alert meets the mapping rules (area, NDVI drop, distance); `null` when its figures are unknown. */
export function alertMeetsCriteria(alert) {
  if (alert.ndviDrop === null || alert.ndviDrop === undefined) return null
  return (
    alert.areaHa >= B.alert.minMappingUnitHa &&
    alert.ndviDrop >= B.alert.ndviDropMin &&
    alert.distanceM <= B.alert.bufferM
  )
}

/** High risk: a high-risk month, or an open incident of a high-risk type on the segment. */
export function segmentRisk(segmentId, incidents, now) {
  const month = Number(eatMonthKey(now).slice(5, 7))
  if (B.highRiskMonths.includes(month)) return { high: true, reason: 'high-risk season' }
  const open = incidents.find(
    (i) => i.segmentId === segmentId && i.status !== 'closed' && B.highRiskIncidentTypes.includes(i.type),
  )
  return open ? { high: true, reason: `open ${open.type.replace(/_/g, ' ')} incident` } : { high: false, reason: null }
}

export function patrolIntervalDays(risk) {
  return risk.high ? B.patrolIntervalDays.high : B.patrolIntervalDays.normal
}

/**
 * `overdue` after the end of the due day (EAT), `due_today` on it, else
 * `on_schedule`. `daysOverdue` counts whole calendar days past the due day.
 */
export function patrolState(nextDueKey, now) {
  const daysPast = eatDay(now) - eatDay(nextDueKey)
  if (daysPast > 0) return { state: 'overdue', daysOverdue: daysPast }
  return { state: daysPast === 0 ? 'due_today' : 'on_schedule', daysOverdue: 0 }
}

// ── Incidents and the KFS ladder ────────────────────────────────────────────

export function escalationOf(type) {
  return ESCALATION[type] ?? ESCALATION.other
}

export function severityOf(type) {
  return escalationOf(type).severity
}

/** The label for a rung, from the ladder data and the zone's inferred county. */
export function rungLabel(ref, rung, zone) {
  const template = ref.ladder[rung]?.title ?? rung
  if (!template.includes('{county}')) return template
  return zone?.county
    ? `${template.replace('{county}', zone.county)} (inferred)`
    : `${template.replace(', {county} County', '')} (county not set)`
}

/**
 * The escalation ladder of an incident at `now`, read by the screens and the
 * tests alike. Rung states: `waiting` (not yet its turn), `due` (its turn),
 * `sent`, `overdue` (rung 1 unsent past its target, or the latest sent rung
 * whose acknowledgement window has passed), `acknowledged`, `not_needed`.
 * "Overdue" means `now` is strictly after the target.
 */
export function ladderState(incident, ref, now) {
  const rule = escalationOf(incident.type)
  const zone = ref.zones.find((z) => z.zoneId === incident.zoneId) ?? null
  const open = incident.status !== 'closed'
  const sent = [...incident.escalations].sort((a, b) => msOf(a.sentAt) - msOf(b.sentAt))
  const byRung = new Map(incident.escalations.map((e) => [e.rung, e]))
  const anyAck = incident.escalations.some((e) => e.ackAt)
  const ackMs = rule.ackMin === null ? null : rule.ackMin * MINUTE_MS
  const latest = sent.length ? sent[sent.length - 1] : null

  const firstMessageTarget = msOf(incident.firstReportedAt) + rule.firstMessageMin * MINUTE_MS
  const firstMessageOverdue = open && sent.length === 0 && now > firstMessageTarget
  const awaitingAck = open && sent.length > 0 && !anyAck
  const ackDeadline = awaitingAck && ackMs !== null ? msOf(latest.sentAt) + ackMs : null
  const ackOverdue = ackDeadline !== null && now > ackDeadline

  const rungs = rule.ladder.map((rung, index) => {
    const entry = byRung.get(rung) ?? null
    const label = rungLabel(ref, rung, zone)
    let state
    let targetMs = null
    if (entry?.ackAt) {
      state = 'acknowledged'
    } else if (entry) {
      const windowEnd = ackMs === null ? null : msOf(entry.sentAt) + ackMs
      targetMs = windowEnd
      state = open && !anyAck && entry === latest && windowEnd !== null && now > windowEnd ? 'overdue' : 'sent'
    } else if (anyAck || !open) {
      state = 'not_needed'
    } else if (index === 0) {
      targetMs = firstMessageTarget
      state = firstMessageOverdue ? 'overdue' : 'due'
    } else {
      const previous = byRung.get(rule.ladder[index - 1])
      const turn = previous && ackMs !== null ? msOf(previous.sentAt) + ackMs : null
      targetMs = turn
      state = turn !== null && now > turn ? 'due' : 'waiting'
    }
    return {
      rung,
      label,
      state,
      targetMs,
      sentAt: entry?.sentAt ?? null,
      channel: entry?.channel ?? null,
      ackAt: entry?.ackAt ?? null,
      ackChannel: entry?.ackChannel ?? null,
      ackNote: entry?.ackNote ?? null,
    }
  })

  return {
    type: incident.type,
    severity: rule.severity,
    rungs,
    sentCount: sent.length,
    awaitingAck,
    firstMessageTargetMs: firstMessageTarget,
    firstMessageOverdue,
    ackDeadlineMs: ackDeadline,
    ackOverdue,
    escalationOverdue: firstMessageOverdue || ackOverdue,
    allRungsSentNoAck:
      open && sent.length === rule.ladder.length && !anyAck && ackMs !== null && now > msOf(latest.sentAt) + ackMs,
  }
}

/** Minutes from the first report to the first KFS message, or `null` when none has been sent. */
export function minutesToFirstMessage(incident) {
  if (incident.escalations.length === 0) return null
  const first = Math.min(...incident.escalations.map((e) => msOf(e.sentAt)))
  return (first - msOf(incident.firstReportedAt)) / MINUTE_MS
}

/** The single next status an officer may step to, or `null` at the end of the chain. */
export function nextIncidentStatus(status) {
  const index = INCIDENT_STATUS_CHAIN.indexOf(status)
  return index >= 0 && index < INCIDENT_STATUS_CHAIN.length - 1 ? INCIDENT_STATUS_CHAIN[index + 1] : null
}

/**
 * Whether the officer may step an incident to `to`. Only the immediate next
 * status is legal; `escalated` and `acknowledged` follow a message sent or an
 * acknowledgement recorded, and `closed` is reached only by closing.
 */
export function statusStep(incident, to) {
  if (incident.status === 'closed') return { ok: false, reason: 'The incident is closed.' }
  const next = nextIncidentStatus(incident.status)
  if (to === 'closed') return { ok: false, reason: 'Close the incident with an outcome and a note.' }
  if (to !== next) return { ok: false, reason: `Status moves one step at a time. The next step is ${next}.` }
  if (to === 'escalated' && incident.escalations.length === 0) {
    return { ok: false, reason: 'Send a message to KFS to escalate.' }
  }
  if (to === 'acknowledged' && !incident.escalations.some((e) => e.ackAt)) {
    return { ok: false, reason: 'Record a KFS acknowledgement first.' }
  }
  return { ok: true, reason: null }
}

/** Which ways the incident can be closed from its current status. */
export function closeOptions(incident) {
  const open = incident.status !== 'closed'
  return { resolved: open && incident.status === 'controlled', falseAlarm: open }
}

// ── The KFS text message ────────────────────────────────────────────────────

/** GSM-safe: letters, digits, space, `. , : ; ! ? / ( ) ' " @ # % & * + = < > _ -` and newline. */
export const GSM_SAFE = /^[A-Za-z0-9 .,:;!?/()'"@#%&*+=<>_\n-]*$/

/** Reduces text to the GSM-safe set: accents dropped, dashes and dots normalised, anything else removed. */
export function toGsm(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[–—−]/g, '-')
    .replace(/[·•]/g, '.')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^A-Za-z0-9 .,:;!?/()'"@#%&*+=<>_\n-]/g, '')
}

/**
 * The one KFS message template, at most 160 characters. Never carries a
 * reporter or worker identifier. If it runs long, the "Approx … ha." clause is
 * dropped first, then the segment name is shortened.
 */
export function buildEscalationSms(incident, zone, segment) {
  const number = incident.incidentId.split('-').pop()
  const type = SMS_TYPE[incident.type] ?? SMS_TYPE.other
  const count = incident.reports.length
  const since = formatEat(msOf(incident.firstReportedAt), 'time')
  const hasGps = incident.lat !== null && incident.lat !== undefined && incident.lon !== null && incident.lon !== undefined
  const gps = hasGps ? ` GPS ${formatCoord(incident.lat)},${formatCoord(incident.lon)}.` : ''
  const area =
    incident.estAreaHa !== null && incident.estAreaHa !== undefined ? ` Approx ${formatHa(incident.estAreaHa)} ha.` : ''
  const tail = ` ${count} ${count === 1 ? 'report' : 'reports'} since ${since}. Ref INC${number}. Reply ACK ${number}`
  const build = (segmentName, withArea) =>
    toGsm(`NTZDC ${type}: ${segmentName}, ${zone.name} zone.${gps}${withArea ? area : ''}${tail}`)

  const max = POLICY.sms.maxChars
  let text = build(segment.name, true)
  if (text.length > max) text = build(segment.name, false)
  if (text.length > max) {
    const over = text.length - max
    const keep = Math.max(3, segment.name.length - over)
    text = build(segment.name.slice(0, keep).trim(), false)
  }
  return text
}

// ── Activity log hash chain ─────────────────────────────────────────────────

/** 32-bit FNV-1a over the UTF-8 bytes of the text. */
export function fnv1a32(text) {
  let hash = 0x811c9dc5
  for (const byte of new TextEncoder().encode(text)) {
    hash ^= byte
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Eight lower-case hex digits. */
export function hex8(n) {
  return n.toString(16).padStart(8, '0')
}

/** The check value of an FNV-1a hash over a text, as shown to people: `fnv1a:1a2b3c4d`. */
export function checkValue(text) {
  return `fnv1a:${hex8(fnv1a32(text))}`
}

/**
 * The chained check value of an activity entry. This is a prototype check
 * value that shows the entries were not edited in this session. It is not a
 * cryptographic signature.
 */
export function chainHash(previousHash, entry) {
  return checkValue(
    [previousHash, entry.ref, entry.when, entry.who, entry.event, entry.record].join('|'),
  )
}
