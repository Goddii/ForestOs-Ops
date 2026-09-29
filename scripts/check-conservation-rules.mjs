// Plain-Node checks for the Conservation Officer rules layer:
//   npm run check:conservation
//
// Loads the structure and seed data, the rules, the selectors, the reducer and
// the export builders directly (none of them import React), and asserts the
// figures the brief fixes: structure, statistics, claim flags and statuses,
// reducer legality, incidents and the KFS ladder, boundary integrity and
// patrols, seed integrity, exports and the activity log. The last section
// replays the browser walkthrough (steps 2 to 10) through `reduce` and the
// selectors. What only a browser can show (focus order, layout at 768 px,
// reduced motion, the 15-second clock tick, the map) is not replayed here.
//
// Actions are `{ type, payload }`: the payload of LOG_INCIDENT and CREATE_TASK
// has its own `type` field, so the payload cannot be spread into the action.

import assert from 'node:assert/strict'

import { EUDR } from '../src/lib/dashboardData.js'
import { hasPrefix } from '../src/lib/contracts/ids.js'
import {
  BELTS,
  BELT_TOTALS,
  MAU_BELT_KM,
  PLOT_ZONE,
  REGION_BELT_KM,
  ZONES,
  ZONE_TOTALS,
} from '../src/lib/dashboard/ntzdcStructure.js'
import { CLOCK_START_MS, DEFAULT_SCOPE, REF, SEED_STATE, SENTINEL } from '../src/lib/dashboard/conservation.js'
import { POLICY } from '../src/lib/conservation/policy.js'
import { formatEat } from '../src/lib/conservation/labels.js'
import * as R from '../src/lib/conservation/rules.js'
import * as S from '../src/lib/conservation/selectors.js'
import { reduce } from '../src/lib/conservation/reducer.js'
import * as X from '../src/lib/conservation/exports.js'

let passed = 0
const failures = []

function check(name, fn) {
  try {
    fn()
    passed += 1
  } catch (error) {
    failures.push(`${name}\n      ${String(error.message).split('\n').join('\n      ')}`)
  }
}

const round1 = (n) => Math.round(n * 10) / 10
const sum = (values) => values.reduce((a, b) => a + b, 0)
const near = (actual, expected, tolerance, message = '') =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message} expected ${expected} ± ${tolerance}, got ${actual}`)

const MIN = 60 * 1000
const HOUR = 60 * MIN
const T0 = CLOCK_START_MS // 16 Sep 2026 07:12 EAT
const T_FIRE_OVERDUE = T0 + MIN + 1000 // 07:13:01
const T1 = T0 + 15 * MIN // 07:27 after +15 min
const T2 = T1 + 2 * HOUR // 09:27 after two +1 h

const ctxAt = (now, state = SEED_STATE, scope = DEFAULT_SCOPE) => ({ now, scope, state, ref: REF })
const ctx0 = ctxAt(T0)
const claimById = (id, state = SEED_STATE) => state.claims.find((c) => c.claimId === id)
const incidentById = (id, state = SEED_STATE) => state.incidents.find((i) => i.incidentId === id)
const run = (state, type, payload = {}, now = T0) => reduce(state, { type, payload }, now)

/** Runs an action that must succeed and returns the new state. */
function ok(state, type, payload, now) {
  const out = run(state, type, payload, now)
  assert.equal(out.error, undefined, `${type} refused: ${out.error}`)
  assert.notEqual(out.state, state)
  return out
}

// ── 1. Structure ────────────────────────────────────────────────────────────

check('structure: 18 zones with unique ids', () => {
  assert.equal(ZONES.length, 18)
  assert.equal(new Set(ZONES.map((z) => z.zoneId)).size, 18)
})

check('structure: tea, trees and printed row totals sum as the report does', () => {
  assert.equal(round1(sum(ZONES.map((z) => z.teaHa))), 4048.1)
  assert.equal(round1(sum(ZONES.map((z) => z.treesHa))), 5235.0)
  assert.equal(round1(sum(ZONES.map((z) => z.totalHa))), 9280.3)
  assert.deepEqual(ZONE_TOTALS.rowSums, { teaHa: 4048.1, treesHa: 5235.0, totalHa: 9280.3 })
})

check('structure: printed totals are stored separately and never recomputed', () => {
  assert.deepEqual(ZONE_TOTALS.printed, { teaHa: 4067.7, treesHa: 5235.0, totalHa: 9302.7 })
  const kiambu = ZONES.find((z) => z.zoneId === 'ABD-KIA')
  assert.equal(kiambu.totalHa, 616)
  assert.equal(round1(kiambu.teaHa + kiambu.treesHa), 618.8)
  assert.ok(kiambu.notes.some((n) => n.includes('618.8')), 'Kiambu note')
  assert.equal(ZONES.find((z) => z.zoneId === 'MTK-KIR').totalHa, 286.5)
  assert.ok(ZONES.find((z) => z.zoneId === 'MAU-KUR').notes.length > 0)
})

check('structure: belts sum to 9,289 ha and 928.85 km', () => {
  assert.equal(sum(BELTS.map((b) => b.bufferHa)), 9289)
  assert.equal(Math.round(sum(BELTS.map((b) => b.lengthKm)) * 100) / 100, 928.85)
  assert.deepEqual(BELT_TOTALS, { bufferHa: 9289, lengthKm: 928.85 })
})

check('structure: every reserve satisfies |km − ha ÷ 10| ≤ 0.06', () => {
  for (const belt of BELTS) near(belt.lengthKm, belt.bufferHa / 10, 0.06, belt.reserve)
})

check('structure: Mau belt allocation is 40.8 / 27.9 / 36.6 / 24.0 and sums to 129.3', () => {
  assert.deepEqual(MAU_BELT_KM, { 'MAU-OLE': 40.8, 'MAU-NYA': 27.9, 'MAU-KER': 36.6, 'MAU-KUR': 24.0 })
  assert.equal(round1(sum(Object.values(MAU_BELT_KM))), 129.3)
  for (const zone of ZONES) assert.equal(zone.beltKm, MAU_BELT_KM[zone.zoneId] ?? null, zone.zoneId)
})

check('structure: each Mau zone’s segment lengths sum to its allocation', () => {
  for (const [zoneId, km] of Object.entries(MAU_BELT_KM)) {
    const total = round1(sum(REF.segments.filter((s) => s.zoneId === zoneId).map((s) => s.lengthKm)))
    assert.equal(total, km, zoneId)
  }
})

check('structure: region roll-ups are 250.75 / 129.3 / 548.8 km', () => {
  assert.deepEqual(REGION_BELT_KM, { eastern: 250.75, south_rift: 129.3, north_rift: 548.8 })
})

// ── 2. Statistics ───────────────────────────────────────────────────────────

check('statistics: Wilson intervals match the reference values (±0.05 pp)', () => {
  const reference = { 46: [81.2, 96.8], 43: [73.8, 93.0], 40: [67.0, 88.8], 38: [62.6, 85.7], 34: [54.2, 79.2], 44: [76.2, 94.4] }
  for (const [alive, [low, high]] of Object.entries(reference)) {
    const { lower, upper } = R.wilson(Number(alive), 50)
    near(lower * 100, low, 0.05, `${alive}/50 lower`)
    near(upper * 100, high, 0.05, `${alive}/50 upper`)
  }
})

check('statistics: verdicts for 46, 43, 40, 38 and 34 of 50', () => {
  assert.deepEqual([46, 43, 40, 38, 34].map((k) => R.survivalVerdict(k, 50)), ['pass', 'pass', 'pass', 'borderline', 'fail'])
})

check('statistics: tree credit and replanting quantity', () => {
  const at = (alive) => ({ alive, sampleSize: 50 })
  assert.equal(R.replantingQuantity(1400, at(34)), 448)
  assert.deepEqual(R.survivalCredit(103, at(43)), { point: 89, conservative: 76 })
  assert.deepEqual(R.survivalCredit(1400, at(34)), { point: 952, conservative: 758 })
})

// ── 3. Claims ───────────────────────────────────────────────────────────────

const EXPECTED_FLAGS = {
  'VER-0135': [], 'VER-0136': ['gps_outside_plot', 'low_photo_count'], 'VER-0137': [],
  'VER-0138': ['photo_stale_or_far', 'satellite_unreliable'], 'VER-0139': ['low_photo_count'], 'VER-0140': [],
  'VER-0141': [], 'VER-0142': ['spacing_mismatch'], 'VER-0143': [], 'VER-0144': ['density_out_of_band'],
  'VER-0145': ['satellite_contradicts'], 'VER-0146': ['gps_low_accuracy'], 'VER-0147': ['duplicate_suspected'],
  'VER-0148': ['gps_outside_plot'],
  'VER-0122': [], 'VER-0124': [], 'VER-0128': [], 'VER-0130': [], 'VER-0131': [], 'VER-0133': [],
}

check('claims: 20 claims and the flags of all 20 equal the table', () => {
  assert.equal(SEED_STATE.claims.length, 20)
  for (const claim of SEED_STATE.claims) {
    assert.deepEqual(R.claimFlags(claim, ctx0), EXPECTED_FLAGS[claim.claimId], claim.claimId)
  }
})

check('claims: each of the nine flags occurs at least once', () => {
  const seen = new Set(SEED_STATE.claims.flatMap((c) => R.claimFlags(c, ctx0)))
  for (const flag of ['gps_outside_plot', 'gps_low_accuracy', 'low_photo_count', 'photo_stale_or_far', 'density_out_of_band', 'spacing_mismatch', 'duplicate_suspected', 'satellite_contradicts', 'satellite_unreliable']) {
    assert.ok(seen.has(flag), flag)
  }
})

check('claims: the evidence table has one row per rule, with the numbers behind it', () => {
  const rows = R.claimChecks(claimById('VER-0148'), ctx0)
  assert.equal(rows.length, 9)
  const gps = rows.find((r) => r.flag === 'gps_outside_plot')
  assert.equal(gps.result, 'flag')
  assert.match(gps.detail, /GPS is 210 m from the plot centre; plot radius 87 m \+ 30 m tolerance/)
  assert.ok(rows.every((r) => ['pass', 'flag', 'not_applicable'].includes(r.result) && r.policy && r.rule && r.detail))
  const erosion = R.claimChecks(claimById('VER-0140'), ctx0).find((r) => r.flag === 'satellite_contradicts')
  assert.equal(erosion.result, 'not_applicable')
  assert.match(erosion.detail, /not reliably visible at 10 m/)
})

check('claims: statuses match the expected counts at demo start', () => {
  const statuses = SEED_STATE.claims.map((c) => R.claimStatus(c, ctx0))
  const count = (s) => statuses.filter((x) => x === s).length
  assert.equal(count('awaiting_decision'), 6)
  assert.equal(count('evidence_requested'), 1)
  assert.equal(count('in_pipeline'), 4)
  assert.equal(count('verified'), 8)
  assert.equal(count('rejected'), 1)
  assert.equal(count('awaiting_countersign'), 0)
  const awaiting = SEED_STATE.claims.filter((c) => R.claimStatus(c, ctx0) === 'awaiting_decision').map((c) => c.claimId)
  assert.deepEqual(awaiting, ['VER-0138', 'VER-0140', 'VER-0142', 'VER-0144', 'VER-0145', 'VER-0148'])
})

check('claims: working days elapsed and the overdue set', () => {
  const ids = ['VER-0138', 'VER-0140', 'VER-0142', 'VER-0144', 'VER-0145', 'VER-0148']
  const days = Object.fromEntries(ids.map((id) => [id, R.claimWorkingDays(claimById(id), T0)]))
  assert.deepEqual(days, { 'VER-0138': 10, 'VER-0140': 8, 'VER-0142': 8, 'VER-0144': 5, 'VER-0145': 4, 'VER-0148': 2 })
  const overdue = SEED_STATE.claims.filter((c) => R.isClaimOverdue(c, ctx0)).map((c) => c.claimId)
  assert.deepEqual(overdue, ['VER-0138', 'VER-0140', 'VER-0142'])
})

check('claims: countersign is needed for a flag or 3 ha and above', () => {
  for (const id of ['VER-0138', 'VER-0142', 'VER-0144', 'VER-0145', 'VER-0148']) {
    assert.equal(R.needsCountersign(claimById(id), ctx0), true, id)
  }
  assert.equal(R.needsCountersign(claimById('VER-0140'), ctx0), false)
  assert.equal(R.needsCountersign(claimById('VER-0135'), ctx0), true) // 3.1 ha, and it carries its countersign
  assert.equal(claimById('VER-0135').decision.countersign.by, 'UNIT-HEAD')
  assert.equal(S.claimKpis(ctx0).decidedThisMonth, 1) // VER-0137 only
})

check('claims: workingDaysElapsed edge cases', () => {
  assert.equal(R.workingDaysElapsed('2026-09-06', '2026-09-16'), 8)
  assert.equal(R.workingDaysElapsed('2026-09-02', '2026-09-16'), 10)
  assert.equal(R.workingDaysElapsed('2026-09-09', '2026-09-16'), 5)
  assert.equal(R.workingDaysElapsed('2026-09-12', '2026-09-13'), 0) // Saturday to Sunday
  assert.equal(R.workingDaysElapsed('2026-09-11', '2026-09-13'), 0) // Friday to Sunday
  assert.equal(R.workingDaysElapsed('2026-09-16', '2026-09-16'), 0)
  assert.equal(R.workingDaysElapsed('2026-09-11', '2026-09-14'), 1) // Friday to Monday
})

check('claims: a resubmitted claim counts from the resubmission date', () => {
  const base = claimById('VER-0138')
  assert.equal(R.claimWorkingDays(base, T0), 10)
  assert.equal(R.claimWorkingDays({ ...base, resubmittedAt: '2026-09-14T06:30:00Z' }, T0), 2)
})

check('claims: waiting reasons are named in words', () => {
  assert.equal(R.waitingOn(claimById('VER-0141'), REF), 'Waiting on: next Sentinel-2 pass, 19 Sep')
  assert.equal(R.waitingOn(claimById('VER-0139'), REF), 'Waiting on: field verification')
  assert.equal(R.waitingOn(claimById('VER-0140'), REF), null)
})

check('claims: speciesSplit sums exactly and breaks ties to the first species', () => {
  for (const mix of Object.values(REF.mixes)) {
    for (const trees of [1, 3, 103, 900, 1800, 2100]) {
      const counts = R.speciesSplit(mix, trees)
      assert.equal(sum(counts), trees, `${mix.mixId} ${trees}`)
      assert.ok(counts.every(Number.isInteger))
    }
  }
  assert.deepEqual(R.speciesSplit(REF.mixes['MIX-INDIG'], 103), [31, 31, 26, 15])
  assert.deepEqual(R.speciesSplit(REF.mixes['MIX-BLEND'], 2), [1, 1, 0, 0])
})

// ── 4. Reducer legality ─────────────────────────────────────────────────────

/** Asserts an action is refused: an error string, and the very same state object back. */
function refused(name, state, type, payload, now = T0, expect) {
  check(`reducer refuses: ${name}`, () => {
    const out = run(state, type, payload, now)
    assert.equal(typeof out.error, 'string', 'expected an error')
    assert.ok(out.error.length > 0)
    assert.equal(out.state, state, 'state must be the input object')
    if (expect) assert.match(out.error, expect)
  })
}

const withClaim = (state, id, change) => ({ ...state, claims: state.claims.map((c) => (c.claimId === id ? change(c) : c)) })
const approve = (id, justification = 'Reviewed the flags and the photos; safe to approve.') =>
  ok(SEED_STATE, 'DECIDE_CLAIM', { claimId: id, outcome: 'approve', by: 'CON-SR-01', justification }).state
const decide = (claimId, outcome, extra = {}) => ({ claimId, outcome, by: 'CON-SR-01', ...extra })

refused('approve a flagged claim without a 20-character justification', SEED_STATE, 'DECIDE_CLAIM',
  decide('VER-0145', 'approve', { justification: 'too short' }), T0, /justification/i)
refused('approve a claim that is not ready', SEED_STATE, 'DECIDE_CLAIM', decide('VER-0141', 'approve'), T0, /Waiting on/)
refused('approve with fewer than 2 photos',
  withClaim(SEED_STATE, 'VER-0140', (c) => ({ ...c, evidence: { ...c.evidence, photos: c.evidence.photos.slice(0, 1) } })),
  'DECIDE_CLAIM', decide('VER-0140', 'approve'), T0, /photos/)
refused('approve with no GPS point',
  withClaim(SEED_STATE, 'VER-0140', (c) => ({ ...c, evidence: { ...c.evidence, gps: null } })),
  'DECIDE_CLAIM', decide('VER-0140', 'approve', { justification: 'A justification that is long enough.' }), T0, /GPS/)
refused('reject with a 19-character note', SEED_STATE, 'DECIDE_CLAIM',
  decide('VER-0148', 'reject', { reason: 'gps_outside_plot', note: '1234567890123456789' }), T0, /note/)
refused('reject without a reason', SEED_STATE, 'DECIDE_CLAIM', decide('VER-0148', 'reject', { note: 'A perfectly long enough note.' }))
refused('decide a claim that already has a final decision', SEED_STATE, 'DECIDE_CLAIM',
  decide('VER-0137', 'reject', { reason: 'other', note: 'A perfectly long enough note.' }))
refused('request evidence with a 9-character note', SEED_STATE, 'REQUEST_EVIDENCE', { claimId: 'VER-0138', kind: 'photos', note: '123456789' })
refused('open a second evidence request on one claim', SEED_STATE, 'REQUEST_EVIDENCE',
  { claimId: 'VER-0146', kind: 'photos', note: 'Please send another photo.' })
refused('countersign by the same actor', approve('VER-0145'), 'COUNTERSIGN', { claimId: 'VER-0145', by: 'CON-SR-01' }, T0, /approver/)
refused('countersign a claim that needs none', approve('VER-0140'), 'COUNTERSIGN', { claimId: 'VER-0140', by: 'UNIT-HEAD' }, T0, /needs no countersign/)
refused('countersign a claim that has not been approved', SEED_STATE, 'COUNTERSIGN', { claimId: 'VER-0145', by: 'UNIT-HEAD' }, T0, /Approve/)
refused('skip an incident status (triaged → controlled)', SEED_STATE, 'SET_INCIDENT_STATUS', { incidentId: 'INC-2026-0184', to: 'controlled' })
refused('step an incident to escalated with nothing sent', SEED_STATE, 'SET_INCIDENT_STATUS', { incidentId: 'INC-2026-0184', to: 'escalated' })
refused('close as resolved from escalated', SEED_STATE, 'CLOSE_INCIDENT',
  { incidentId: 'INC-2026-0187', kind: 'resolved', areaAffectedHa: 2, note: 'Twenty characters at least here.' }, T0, /controlled/)
refused('close with a note under 20 characters', SEED_STATE, 'CLOSE_INCIDENT', { incidentId: 'INC-2026-0184', kind: 'false_alarm', note: 'too short' })
refused('record an acknowledgement for a rung that was never sent', SEED_STATE, 'RECORD_ACK',
  { incidentId: 'INC-2026-0187', rung: 'county_ecosystem_conservator', ackChannel: 'sms' })
refused('send a rung that is not in the ladder', SEED_STATE, 'SEND_ESCALATION', { incidentId: 'INC-2026-0184', rung: 'kfs_commandant', channel: 'sms' })
refused('send the same rung twice', SEED_STATE, 'SEND_ESCALATION', { incidentId: 'INC-2026-0187', rung: 'station_in_charge', channel: 'sms' })
refused('send to a closed incident', SEED_STATE, 'SEND_ESCALATION',
  { incidentId: 'INC-2026-0181', rung: 'county_ecosystem_conservator', channel: 'sms' })

const replant = (linkedRef) => ({ type: 'replanting', linkedRef, assigneeRole: 'Block Supervisor, Nyangores', note: '' })
const ordered = ok(SEED_STATE, 'CREATE_TASK', replant('SVC-2026-00702'))
refused('issue a second replanting order for one planting', ordered.state, 'CREATE_TASK', replant('SVC-2026-00702'), T0, /is open/)
refused('issue a replanting order for a borderline planting (LIK-16)', SEED_STATE, 'CREATE_TASK', replant('SVC-2026-00709'), T0, /recount/i)
refused('issue a replanting order for a pass planting (TER-14)', SEED_STATE, 'CREATE_TASK', replant('SVC-2026-00724'), T0, /no replanting is needed/)
refused('issue a replanting order against an older count', SEED_STATE, 'CREATE_TASK', replant('SVC-2026-00610'), T0, /latest count/)

const dismissed = ok(SEED_STATE, 'TRIAGE_ALERT', {
  alertId: 'ALERT-2294', to: 'dismissed', dismissal: { reason: 'known_incident', incidentId: 'INC-2026-0184', note: '' },
})
refused('dismiss an alert that is already dismissed', dismissed.state, 'TRIAGE_ALERT',
  { alertId: 'ALERT-2294', to: 'dismissed', dismissal: { reason: 'cloud_shadow', note: '' } }, T0, /already dismissed/)
refused('dismiss as known incident on a different segment', SEED_STATE, 'TRIAGE_ALERT',
  { alertId: 'ALERT-2294', to: 'dismissed', dismissal: { reason: 'known_incident', incidentId: 'INC-2026-0187', note: '' } })
refused('dismiss as other with a short note', SEED_STATE, 'TRIAGE_ALERT',
  { alertId: 'ALERT-2295', to: 'dismissed', dismissal: { reason: 'other', note: 'too short' } })
refused('resolve a confirmed alert by hand', SEED_STATE, 'TRIAGE_ALERT', { alertId: 'ALERT-2291', to: 'resolved' })
refused('confirm an alert without an incident type', SEED_STATE, 'TRIAGE_ALERT', { alertId: 'ALERT-2295', to: 'confirmed' })
refused('confirm a legacy alert that has no segment', SEED_STATE, 'TRIAGE_ALERT', { alertId: 'ALERT-2288', to: 'confirmed', incidentType: 'encroachment' }, T0, /no segment/)
refused('log an incident of an unknown type', SEED_STATE, 'LOG_INCIDENT', { type: 'flood', segmentId: 'SEG-KER-03' })
refused('log an incident on an unknown segment', SEED_STATE, 'LOG_INCIDENT', { type: 'fire', segmentId: 'SEG-XXX-99' })

const completed = ok(SEED_STATE, 'UPDATE_TASK', { taskId: 'MT-0002', action: 'complete' })
refused('complete a task that is already done', SEED_STATE, 'UPDATE_TASK', { taskId: 'MT-0008', action: 'complete' })
refused('complete a task twice', completed.state, 'UPDATE_TASK', { taskId: 'MT-0002', action: 'complete' })
refused('block a task with a 9-character reason', SEED_STATE, 'UPDATE_TASK', { taskId: 'MT-0001', action: 'block', reason: 'too short' })
refused('start a task that is done', SEED_STATE, 'UPDATE_TASK', { taskId: 'MT-0008', action: 'start' })
refused('reopen a task that is not done', SEED_STATE, 'UPDATE_TASK', { taskId: 'MT-0001', action: 'reopen' })
refused('review a survival count twice',
  ok(SEED_STATE, 'REVIEW_CHECK', { checkId: 'SVC-2026-00702', review: 'accepted' }).state,
  'REVIEW_CHECK', { checkId: 'SVC-2026-00702', review: 'recount_requested' })
refused('review a count that has not arrived yet', SEED_STATE, 'REVIEW_CHECK', { checkId: 'SVC-2026-00731', review: 'accepted' })
refused('log a patrol dated in the future', SEED_STATE, 'LOG_PATROL', { segmentId: 'SEG-KER-03', on: '2026-09-17', note: 'Walked the edge.', issues: [] })
refused('log a patrol on an impossible date', SEED_STATE, 'LOG_PATROL', { segmentId: 'SEG-KER-03', on: '2026-02-31', note: 'Walked the edge.', issues: [] })
refused('log an incident with only a latitude', SEED_STATE, 'LOG_INCIDENT', { type: 'fire', segmentId: 'SEG-KER-03', lat: -0.5 })
refused('an unknown action', SEED_STATE, 'MAKE_TEA', {})

check('reducer refuses: export a row containing RVT-0887', () => {
  assert.throws(() => X.assertNoPersonalData([['ref', 'note'], ['INC-1', 'seen by RVT-0887']]), /worker identifier/)
  assert.throws(() => X.assertNoPersonalData([['ref', 'reported_by'], ['INC-1', 'x']]), /identify a person/)
  assert.doesNotThrow(() => X.assertNoPersonalData([['report_count', 'first_report_eat'], ['1', '2026-09-16 06:52']]))
  const leaky = { ...SEED_STATE, incidents: SEED_STATE.incidents.map((i) => (i.incidentId === 'INC-2026-0187' ? { ...i, kfsRef: 'RVT-0887' } : i)) }
  const out = run(leaky, 'GENERATE_EXPORT', { template: 'kfs_register', period: 'all_time' })
  assert.equal(typeof out.error, 'string')
  assert.equal(out.state, leaky)
  assert.ok(!out.error.includes('RVT-'), 'the error must not repeat the identifier')
})

check('reducer: an error returns the input state untouched and never a new object', () => {
  const before = JSON.stringify(SEED_STATE)
  run(SEED_STATE, 'DECIDE_CLAIM', decide('VER-0141', 'approve'))
  assert.equal(JSON.stringify(SEED_STATE), before)
  assert.ok(Object.isFrozen(SEED_STATE) && Object.isFrozen(SEED_STATE.claims[0].work))
})

// ── 5. Incidents ────────────────────────────────────────────────────────────

const ladderOf = (id, now, state = SEED_STATE) => R.ladderState(incidentById(id, state), REF, now)
const states = (ladder) => ladder.rungs.map((r) => r.state)

check('incidents: the fire’s acknowledgement target is 04:13Z (07:13 EAT)', () => {
  const ladder = ladderOf('INC-2026-0187', T0)
  assert.equal(new Date(ladder.ackDeadlineMs).toISOString(), '2026-09-16T04:13:00.000Z')
  near((ladder.ackDeadlineMs - T0) / MIN, 1, 1e-9, 'minutes to the deadline')
})

check('incidents: first-message targets — grazing overdue 46.2 h, fence damage due in 50.8 h', () => {
  const grazing = ladderOf('INC-2026-0184', T0)
  near((T0 - grazing.firstMessageTargetMs) / HOUR, 46.2, 0.1, 'grazing overdue')
  const fence = ladderOf('INC-2026-0183', T0)
  near((fence.firstMessageTargetMs - T0) / HOUR, 50.8, 0.1, 'fence damage due')
})

check('incidents: ladder states at 07:12 equal the table', () => {
  assert.deepEqual(states(ladderOf('INC-2026-0187', T0)), ['sent', 'waiting', 'waiting'])
  for (const id of ['INC-2026-0186']) assert.deepEqual(states(ladderOf(id, T0)), ['acknowledged', 'not_needed', 'not_needed'])
  for (const id of ['INC-2026-0185', 'INC-2026-0182']) assert.deepEqual(states(ladderOf(id, T0)), ['acknowledged', 'not_needed'])
  assert.deepEqual(states(ladderOf('INC-2026-0184', T0)), ['overdue'])
  assert.deepEqual(states(ladderOf('INC-2026-0183', T0)), ['due'])
  for (const id of ['INC-2026-0181', 'INC-2026-0180']) assert.equal(states(ladderOf(id, T0))[0], 'acknowledged')
  assert.equal(states(ladderOf('INC-2026-0179', T0))[0], 'acknowledged')
})

check('incidents: the fire at 07:13:01 has rung 1 overdue and rung 2 due; exactly 07:13:00 is not yet overdue', () => {
  assert.deepEqual(states(ladderOf('INC-2026-0187', T_FIRE_OVERDUE)), ['overdue', 'due', 'waiting'])
  assert.deepEqual(states(ladderOf('INC-2026-0187', T0 + MIN)), ['sent', 'waiting', 'waiting'])
})

check('incidents: escalation overdue is 1 at 07:12 and 2 at 07:13:01; one awaits acknowledgement', () => {
  const kpi0 = S.incidentKpis(ctx0)
  assert.equal(kpi0.escalationOverdue, 1)
  assert.equal(kpi0.awaitingAck, 1)
  assert.equal(kpi0.open, 6)
  near(kpi0.oldestWaitMin, 14, 1e-9, 'oldest wait')
  assert.equal(S.incidentKpis(ctxAt(T_FIRE_OVERDUE)).escalationOverdue, 2)
})

check('incidents: median minutes to the first KFS message is 50; closed in August 3, September 0', () => {
  const kpi = S.incidentKpis(ctx0)
  assert.equal(kpi.medianFirstMessageMin, 50)
  assert.equal(kpi.firstMessageSample, 7)
  assert.deepEqual(
    SEED_STATE.incidents.filter((i) => i.escalations.length).map((i) => R.minutesToFirstMessage(i)).sort((a, b) => a - b),
    [6, 12, 45, 50, 80, 270, 588],
  )
  assert.equal(kpi.closedThisMonth, 0)
  const august = SEED_STATE.incidents.filter((i) => i.outcome && R.eatMonthKey(i.outcome.closedAt) === '2026-08')
  assert.equal(august.length, 3)
})

const FIRE_SMS =
  'NTZDC FIRE: Kiptunga NW, Olenguruone zone. GPS -0.3956,35.5900. Approx 2 ha. 3 reports since 06:52. Ref INC0187. Reply ACK 0187'
const smsFor = (incident) =>
  R.buildEscalationSms(incident, REF.zones.find((z) => z.zoneId === incident.zoneId), REF.segments.find((s) => s.segmentId === incident.segmentId))

check('incidents: all nine SMS texts are ≤ 160 characters, GSM-safe and carry no worker identifier', () => {
  assert.equal(SEED_STATE.incidents.length, 9)
  for (const incident of SEED_STATE.incidents) {
    const text = smsFor(incident)
    assert.ok(text.length <= POLICY.sms.maxChars, `${incident.incidentId} is ${text.length} characters`)
    assert.match(text, R.GSM_SAFE)
    assert.ok(!text.includes('RVT-'))
    assert.ok(!/reporter|worker/i.test(text))
  }
})

check('incidents: the fire text is exactly the specified 127 characters', () => {
  const text = smsFor(incidentById('INC-2026-0187'))
  assert.equal(text, FIRE_SMS)
  assert.equal(text.length, 127)
})

check('incidents: singular “1 report”, and no GPS clause without coordinates', () => {
  const single = smsFor(incidentById('INC-2026-0184'))
  assert.match(single, / 1 report since /)
  assert.ok(!single.includes('1 reports'))
  const noGps = smsFor({ ...incidentById('INC-2026-0187'), lat: null, lon: null })
  assert.ok(!noGps.includes('GPS'))
  assert.equal(noGps, 'NTZDC FIRE: Kiptunga NW, Olenguruone zone. Approx 2 ha. 3 reports since 06:52. Ref INC0187. Reply ACK 0187')
})

check('incidents: an over-long message drops the area clause, then shortens the segment name', () => {
  const zone = REF.zones.find((z) => z.zoneId === 'MAU-OLE')
  const long = { name: 'A very long segment name that runs on and on past any sensible length for one text message to carry' }
  const text = R.buildEscalationSms({ ...incidentById('INC-2026-0187'), estAreaHa: 12.5 }, zone, long)
  assert.ok(text.length <= 160, String(text.length))
  assert.ok(!text.includes('Approx'))
  assert.match(text, /Ref INC0187\. Reply ACK 0187$/)
  assert.match(text, R.GSM_SAFE)
  assert.equal(R.toGsm('Café · Ünï — test'), 'Cafe . Uni - test')
})

check('incidents: satellite pills match the table', () => {
  const alerts = S.alertsInScope(ctx0)
  const view = (id) => R.satelliteView(incidentById(id), alerts)
  assert.equal(view('INC-2026-0186'), 'both')
  assert.equal(view('INC-2026-0184'), 'both')
  assert.equal(view('INC-2026-0182'), 'both')
  assert.equal(view('INC-2026-0187'), 'ground_only')
  assert.equal(view('INC-2026-0185'), 'ground_only')
  assert.equal(view('INC-2026-0183'), null)
})

check('incidents: severity comes from the escalation table', () => {
  assert.equal(R.severityOf('fire'), 'critical')
  assert.equal(R.severityOf('illegal_logging'), 'high')
  assert.equal(R.severityOf('charcoal'), 'high')
  assert.equal(R.severityOf('encroachment'), 'medium')
  assert.equal(R.severityOf('other'), 'low')
})

check('incidents: the phone-KFS callout needs every rung sent, none acknowledged and the last window past', () => {
  const sent = (rung, minutes) => ({ rung, channel: 'sms', sentAt: R.isoOf(T0 - minutes * MIN), ackAt: null, ackChannel: null, ackNote: null })
  const base = incidentById('INC-2026-0187')
  const all = { ...base, escalations: [sent('station_in_charge', 50), sent('county_ecosystem_conservator', 30), sent('kfs_commandant', 20)] }
  assert.equal(R.ladderState(all, REF, T0).allRungsSentNoAck, true)
  const fresh = { ...all, escalations: [...all.escalations.slice(0, 2), sent('kfs_commandant', 5)] }
  assert.equal(R.ladderState(fresh, REF, T0).allRungsSentNoAck, false)
  assert.equal(R.ladderState(incidentById('INC-2026-0187'), REF, T0).allRungsSentNoAck, false)
})

check('incidents: rung labels are role titles from the ladder data, county marked inferred', () => {
  const labels = ladderOf('INC-2026-0187', T0).rungs.map((r) => r.label)
  assert.deepEqual(labels, ['KFS station in-charge', 'Ecosystem Conservator, Nakuru County (inferred)', 'KFS Commandant (headquarters)'])
  assert.ok(!/RVT|\d{4}/.test(labels.join(' ')))
})

// ── 6. Boundary ─────────────────────────────────────────────────────────────

const SEGMENT_INTEGRITY = {
  'SEG-OLE-01': 0.970, 'SEG-OLE-02': 0.910, 'SEG-OLE-03': 0.950, 'SEG-NYA-01': 0.960, 'SEG-NYA-02': 0.950, 'SEG-NYA-03': 0.900,
  'SEG-KER-01': 0.840, 'SEG-KER-02': 0.950, 'SEG-KER-03': 0.960, 'SEG-KUR-01': 0.960, 'SEG-KUR-02': 0.930, 'SEG-KUR-03': 0.970,
}

check('boundary: the weights sum to 1', () => {
  near(sum(Object.values(POLICY.boundary.weights)), 1, 1e-12)
})

check('boundary: every segment’s integrity matches the table to ±0.001', () => {
  assert.equal(REF.segments.length, 12)
  for (const segment of REF.segments) near(R.segmentIntegrity(segment).integrity, SEGMENT_INTEGRITY[segment.segmentId], 0.001, segment.segmentId)
})

check('boundary: region integrity is 0.9356 (94%); exactly one segment is under 0.88; 14 beacons and 30 signs missing', () => {
  near(R.regionIntegrity(REF.segments), 0.9356, 0.0005, 'region integrity')
  const kpi = S.boundaryKpis(ctx0)
  assert.equal(Math.round(kpi.integrity * 100), 94)
  assert.equal(kpi.underAmber, 1)
  assert.equal(S.segmentRows(ctx0)[0].id, 'SEG-KER-01') // lowest integrity first
  assert.equal(S.segmentRows(ctx0)[0].band, 'amber')
  assert.equal(kpi.underCritical, 0)
  assert.equal(kpi.beaconsMissing, 14)
  assert.equal(kpi.signsMissing, 30)
  assert.equal(kpi.markersMissing, 44)
  assert.equal(kpi.beltKm, 129.3)
  assert.equal(kpi.alertsToReview, 3)
  assert.equal(kpi.newAlerts, 2)
  assert.equal(R.integrityBand(0.7), 'critical')
  assert.equal(R.integrityBand(0.8), 'amber')
  assert.equal(R.integrityBand(0.9), 'ok')
})

const ANCHOR = { 'ALERT-2291': ['TIN-04', 60, 320], 'ALERT-2292': ['TER-14', 135, 200], 'ALERT-2294': ['SUR-15', 90, 300], 'ALERT-2295': ['LIK-08', 200, 400] }

check('boundary: in-region alerts meet the mapping rules and sit at destination(anchor, bearing, offset)', () => {
  const inRegion = SEED_STATE.alerts.filter((a) => a.regionId === 'south_rift')
  assert.equal(inRegion.length, 4)
  for (const alert of inRegion) {
    assert.ok(alert.areaHa >= 0.1 && alert.ndviDrop >= 0.15 && alert.distanceM <= 500, alert.alertId)
    assert.equal(R.alertMeetsCriteria(alert), true)
    const [plotId, bearing, offset] = ANCHOR[alert.alertId]
    const plot = EUDR.plots.find((p) => p.id === plotId)
    const point = R.destination(plot, bearing, offset)
    near(alert.lat, point.lat, 1e-9, `${alert.alertId} lat`)
    near(alert.lon, point.lon, 1e-9, `${alert.alertId} lon`)
    near(R.haversine(alert, plot), offset, 0.001, `${alert.alertId} distance`)
  }
  for (const id of ['ALERT-2280', 'ALERT-2288']) {
    const alert = SEED_STATE.alerts.find((a) => a.alertId === id)
    assert.equal(alert.lat, null)
    assert.equal(alert.lon, null)
    assert.equal(alert.zoneId, null)
    assert.equal(alert.passDate, null)
    assert.equal(alert.ndviDrop, null)
  }
})

check('boundary: ground agreement in both directions matches the table', () => {
  const rows = Object.fromEntries(S.alertRows(ctx0).map((r) => [r.id, r.agreement]))
  assert.deepEqual(rows, { 'ALERT-2291': 'both', 'ALERT-2292': 'both', 'ALERT-2294': 'both', 'ALERT-2295': 'satellite_only' })
  const national = Object.fromEntries(S.alertRows(ctxAt(T0, SEED_STATE, { level: 'national' })).map((r) => [r.id, r.agreement]))
  assert.equal(national['ALERT-2280'], null) // no segment to compare against
  // Dismissals: cloud shadow, seasonal change and other do not count as evidence; a known incident does.
  const incident = incidentById('INC-2026-0186')
  const alert = SEED_STATE.alerts.find((a) => a.alertId === 'ALERT-2291')
  const dismissedAs = (reason) => ({ ...alert, incidentId: null, dismissal: { reason, incidentId: null, note: '' } })
  assert.equal(R.satelliteView(incident, [dismissedAs('cloud_shadow')]), 'ground_only')
  assert.equal(R.satelliteView(incident, [dismissedAs('known_incident')]), 'both')
})

check('boundary: patrol states match the schedule (4 overdue, 1 due today, 7 on schedule, 8 not overdue)', () => {
  const expected = {
    'SEG-OLE-01': ['2026-09-12', 7, '2026-09-19', 'on_schedule'], 'SEG-OLE-02': ['2026-09-08', 14, '2026-09-22', 'on_schedule'],
    'SEG-OLE-03': ['2026-09-14', 7, '2026-09-21', 'on_schedule'], 'SEG-NYA-01': ['2026-08-30', 14, '2026-09-13', 'overdue'],
    'SEG-NYA-02': ['2026-09-10', 14, '2026-09-24', 'on_schedule'], 'SEG-NYA-03': ['2026-09-02', 14, '2026-09-16', 'due_today'],
    'SEG-KER-01': ['2026-09-06', 7, '2026-09-13', 'overdue'], 'SEG-KER-02': ['2026-09-09', 14, '2026-09-23', 'on_schedule'],
    'SEG-KER-03': ['2026-08-29', 14, '2026-09-12', 'overdue'], 'SEG-KUR-01': ['2026-09-11', 14, '2026-09-25', 'on_schedule'],
    'SEG-KUR-02': ['2026-09-01', 14, '2026-09-15', 'overdue'], 'SEG-KUR-03': ['2026-09-13', 14, '2026-09-27', 'on_schedule'],
  }
  const rows = S.segmentRows(ctx0)
  for (const row of rows) assert.deepEqual([row.lastPatrol, row.interval, row.nextDue, row.patrolState], expected[row.id], row.id)
  const daysLate = Object.fromEntries(rows.filter((r) => r.patrolState === 'overdue').map((r) => [r.id, r.daysOverdue]))
  assert.deepEqual(daysLate, { 'SEG-NYA-01': 3, 'SEG-KER-01': 3, 'SEG-KER-03': 4, 'SEG-KUR-02': 1 })
  const kpi = S.patrolKpis(ctx0)
  assert.deepEqual([kpi.total, kpi.overdue, kpi.dueToday, kpi.onSchedule], [12, 4, 1, 8])
  assert.deepEqual(rows.filter((r) => r.risk.high).map((r) => r.id).sort(), ['SEG-KER-01', 'SEG-OLE-01', 'SEG-OLE-03'])
})

check('boundary: a segment goes overdue only after the end of its due day (EAT)', () => {
  assert.equal(R.patrolState('2026-09-16', R.msOf('2026-09-16') + 23 * HOUR + 59 * MIN).state, 'due_today')
  assert.equal(R.patrolState('2026-09-16', R.msOf('2026-09-17')).state, 'overdue')
  assert.equal(R.patrolState('2026-09-16', R.msOf('2026-09-15')).state, 'on_schedule')
})

check('boundary: the season and open incident types drive the 7-day interval', () => {
  assert.equal(R.segmentRisk('SEG-KUR-01', SEED_STATE.incidents, R.msOf('2027-02-10')).high, true)
  assert.equal(R.segmentRisk('SEG-KUR-01', SEED_STATE.incidents, T0).high, false)
  assert.equal(R.segmentRisk('SEG-KER-03', SEED_STATE.incidents, T0).high, false) // fence damage is not a high-risk type
  assert.equal(R.segmentRisk('SEG-KER-02', SEED_STATE.incidents, T0).high, false) // its fire is closed
})

// ── 7. Seed integrity ───────────────────────────────────────────────────────

const unique = (ids) => new Set(ids).size === ids.length

check('seed: ids are unique and correctly prefixed', () => {
  const groups = [
    [SEED_STATE.claims.map((c) => c.claimId), 'VER'], [SEED_STATE.incidents.map((i) => i.incidentId), 'INC'],
    [SEED_STATE.alerts.map((a) => a.alertId), 'ALERT'], [SEED_STATE.survivalChecks.map((c) => c.checkId), 'SVC'],
    [SEED_STATE.tasks.map((t) => t.taskId), 'MT'], [SEED_STATE.patrolLogs.map((l) => l.logId), 'BM'],
    [SEED_STATE.exports.map((e) => e.exportId), 'EXP'], [SEED_STATE.activity.map((a) => a.ref), 'AL'],
    [REF.segments.map((s) => s.segmentId), 'SEG'],
  ]
  for (const [ids, prefix] of groups) {
    assert.ok(unique(ids), `${prefix} ids are unique`)
    assert.ok(ids.every((id) => hasPrefix(id, prefix)), `${prefix} prefix`)
  }
  assert.ok(!hasPrefix('ALERT-2291', 'AL'), 'AL must not match ALERT')
})

check('seed: sector plots are the 18 sample plots (41.4 ha; 12 clear, 4 watch, 2 flagged) and the zone assignment holds', () => {
  assert.equal(REF.plots.length, 18)
  assert.equal(round1(sum(REF.plots.map((p) => p.hectares))), 41.4)
  const count = (s) => REF.plots.filter((p) => p.status === s).length
  assert.deepEqual([count('clear'), count('watch'), count('flagged')], [12, 4, 2])
  const haByZone = (zone) => round1(sum(REF.plots.filter((p) => p.zoneId === zone).map((p) => p.hectares)))
  assert.deepEqual(['MAU-OLE', 'MAU-NYA', 'MAU-KER', 'MAU-KUR'].map(haByZone), [13.8, 9.0, 15.0, 3.6])
  for (const plot of EUDR.plots) assert.equal(REF.plots.find((p) => p.id === plot.id).zoneId, PLOT_ZONE[plot.id])
  assert.ok(REF.plots.every((p) => !('ring' in p)), 'the schematic ring stays out of the reference data')
})

check('seed: every claim sits on a map plot in the right zone; every reference resolves', () => {
  const plotIds = new Set(EUDR.plots.map((p) => p.id))
  const zoneIds = new Set(REF.zones.map((z) => z.zoneId))
  const segments = new Map(REF.segments.map((s) => [s.segmentId, s]))
  for (const claim of SEED_STATE.claims) {
    assert.ok(plotIds.has(claim.plotId), claim.claimId)
    assert.equal(claim.zoneId, PLOT_ZONE[claim.plotId], claim.claimId)
  }
  for (const segment of REF.segments) assert.ok(zoneIds.has(segment.zoneId), segment.segmentId)
  for (const incident of SEED_STATE.incidents) {
    assert.ok(segments.has(incident.segmentId), incident.incidentId)
    assert.equal(incident.zoneId, segments.get(incident.segmentId).zoneId, incident.incidentId)
    assert.ok(plotIds.has(incident.plotId))
    assert.equal(incident.reports.length >= 1, true)
    assert.equal(R.msOf(incident.reports[0].at), R.msOf(incident.firstReportedAt))
  }
  const known = new Set([
    ...SEED_STATE.claims.map((c) => c.claimId), ...SEED_STATE.incidents.map((i) => i.incidentId),
    ...SEED_STATE.alerts.map((a) => a.alertId), ...SEED_STATE.survivalChecks.map((c) => c.checkId),
    ...SEED_STATE.patrolLogs.map((l) => l.logId),
  ])
  for (const task of SEED_STATE.tasks) {
    if (task.segmentId) assert.ok(segments.has(task.segmentId), task.taskId)
    if (task.zoneId) assert.ok(zoneIds.has(task.zoneId), task.taskId)
    if (task.plotId) assert.ok(plotIds.has(task.plotId), task.taskId)
    if (task.linkedRef) assert.ok(known.has(task.linkedRef), `${task.taskId} → ${task.linkedRef}`)
    if (task.logRef) assert.ok(known.has(task.logRef), `${task.taskId} log`)
  }
  for (const alert of SEED_STATE.alerts) {
    if (alert.segmentId) assert.ok(segments.has(alert.segmentId), alert.alertId)
    if (alert.incidentId) assert.ok(known.has(alert.incidentId), alert.alertId)
  }
  for (const incident of SEED_STATE.incidents) {
    for (const ref of incident.sourceRefs) if (!ref.startsWith('PR-')) assert.ok(known.has(ref), `${incident.incidentId} → ${ref}`)
  }
})

check('seed: every survival count points at a verified tree planting, alive ≤ sample', () => {
  for (const c of SEED_STATE.survivalChecks) {
    const claim = claimById(c.claimId)
    assert.equal(claim.type, 'tree_planting', c.checkId)
    assert.equal(R.claimStatus(claim, ctxAt(T2)), 'verified', c.checkId)
    assert.ok(c.alive <= c.sampleSize && c.alive >= 0, c.checkId)
    assert.equal(c.sampleSize, POLICY.survival.sampleSize)
    assert.ok(POLICY.survival.checkpointsDays.includes(c.checkpointDays))
  }
  assert.equal(S.plantings(ctxAt(T2)).length, 7)
  assert.equal(sum(S.plantings(ctx0).map((p) => p.trees)), 7503)
})

check('seed: the BM log — legacy four intact, numbering rule, ≥ 2 entries per segment, newest patrol as scheduled', () => {
  const logs = SEED_STATE.patrolLogs
  assert.ok(logs.length >= 24, `${logs.length} entries`)
  const number = (l) => Number(l.logId.split('-')[1])
  assert.ok(unique(logs.map(number)))
  const legacy = {
    315: ['2026-08-30', 'patrol', 'SEG-NYA-01', 'Mariashoni — no incursion, camera traps serviced'],
    316: ['2026-09-02', 'fence', 'SEG-OLE-01', 'Kiptunga NW boundary — 800 m live-fence maintenance'],
    317: ['2026-09-04', 'planting', 'SEG-OLE-02', 'Nessuit spur — 1,200 indigenous seedlings, retired plots'],
    318: ['2026-09-06', 'patrol', 'SEG-KER-01', 'Tinet edge — cleared 0.4 ha flagged, ranger dispatched'],
  }
  for (const [n, [on, kind, segmentId, note]] of Object.entries(legacy)) {
    const log = logs.find((l) => number(l) === Number(n))
    assert.deepEqual([log.on, log.kind, log.segmentId, log.note], [on, kind, segmentId, note])
  }
  const generated = logs.filter((l) => !(number(l) >= 315 && number(l) <= 318))
  for (const log of generated) {
    if (log.on < '2026-08-30') assert.ok(number(log) < 315, `${log.logId} dated ${log.on}`)
    else assert.ok(number(log) > 318, `${log.logId} dated ${log.on}`)
    assert.ok(log.on >= '2026-08-17' && log.on <= '2026-09-15', log.logId)
  }
  const early = generated.filter((l) => l.on < '2026-08-30').sort((a, b) => number(a) - number(b))
  assert.equal(number(early[early.length - 1]), 314)
  assert.deepEqual(early.map((l) => l.on), [...early.map((l) => l.on)].sort(), 'early numbers follow date order')
  const late = generated.filter((l) => l.on >= '2026-08-30').sort((a, b) => number(a) - number(b))
  assert.equal(number(late[0]), 319)
  assert.deepEqual(late.map((l) => l.on), [...late.map((l) => l.on)].sort(), 'later numbers follow date order')
  assert.equal(SEED_STATE.seq.BM, Math.max(...logs.map(number)) + 1)
  for (const segment of REF.segments) {
    assert.ok(logs.filter((l) => l.segmentId === segment.segmentId).length >= 2, segment.segmentId)
  }
})

check('seed: sequences continue the ids the brief names', () => {
  assert.deepEqual({ ...SEED_STATE.seq, BM: 0 }, { AL: 4413, INC: 188, MT: 11, EXP: 4, BM: 0 })
  assert.equal(SEED_STATE.activity.length, 1)
  assert.equal(SEED_STATE.activity[0].ref, 'AL-4408')
  assert.equal(SEED_STATE.activity[0].hash, 'a907…12d4')
})

check('seed: records with arrivesAt are invisible at 07:12 and visible after 09:14', () => {
  const idsAt = (now) => S.checksInScope(ctxAt(now)).map((c) => c.checkId)
  assert.ok(!idsAt(T0).includes('SVC-2026-00731'))
  assert.ok(!idsAt(R.msOf('2026-09-16T06:13:59Z')).includes('SVC-2026-00731'))
  assert.ok(idsAt(R.msOf('2026-09-16T06:14:00Z')).includes('SVC-2026-00731'))
  assert.ok(idsAt(T2).includes('SVC-2026-00731'))
  const early = { ...SEED_STATE, claims: SEED_STATE.claims.map((c) => (c.claimId === 'VER-0140' ? { ...c, arrivesAt: '2026-09-16T04:20:00Z' } : c)) }
  assert.ok(!S.claimsInScope(ctxAt(T0, early)).some((c) => c.claimId === 'VER-0140'))
  assert.ok(S.claimsInScope(ctxAt(T1, early)).some((c) => c.claimId === 'VER-0140'))
})

check('seed: south_rift hides ALERT-2280 and ALERT-2288; national shows all six', () => {
  const regional = S.alertsInScope(ctx0).map((a) => a.alertId)
  assert.equal(regional.length, 4)
  assert.ok(!regional.includes('ALERT-2280') && !regional.includes('ALERT-2288'))
  const national = S.alertsInScope(ctxAt(T0, SEED_STATE, { level: 'national' })).map((a) => a.alertId)
  assert.equal(national.length, 6)
  assert.equal(S.zonesInScope(ctx0).length, 4)
  assert.equal(S.zonesInScope(ctxAt(T0, SEED_STATE, { level: 'national' })).length, 18)
  assert.equal(S.claimsInScope(ctxAt(T0, SEED_STATE, { level: 'region', regionId: 'eastern' })).length, 0)
})

check('seed: every seeded satellite pass falls on the 5-day cycle back from 14 Sep', () => {
  const passes = [
    ...SEED_STATE.claims.filter((c) => c.satellite).map((c) => c.satellite.passDate),
    ...SEED_STATE.alerts.filter((a) => a.passDate).map((a) => a.passDate),
    SENTINEL.lastPass,
  ]
  for (const pass of passes) {
    const gap = R.eatDay(SENTINEL.lastPass) - R.eatDay(pass)
    assert.ok(gap >= 0 && gap % SENTINEL.cycleDays === 0, `${pass} is ${gap} days back`)
  }
  assert.equal(R.eatDay(SENTINEL.nextPass) - R.eatDay(SENTINEL.lastPass), SENTINEL.cycleDays)
  assert.equal(SENTINEL.baselineDate, POLICY.boundary.baselineDate)
})

check('seed: reporter identifiers exist only on claims and never in derived text', () => {
  assert.ok(SEED_STATE.claims.every((c) => /^RVT-\d{4}$/.test(c.reportedBy)))
  const derived = JSON.stringify([
    S.needsAttention(ctx0), S.notificationItems(ctx0), S.incidentRows(ctx0).map((r) => R.buildEscalationSms(r.incident, REF.zones[8], REF.segments[0])),
    SEED_STATE.incidents, SEED_STATE.alerts, SEED_STATE.tasks, SEED_STATE.patrolLogs, SEED_STATE.activity, SEED_STATE.exports,
  ])
  assert.ok(!derived.includes('RVT-'))
})

// ── 8. Exports ──────────────────────────────────────────────────────────────

const HEADERS = {
  kfs_register: 'ref, type, severity, zone, county_inferred, segment, latitude, longitude, first_report_eat, report_count, est_area_ha, status, kfs_rung_notified, notified_eat, acked_eat, kfs_reference, data_status',
  jaza_miti: 'plot_id, zone, latitude, longitude, species, trees_planted, planting_date, claim_ref, verified_on, data_status',
  monthly_return: 'section, metric, zone, value, unit, data_status',
}

function parseCsv(text) {
  assert.equal(text.charCodeAt(0), 0xfeff, 'byte-order mark')
  const src = text.slice(1)
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i += 1 } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\r' && src[i + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ''; i += 1 }
    else field += ch
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

const build = (template, period, now = T0, state = SEED_STATE) => X.buildExport({ template, period, scope: DEFAULT_SCOPE, now, state, ref: REF })

check('exports: all three templates pass the personal-data guard, and headers equal the spec exactly', () => {
  for (const [template, header] of Object.entries(HEADERS)) {
    const built = build(template, 'all_time')
    assert.deepEqual(built.matrix[0], header.split(', '), template)
    assert.equal(built.matrix[0].at(-1), 'data_status')
    assert.doesNotThrow(() => X.assertNoPersonalData(built.matrix))
    assert.ok(!built.matrix[0].some((h) => /reporter|reported_by|farmer|worker/i.test(h)))
    assert.ok(built.matrix.slice(1).every((row) => row.at(-1) === 'illustrative' && row.length === built.matrix[0].length))
    assert.ok(!built.csv.includes('RVT-'))
  }
})

check('exports: row counts — Jaza Miti 26, KFS register 9 / 6 / 3, monthly return 65', () => {
  assert.equal(build('jaza_miti', 'all_time').rows, 26)
  assert.equal(build('kfs_register', 'last_30_days').rows, 9)
  assert.equal(build('kfs_register', 'month_to_date').rows, 6)
  assert.equal(build('kfs_register', 'august_2026').rows, 3)
  for (const period of ['last_30_days', 'month_to_date', 'august_2026', 'all_time']) assert.equal(build('monthly_return', period).rows, 65)
  assert.equal(build('jaza_miti', 'august_2026').rows, 4) // VER-0133, verified 4 Aug
  assert.equal(build('jaza_miti', 'month_to_date').rows, 4) // VER-0135, countersigned 1 Sep
})

check('exports: CSV is RFC 4180 — BOM, CRLF, every field quoted, round-trips through a parser', () => {
  for (const template of Object.keys(HEADERS)) {
    const built = build(template, 'all_time')
    assert.ok(built.csv.startsWith('﻿'))
    const lines = built.csv.slice(1).split('\r\n')
    assert.equal(lines.pop(), '', 'ends with CRLF')
    assert.ok(!built.csv.slice(1).replace(/\r\n/g, '').includes('\n'))
    for (const line of lines) assert.match(line, /^"([^"]|"")*"(,"([^"]|"")*")*$/, 'every field quoted')
    assert.deepEqual(parseCsv(built.csv), built.matrix, template)
  }
  assert.equal(X.toCsv([['a "quoted", value', '1']]), '﻿"a ""quoted"", value","1"\r\n')
  assert.deepEqual(parseCsv(X.toCsv([['a "quoted", value', '']])), [['a "quoted", value', '']])
})

check('exports: files are named PROTOTYPE-ILLUSTRATIVE-<template>-<period>.csv', () => {
  assert.equal(build('kfs_register', 'last_30_days').filename, 'PROTOTYPE-ILLUSTRATIVE-kfs-register-last-30-days.csv')
  assert.equal(build('jaza_miti', 'all_time').filename, 'PROTOTYPE-ILLUSTRATIVE-jaza-miti-all-time.csv')
  assert.equal(build('monthly_return', 'month_to_date').filename, 'PROTOTYPE-ILLUSTRATIVE-monthly-return-month-to-date.csv')
  for (const template of Object.keys(HEADERS)) assert.ok(build(template, 'august_2026').filename.startsWith('PROTOTYPE-ILLUSTRATIVE-'))
})

check('exports: KFS register cells — EAT stamps, blanks not "null", first rung and earliest acknowledgement', () => {
  const rows = Object.fromEntries(build('kfs_register', 'all_time').table.rows.map((r) => [r[0], r]))
  const fire = rows['INC-2026-0187']
  assert.deepEqual(fire.slice(0, 5), ['INC-2026-0187', 'fire', 'critical', 'Olenguruone', 'Nakuru'])
  assert.deepEqual(fire.slice(5, 12), ['Kiptunga NW', '-0.3956', '35.5900', '2026-09-16 06:52', '3', '2', 'escalated'])
  assert.deepEqual(fire.slice(12), ['station_in_charge', '2026-09-16 06:58', '', '', 'illustrative'])
  const grazing = rows['INC-2026-0184']
  assert.deepEqual(grazing.slice(10, 16), ['', 'triaged', '', '', '', ''])
  const closed = rows['INC-2026-0181']
  assert.deepEqual(closed.slice(12, 15), ['station_in_charge', '2026-08-30 13:52', '2026-08-30 14:04'])
  for (const row of Object.values(rows)) assert.ok(row.every((cell) => cell !== 'null' && cell !== 'n/a' && cell !== 'undefined'))
})

check('exports: Jaza Miti — one row per species of each verified planting, dated by countersign else decision', () => {
  const table = build('jaza_miti', 'all_time').table.rows
  const byClaim = (id) => table.filter((r) => r[7] === id)
  assert.deepEqual(['VER-0122', 'VER-0124', 'VER-0128', 'VER-0130', 'VER-0131', 'VER-0133', 'VER-0135'].map((id) => byClaim(id).length), [4, 2, 4, 4, 4, 4, 4])
  assert.equal(byClaim('VER-0135')[0][8], '2026-09-01') // countersign date, not the 31 Aug decision
  assert.equal(byClaim('VER-0133')[0][8], '2026-08-04')
  assert.equal(sum(byClaim('VER-0131').map((r) => Number(r[5]))), 103)
  assert.equal(byClaim('VER-0131')[0][6], '2026-07-17') // planting_date is the work date
  assert.ok(table.every((r) => /^-?\d+\.\d{4}$/.test(r[2]) && /^-?\d+\.\d{4}$/.test(r[3])))
})

check('exports: monthly return has 13 metrics × (4 zones + ALL) with the right values', () => {
  const rows = build('monthly_return', 'month_to_date').table.rows
  const metrics = [...new Set(rows.map((r) => r[1]))]
  assert.equal(metrics.length, 13)
  assert.deepEqual([...new Set(rows.map((r) => r[2]))], ['Olenguruone', 'Nyangores', 'Kericho', 'Kuresoi', 'ALL'])
  const all = Object.fromEntries(rows.filter((r) => r[2] === 'ALL').map((r) => [r[1], r[3]]))
  assert.equal(all.incidents_open_now, '6')
  assert.equal(all.incidents_opened, '6')
  assert.equal(all.incidents_closed, '0')
  assert.equal(all.claims_awaiting_decision_now, '6')
  assert.equal(all.claims_verified, '2') // VER-0135 (countersigned 1 Sep) and VER-0137 (decided 1 Sep)
  assert.equal(all.segments_overdue_now, '4')
  assert.equal(all.beacons_signs_missing_now, '44')
  assert.equal(all.integrity_pct_now, '93.6')
  assert.equal(all.survival_latest_pct_now, '81.0')
  assert.equal(all.trees_surviving_conservative_now, '4042')
  const zoneSum = (metric) => sum(rows.filter((r) => r[1] === metric && r[2] !== 'ALL').map((r) => Number(r[3])))
  assert.equal(zoneSum('incidents_open_now'), 6)
  assert.equal(zoneSum('beacons_signs_missing_now'), 44)
  assert.equal(rows.find((r) => r[1] === 'survival_latest_pct_now' && r[2] === 'Kuresoi')[3], '76.0') // LIK-16, 38 of 50
  // A zone with no count (or no segments) is blank, never "n/a" or "null".
  const national = X.buildExport({ template: 'monthly_return', period: 'all_time', scope: { level: 'national' }, now: T0, state: SEED_STATE, ref: REF })
  assert.equal(national.rows, 13 * 19)
  const kiambu = national.table.rows.filter((r) => r[2] === 'Kiambu')
  assert.equal(kiambu.find((r) => r[1] === 'survival_latest_pct_now')[3], '')
  assert.equal(kiambu.find((r) => r[1] === 'integrity_pct_now')[3], '')
  assert.ok(national.table.rows.every((r) => r[3] !== 'null' && r[3] !== 'n/a' && r[3] !== 'undefined' && r[3] !== 'NaN'))
})

check('exports: the period filter applies to every metric not ending _now', () => {
  const august = Object.fromEntries(build('monthly_return', 'august_2026').table.rows.filter((r) => r[2] === 'ALL').map((r) => [r[1], r[3]]))
  assert.equal(august.incidents_opened, '3')
  assert.equal(august.incidents_closed, '3')
  assert.equal(august.claims_rejected, '1') // VER-0136, 31 Aug
  assert.equal(august.incidents_open_now, '6') // _now ignores the period
})

// ── 9. Activity log ─────────────────────────────────────────────────────────

/** Verifies the chain oldest → newest from the seeded AL-4408, and that new refs run AL-4413, AL-4414, … */
function verifyChain(activity) {
  const oldestFirst = [...activity].reverse()
  assert.equal(oldestFirst[0].ref, 'AL-4408')
  assert.equal(oldestFirst[0].hash, 'a907…12d4')
  for (let i = 1; i < oldestFirst.length; i += 1) {
    const entry = oldestFirst[i]
    assert.equal(entry.ref, `AL-${4413 + i - 1}`, 'refs increment')
    assert.equal(entry.hash, R.chainHash(oldestFirst[i - 1].hash, entry), `${entry.ref} hash`)
    assert.match(entry.hash, /^fnv1a:[0-9a-f]{8}$/)
  }
}

check('activity: FNV-1a matches the published test vectors', () => {
  assert.equal(R.fnv1a32(''), 0x811c9dc5)
  assert.equal(R.fnv1a32('a'), 0xe40c292c)
  assert.equal(R.fnv1a32('foobar'), 0xbf9cf968)
  assert.equal(R.hex8(R.fnv1a32('a')), 'e40c292c')
  assert.equal(R.checkValue('a'), 'fnv1a:e40c292c')
  assert.equal(R.hex8(1), '00000001')
})

check('activity: after three actions the hash chain verifies from AL-4408 and refs run from AL-4413', () => {
  let state = ok(SEED_STATE, 'DECIDE_CLAIM', decide('VER-0140', 'approve'), T1).state
  state = ok(state, 'SEND_ESCALATION', { incidentId: 'INC-2026-0187', rung: 'county_ecosystem_conservator', channel: 'sms' }, T1).state
  state = ok(state, 'LOG_PATROL', { segmentId: 'SEG-KER-03', on: '2026-09-16', note: 'Walked the edge.', issues: [] }, T1).state
  assert.deepEqual(state.activity.map((a) => a.ref), ['AL-4415', 'AL-4414', 'AL-4413', 'AL-4408'])
  verifyChain(state.activity)
  assert.equal(state.activity[2].when, '16 Sep 07:27')
  assert.equal(state.activity[2].who, 'CON-SR-01')
  assert.equal(state.activity[2].record, 'VER-0140')
  assert.equal(state.activity[1].tone, 'critical') // the escalation of a fire
  assert.equal(state.activity[0].tone, undefined)
  assert.equal(state.seq.AL, 4416)
  assert.equal(SEED_STATE.seq.AL, 4413, 'the seed is not mutated')
})

check('activity: tone is warn for rejections and dismissals; a countersign is logged under the countersigner', () => {
  const rejected = ok(SEED_STATE, 'DECIDE_CLAIM', decide('VER-0148', 'reject', { reason: 'gps_outside_plot', note: 'GPS is 210 m outside the plot.' }))
  assert.equal(rejected.state.activity[0].tone, 'warn')
  assert.equal(dismissed.state.activity[0].tone, 'warn')
  const signed = ok(approve('VER-0145'), 'COUNTERSIGN', { claimId: 'VER-0145', by: 'UNIT-HEAD' })
  assert.equal(signed.state.activity[0].who, 'UNIT-HEAD')
})

check('activity: an export entry records template, period, rows and check value, never the content', () => {
  const out = ok(SEED_STATE, 'GENERATE_EXPORT', { template: 'kfs_register', period: 'last_30_days', scope: DEFAULT_SCOPE })
  const entry = out.state.activity[0]
  assert.match(entry.event, /kfs-register/)
  assert.match(entry.event, /last 30 days/)
  assert.match(entry.event, /9 rows/)
  assert.ok(entry.event.includes(out.result.hash))
  assert.ok(!entry.event.includes('INC-2026'))
  assert.equal(out.state.exports[0].exportId, 'EXP-0004')
  assert.equal(out.state.exports[0].rows, 9)
  assert.equal(out.state.exports[0].hash, R.checkValue(out.result.csv))
})

// ── Times ───────────────────────────────────────────────────────────────────

check('time: formatEat prints EAT with the fixed month table', () => {
  assert.equal(formatEat(T0, 'date'), '16 Sep 2026')
  assert.equal(formatEat(T0, 'time'), '07:12')
  assert.equal(formatEat(T0, 'datetime'), '16 Sep 07:12')
  assert.equal(formatEat(T0, 'stamp'), '2026-09-16 07:12')
  assert.equal(formatEat(Date.parse('2026-09-06T01:12:00Z'), 'datetime'), '6 Sep 04:12')
  assert.equal(formatEat(Date.parse('2026-09-15T21:00:00Z'), 'stamp'), '2026-09-16 00:00') // midnight is 00:00, not 24:00
  assert.equal(formatEat(Date.parse('2026-12-31T21:05:00Z'), 'date'), '1 Jan 2027')
  assert.equal(formatEat('2026-09-16T04:12:00Z', 'time'), '07:12')
})

check('time: the rules’ EAT day arithmetic agrees with the formatter', () => {
  for (let t = Date.parse('2026-08-25T00:00:00Z'); t < Date.parse('2026-09-30T00:00:00Z'); t += 5 * HOUR + 7 * MIN) {
    assert.equal(R.eatDateKey(t), formatEat(t, 'stamp').slice(0, 10), new Date(t).toISOString())
  }
  assert.equal(R.eatDateKey('2026-09-15T21:00:00Z'), '2026-09-16')
  assert.equal(R.addDaysKey('2026-03-10', 60), '2026-05-09')
  assert.equal(R.addDaysKey('2026-07-17', 180), '2027-01-13')
  assert.equal(R.isoOf(T0 + 500), '2026-09-16T04:12:00Z')
})

check('geodesy: destination and haversine round-trip', () => {
  const plot = EUDR.plots.find((p) => p.id === 'KIP-17')
  const fire = R.destination(plot, 0, 450)
  assert.equal(R.formatCoord(fire.lat), '-0.3956')
  assert.equal(R.formatCoord(fire.lon), '35.5900')
  for (const bearing of [0, 47, 135, 200, 270, 359]) near(R.haversine(plot, R.destination(plot, bearing, 321)), 321, 1e-6, `bearing ${bearing}`)
  assert.equal(R.EARTH_RADIUS_M, 6371008.8)
  assert.equal(incidentById('INC-2026-0187').lat.toFixed(4), '-0.3956')
})

// ── 10. Walkthrough replay (section 11.C, steps 2 to 10) ────────────────────

check('walkthrough: step 1 — Needs you today lists six items in order', () => {
  const { items, hidden } = S.needsAttention(ctx0)
  assert.deepEqual(items.map((i) => i.key), ['ack:INC-2026-0187', 'first:INC-2026-0184', 'claims-late', 'survival:SVC-2026-00702', 'alerts-new', 'patrols-late'])
  assert.deepEqual(items.map((i) => i.severity), ['critical', 'warn', 'warn', 'warn', 'warn', 'warn'])
  assert.equal(hidden, 0)
  assert.match(items[0].title, /due in 1 min/)
  assert.match(items[1].title, /overdue 46 h/)
  assert.match(items[2].title, /^3 claims are past the 5-day target$/)
  assert.match(items[4].title, /^2 new satellite alerts/)
  assert.match(items[5].title, /^4 segments have an overdue patrol/)
  assert.equal(S.needsAttention(ctx0, 3).hidden, 3)
  assert.match(S.needsAttention(ctxAt(T_FIRE_OVERDUE)).items[0].title, /overdue/)
  assert.equal(S.notificationItems(ctx0).length, 4)
  assert.deepEqual(S.notificationItems(ctx0).map((n) => n.when), ['14 min ago', '7 days ago', '11 days ago', '6 hours ago'])
})

check('walkthrough: steps 2 to 10 replay through reduce and the selectors', () => {
  let state = SEED_STATE
  const step = (type, payload, now) => {
    const out = ok(state, type, payload, now)
    state = out.state
    return out
  }
  const kpi = (now) => S.claimKpis(ctxAt(now, state))

  // Step 2 (+15 min → 07:27): the fire’s ladder, send rung 2, acknowledge it, step the status.
  assert.deepEqual(states(ladderOf('INC-2026-0187', T1)), ['overdue', 'due', 'waiting'])
  assert.equal(S.needsAttention(ctxAt(T1)).items[0].severity, 'critical')
  const sent = step('SEND_ESCALATION', { incidentId: 'INC-2026-0187', rung: 'county_ecosystem_conservator', channel: 'sms' }, T1)
  assert.equal(state.activity[0].ref, 'AL-4413')
  assert.equal(sent.result.rung, 'county_ecosystem_conservator')
  assert.ok(smsFor(incidentById('INC-2026-0187', state)).length <= 160)
  assert.equal(S.incidentDetail(ctxAt(T1, state), 'INC-2026-0187').events.filter((e) => e.kind === 'sent').length, 2)
  step('RECORD_ACK', { incidentId: 'INC-2026-0187', rung: 'county_ecosystem_conservator', ackChannel: 'sms', kfsRef: '', note: 'Crew on the way' }, T1)
  assert.deepEqual(states(ladderOf('INC-2026-0187', T1, state)), ['sent', 'acknowledged', 'not_needed'])
  assert.ok(!S.needsAttention(ctxAt(T1, state)).items.some((i) => i.key === 'ack:INC-2026-0187'))
  assert.equal(incidentById('INC-2026-0187', state).status, 'acknowledged')
  assert.equal(run(state, 'SET_INCIDENT_STATUS', { incidentId: 'INC-2026-0187', to: 'controlled' }, T1).state, state)
  step('SET_INCIDENT_STATUS', { incidentId: 'INC-2026-0187', to: 'responding' }, T1)
  step('SET_INCIDENT_STATUS', { incidentId: 'INC-2026-0187', to: 'controlled' }, T1)
  assert.equal(incidentById('INC-2026-0187', state).status, 'controlled')

  // Step 3: VER-0140 has no flags and needs no countersign; approving verifies it. Awaiting decision 6 → 5.
  assert.equal(kpi(T1).awaitingDecision, 6)
  assert.deepEqual(R.claimFlags(claimById('VER-0140', state), ctxAt(T1, state)), [])
  step('DECIDE_CLAIM', decide('VER-0140', 'approve'), T1)
  assert.equal(R.claimStatus(claimById('VER-0140', state), ctxAt(T1, state)), 'verified')
  assert.equal(claimById('VER-0140', state).stage, 'verified')
  assert.equal(kpi(T1).awaitingDecision, 5)

  // Step 4: VER-0145 needs a justification, then awaits a countersign; VER-0138 gets a field-check request.
  assert.equal(run(state, 'DECIDE_CLAIM', decide('VER-0145', 'approve'), T1).state, state)
  step('DECIDE_CLAIM', decide('VER-0145', 'approve', { justification: 'The NDVI dip is cloud-free but the block is newly cleared.' }), T1)
  assert.equal(R.claimStatus(claimById('VER-0145', state), ctxAt(T1, state)), 'awaiting_countersign')
  assert.equal(kpi(T1).awaitingDecision, 4)
  assert.equal(kpi(T1).awaitingCountersign, 1)
  const evidence = step('REQUEST_EVIDENCE', { claimId: 'VER-0138', kind: 'field_check', note: 'Visit the fence line and re-take the photos.' }, T1)
  assert.equal(R.claimStatus(claimById('VER-0138', state), ctxAt(T1, state)), 'evidence_requested')
  assert.equal(kpi(T1).awaitingDecision, 3)
  assert.equal(evidence.result.taskId, 'MT-0011')
  const mt11 = state.tasks.find((t) => t.taskId === 'MT-0011')
  assert.deepEqual([mt11.type, mt11.assigneeRole, mt11.zoneId, mt11.linkedRef, mt11.status], ['field_check', 'Zone Manager, Nyangores', 'MAU-NYA', 'VER-0138', 'planned'])
  assert.equal(mt11.dueOn, '2026-09-23')

  // Step 5: VER-0148 — a 12-character note is refused; a proper rejection succeeds. 3 → 2.
  assert.equal(run(state, 'DECIDE_CLAIM', decide('VER-0148', 'reject', { reason: 'gps_outside_plot', note: '123456789012' }), T1).state, state)
  step('DECIDE_CLAIM', decide('VER-0148', 'reject', { reason: 'gps_outside_plot', note: 'GPS is 210 m outside a plot whose limit is 117 m.' }), T1)
  assert.equal(kpi(T1).awaitingDecision, 2)

  // Step 6: VER-0142 — approve with a justification, then the countersign; 2 → 1 and 26 → 30 Jaza Miti rows.
  assert.equal(build('jaza_miti', 'all_time', T1, state).rows, 26)
  step('DECIDE_CLAIM', decide('VER-0142', 'approve', { justification: 'Planted at wide spacing on purpose; canopy is recovering.' }), T1)
  assert.equal(kpi(T1).awaitingDecision, 1)
  step('COUNTERSIGN', { claimId: 'VER-0142', by: 'UNIT-HEAD' }, T1)
  assert.equal(R.claimStatus(claimById('VER-0142', state), ctxAt(T1, state)), 'verified')
  assert.equal(build('jaza_miti', 'all_time', T1, state).rows, 30)
  assert.equal(kpi(T1).awaitingCountersign, 1) // VER-0145 still waits

  // Step 7: SVC-2026-00702 (34/50) is decisively below 80%; the replanting order is 448 trees.
  const low = S.survivalDetail(ctxAt(T1, state), 'SVC-2026-00702')
  assert.equal(low.survival.verdict, 'fail')
  assert.ok(S.needsAttention(ctxAt(T1, state)).items.some((i) => i.key === 'survival:SVC-2026-00702'))
  assert.equal(S.survivalDetail(ctxAt(T1, state), 'SVC-2026-00709').survival.verdict, 'borderline')
  const order = step('CREATE_TASK', { type: 'replanting', linkedRef: 'SVC-2026-00702', assigneeRole: 'Block Supervisor, Nyangores', note: '' }, T1)
  assert.equal(order.result.id, 'MT-0012')
  assert.equal(state.tasks.find((t) => t.taskId === 'MT-0012').quantity, 448)
  assert.equal(S.openReplantingOrder(ctxAt(T1, state), 'VER-0122').taskId, 'MT-0012')
  assert.ok(!S.needsAttention(ctxAt(T1, state)).items.some((i) => i.key.startsWith('survival:')))
  assert.equal(S.survivalKpis(ctxAt(T1, state)).pct.toFixed(3), '0.810')
  assert.equal(S.survivalSummary(ctxAt(T1, state)).verifiedTrees, 7503 + 1800) // VER-0142 is verified now
  // +1 h twice (09:27): SVC-2026-00731 appears and the latest survival becomes 82.0%.
  const late = S.survivalSummary(ctxAt(T2, state))
  assert.deepEqual([late.alive, late.sample], [205, 250])
  assert.equal((late.pct * 100).toFixed(1), '82.0')
  assert.deepEqual([late.countedTrees, late.surviving, late.survivingConservative], [5803, 4825, 4118])
  assert.deepEqual(S.survivalRows(ctxAt(T2, state)).map((r) => r.id).slice(0, 1), ['SVC-2026-00731'])
  assert.ok(!S.survivalRows(ctxAt(T1, state)).some((r) => r.id === 'SVC-2026-00731'))
  const early = S.survivalKpis(ctxAt(T1, state))
  assert.deepEqual([early.belowThreshold, early.borderline, early.dueSoon, early.overdue], [1, 1, 2, 1])
  const after = S.survivalKpis(ctxAt(T2, state))
  assert.deepEqual([after.dueSoon, after.overdue], [1, 1]) // KIP-17 leaves the due list
  const due = S.countsDue(ctxAt(T2, state)).find((d) => d.plotId === 'KIP-17')
  assert.deepEqual([due.checkpointDays, due.dueOn, due.state], [180, '2027-01-13', 'upcoming'])

  // Step 8: dismiss two alerts, schedule a patrol and confirm the third as an incident. Alerts to review 3 → 0.
  assert.equal(S.boundaryKpis(ctxAt(T2, state)).alertsToReview, 3)
  step('TRIAGE_ALERT', { alertId: 'ALERT-2294', to: 'dismissed', dismissal: { reason: 'known_incident', incidentId: 'INC-2026-0184', note: '' } }, T2)
  step('TRIAGE_ALERT', { alertId: 'ALERT-2292', to: 'dismissed', dismissal: { reason: 'known_incident', incidentId: 'INC-2026-0181', note: '' } }, T2)
  const patrol = step('CREATE_TASK', { type: 'field_check', segmentId: 'SEG-KUR-02', linkedRef: 'ALERT-2295', assigneeRole: 'Zone Manager, Kuresoi', note: 'Check the edge of the belt.' }, T2)
  assert.equal(patrol.result.id, 'MT-0013')
  assert.equal(state.tasks.find((t) => t.taskId === 'MT-0013').zoneId, 'MAU-KUR')
  assert.equal(state.alerts.find((a) => a.alertId === 'ALERT-2295').status, 'new', 'scheduling a patrol leaves the alert status alone')
  assert.equal(S.alertRows(ctxAt(T2, state)).find((r) => r.id === 'ALERT-2295').agreement, 'satellite_only')
  const confirmed = step('TRIAGE_ALERT', { alertId: 'ALERT-2295', to: 'confirmed', incidentType: 'encroachment' }, T2)
  assert.equal(confirmed.result.id, 'INC-2026-0188')
  const raised = incidentById('INC-2026-0188', state)
  const alert2295 = state.alerts.find((a) => a.alertId === 'ALERT-2295')
  assert.equal(raised.reports.length, 1)
  assert.equal(raised.reports[0].channel, 'satellite')
  assert.equal(raised.reports[0].at, '2026-09-15T22:10:00Z') // 01:10 EAT on 16 Sep
  assert.equal(raised.firstReportedAt, alert2295.detectedAt)
  assert.equal(formatEat(raised.reports[0].at, 'time'), '01:10')
  assert.deepEqual([raised.lat, raised.lon], [alert2295.lat, alert2295.lon])
  assert.deepEqual([raised.status, raised.type, raised.segmentId, raised.sourceRefs, raised.estAreaHa], ['reported', 'encroachment', 'SEG-KUR-02', ['ALERT-2295'], 0.15])
  assert.equal(alert2295.incidentId, 'INC-2026-0188')
  assert.equal(S.alertRows(ctxAt(T2, state)).find((r) => r.id === 'ALERT-2295').agreement, 'both')
  assert.equal(S.boundaryKpis(ctxAt(T2, state)).alertsToReview, 0)
  assert.equal(S.incidentRows(ctxAt(T2, state)).find((r) => r.id === 'INC-2026-0188').satellite, 'both')

  // Step 9: a patrol on SEG-KER-03 clears its overdue state (4 → 3, on schedule 8 → 9); completing MT-0002 logs a BM entry.
  assert.deepEqual([S.patrolKpis(ctxAt(T2, state)).overdue, S.patrolKpis(ctxAt(T2, state)).onSchedule], [4, 8])
  const logged = step('LOG_PATROL', { segmentId: 'SEG-KER-03', on: '2026-09-16', note: 'Walked the southern edge; nothing new.', issues: ['none'] }, T2)
  assert.equal(logged.result.id, 'BM-332')
  assert.deepEqual([S.patrolKpis(ctxAt(T2, state)).overdue, S.patrolKpis(ctxAt(T2, state)).onSchedule], [3, 9])
  assert.equal(S.segmentRows(ctxAt(T2, state)).find((r) => r.id === 'SEG-KER-03').nextDue, '2026-09-30')
  const done = step('UPDATE_TASK', { taskId: 'MT-0002', action: 'complete' }, T2)
  assert.equal(done.result.logRef, 'BM-333')
  const entry = state.patrolLogs.find((l) => l.logId === 'BM-333')
  assert.deepEqual([entry.kind, entry.segmentId, entry.on], ['fence', 'SEG-KER-01', '2026-09-16'])
  assert.equal(S.patrolKpis(ctxAt(T2, state)).doneThisMonth, 3)
  assert.equal(S.taskRows(ctxAt(T2, state)).find((r) => r.id === 'MT-0002').task.status, 'done')

  // Step 10: the KFS register for the last 30 days has the nine seeded incidents plus INC-2026-0188.
  const file = step('GENERATE_EXPORT', { template: 'kfs_register', period: 'last_30_days', scope: DEFAULT_SCOPE }, T2)
  assert.equal(file.result.rows, 10)
  assert.equal(file.result.filename, 'PROTOTYPE-ILLUSTRATIVE-kfs-register-last-30-days.csv')
  const table = parseCsv(file.result.csv)
  assert.equal(table.length, 11)
  assert.equal(table[0].at(-1), 'data_status')
  assert.ok(table.slice(1).every((row) => row.at(-1) === 'illustrative'))
  assert.ok(!file.result.csv.includes('RVT-'))
  const raisedRow = table.find((row) => row[0] === 'INC-2026-0188')
  assert.equal(raisedRow[8], '2026-09-16 01:10')
  assert.deepEqual([raisedRow[12], raisedRow[13], raisedRow[14]], ['', '', ''])
  assert.equal(file.result.hash, R.checkValue(file.result.csv))
  assert.equal(S.exportHistory(ctxAt(T2, state))[0].exportId, 'EXP-0004')

  // The whole session’s activity chain still verifies and every ref increments.
  verifyChain(state.activity)
  assert.equal(state.activity.length, 1 + 18) // the seeded entry plus one for each of the 18 actions above
})

check('walkthrough: RESET returns the seed, and the seed was never mutated', () => {
  const dirty = ok(SEED_STATE, 'DECIDE_CLAIM', decide('VER-0140', 'approve'), T1).state
  assert.equal(reduce(dirty, { type: 'RESET' }, T2).state, SEED_STATE)
  assert.equal(R.claimStatus(claimById('VER-0140'), ctx0), 'awaiting_decision')
})

check('reducer: asking for evidence after an approval withdraws the pending approval', () => {
  const held = approve('VER-0145')
  assert.equal(R.claimStatus(claimById('VER-0145', held), ctx0), 'awaiting_countersign')
  const out = ok(held, 'REQUEST_EVIDENCE', { claimId: 'VER-0145', kind: 'photos', note: 'Please add photos of the block.' })
  assert.equal(claimById('VER-0145', out.state).decision, null)
  assert.equal(R.claimStatus(claimById('VER-0145', out.state), ctx0), 'evidence_requested')
  assert.equal(out.result.withdrewApproval, true)
  // Evidence back: the SLA clock restarts from the resubmission.
  const back = ok(out.state, 'EVIDENCE_RECEIVED', { claimId: 'VER-0145' }, T1)
  assert.equal(R.claimStatus(claimById('VER-0145', back.state), ctxAt(T1, back.state)), 'awaiting_decision')
  assert.equal(R.claimWorkingDays(claimById('VER-0145', back.state), T1), 0)
})

check('reducer: logging an incident, sending a phone call and closing it as a false alarm', () => {
  let state = ok(SEED_STATE, 'LOG_INCIDENT', { type: 'fire', segmentId: 'SEG-OLE-02', note: 'Smoke seen from the road.' }, T1).state
  const made = state.incidents.find((i) => i.incidentId === 'INC-2026-0188')
  assert.deepEqual([made.zoneId, made.lat, made.lon, made.status, made.reports[0].channel, made.plotId], ['MAU-OLE', null, null, 'reported', 'officer', null])
  assert.ok(!smsFor(made).includes('GPS'))
  state = ok(state, 'SEND_ESCALATION', { incidentId: 'INC-2026-0188', rung: 'station_in_charge', channel: 'phone' }, T1).state
  assert.equal(incidentById('INC-2026-0188', state).status, 'escalated')
  assert.equal(incidentById('INC-2026-0188', state).escalations[0].channel, 'phone')
  state = ok(state, 'CLOSE_INCIDENT', { incidentId: 'INC-2026-0188', kind: 'false_alarm', note: 'It was a farmer burning crop residue.' }, T1).state
  assert.equal(incidentById('INC-2026-0188', state).status, 'closed')
  assert.equal(incidentById('INC-2026-0188', state).outcome.kind, 'false_alarm')
  assert.equal(S.incidentKpis(ctxAt(T1, state)).closedThisMonth, 1)
  const withGps = ok(SEED_STATE, 'LOG_INCIDENT', { type: 'charcoal', segmentId: 'SEG-KER-03', lat: -0.5, lon: 35.7 }, T1).state
  assert.deepEqual([withGps.incidents[0].lat, withGps.incidents[0].lon], [-0.5, 35.7])
})

check('reducer: closing a controlled fire needs the area burnt, and resolves a confirmed alert', () => {
  const controlled = { ...SEED_STATE, incidents: SEED_STATE.incidents.map((i) => (i.incidentId === 'INC-2026-0182' ? { ...i, status: 'controlled' } : i)) }
  const closed = ok(controlled, 'CLOSE_INCIDENT', { incidentId: 'INC-2026-0182', kind: 'resolved', areaAffectedHa: 0.4, note: 'Cleared strip re-planted and fenced.' })
  assert.equal(closed.state.alerts.find((a) => a.alertId === 'ALERT-2291').status, 'resolved')
  const fire = { ...SEED_STATE, incidents: SEED_STATE.incidents.map((i) => (i.incidentId === 'INC-2026-0187' ? { ...i, status: 'controlled' } : i)) }
  assert.equal(run(fire, 'CLOSE_INCIDENT', { incidentId: 'INC-2026-0187', kind: 'resolved', note: 'Contained by the KFS crew at noon.' }).state, fire)
  ok(fire, 'CLOSE_INCIDENT', { incidentId: 'INC-2026-0187', kind: 'resolved', areaAffectedHa: 2.1, note: 'Contained by the KFS crew at noon.' })
})

check('reducer: recount requests create one count task each; accepting a count does not', () => {
  const recount = ok(SEED_STATE, 'REVIEW_CHECK', { checkId: 'SVC-2026-00709', review: 'recount_requested' })
  const task = recount.state.tasks.find((t) => t.taskId === 'MT-0011')
  assert.deepEqual([task.type, task.linkedRef, task.quantity, task.assigneeRole], ['count_request', 'SVC-2026-00709', 50, 'Block Supervisor, Kuresoi'])
  assert.equal(recount.state.survivalChecks.find((c) => c.checkId === 'SVC-2026-00709').review, 'recount_requested')
  const accept = ok(SEED_STATE, 'REVIEW_CHECK', { checkId: 'SVC-2026-00702', review: 'accepted' })
  assert.equal(accept.state.tasks.length, SEED_STATE.tasks.length)
  const request = { type: 'count_request', linkedRef: 'VER-0128', assigneeRole: 'Block Supervisor, Olenguruone', quantity: 50, note: 'Sixty-day count is overdue.' }
  const once = ok(SEED_STATE, 'CREATE_TASK', request)
  assert.equal(run(once.state, 'CREATE_TASK', request).state, once.state)
})

check('reducer: task transitions follow the table', () => {
  let state = ok(SEED_STATE, 'UPDATE_TASK', { taskId: 'MT-0001', action: 'start' }).state
  assert.equal(state.tasks.find((t) => t.taskId === 'MT-0001').status, 'in_progress')
  state = ok(state, 'UPDATE_TASK', { taskId: 'MT-0001', action: 'block', reason: 'Waiting for the KFS burn permit.' }).state
  assert.equal(state.tasks.find((t) => t.taskId === 'MT-0001').blockedReason, 'Waiting for the KFS burn permit.')
  state = ok(state, 'UPDATE_TASK', { taskId: 'MT-0001', action: 'start' }).state
  assert.equal(state.tasks.find((t) => t.taskId === 'MT-0001').blockedReason, null)
  state = ok(state, 'UPDATE_TASK', { taskId: 'MT-0001', action: 'complete' }).state
  assert.equal(state.tasks.find((t) => t.taskId === 'MT-0001').logRef, 'BM-332')
  assert.equal(state.patrolLogs.find((l) => l.logId === 'BM-332').kind, 'other') // firebreak clearing → other
  state = ok(state, 'UPDATE_TASK', { taskId: 'MT-0001', action: 'reopen' }).state
  assert.equal(state.tasks.find((t) => t.taskId === 'MT-0001').status, 'in_progress')
  const planting = ok(SEED_STATE, 'UPDATE_TASK', { taskId: 'MT-0004', action: 'complete' })
  assert.equal(planting.state.patrolLogs.find((l) => l.logId === 'BM-332').kind, 'fence') // fence_repair → fence
})

// ── Result ──────────────────────────────────────────────────────────────────

if (failures.length > 0) {
  console.error(`\n${failures.length} of ${passed + failures.length} checks FAILED:\n`)
  for (const failure of failures) console.error(`  ✗ ${failure}\n`)
  process.exit(1)
}
console.log(`${passed} checks passed`)
