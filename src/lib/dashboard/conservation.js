// Seed data for the Conservation Officer console. ILLUSTRATIVE ONLY: there is
// no backend, every zone, segment, plot and place name is mock and not
// surveyed, and every figure is invented to exercise the rules.
//
// Exports two frozen objects:
//   SEED_STATE — the initial reducer state (claims, incidents, alerts, survival
//                checks, tasks, patrol log, exports, activity log, sequences).
//   REF        — reference data (zones, belts, segments, plots, mixes, KFS
//                ladder, Sentinel-2 constants, regions, role titles).
//
// Deterministic: no randomness and no clock reads. Every GPS point is produced
// by `destination()` from the anchor plot's centroid, never typed in. Times
// below are EAT unless marked Z and are stored as UTC; a date without a time
// means 09:30 EAT. Imports reach only the structure file, the sector plot data,
// the id helpers and the conservation library.

import { EUDR } from '../dashboardData.js'
import {
  makeAlertId,
  makeAuditLogId,
  makeBufferLogId,
  makeClaimId,
  makeExportId,
  makeIncidentId,
  makeSegmentId,
  makeSurvivalId,
  makeTaskId,
} from '../contracts/ids.js'
import {
  BELTS,
  BELT_TOTALS,
  MAU_RECONCILIATION,
  PLOT_ZONE,
  REGION_BELT_KM,
  REGION_IDS,
  REGION_LABEL,
  STRUCTURE_SOURCE,
  ZONES,
  ZONE_TOTALS,
  zoneCode,
} from './ntzdcStructure.js'
import { POLICY, deepFreeze } from '../conservation/policy.js'
import { HOUR_MS, addDaysKey, destination, isoOf, msOf } from '../conservation/rules.js'

// ── Demo clock and account ──────────────────────────────────────────────────

/** The demo starts at 16 Sep 2026 07:12 EAT. */
export const CLOCK_START_MS = Date.parse('2026-09-16T04:12:00Z')

/** The one shipped account: the South Rift regional officer. */
export const DEFAULT_SCOPE = deepFreeze({ level: 'region', regionId: 'south_rift' })

const eat = (date, time = '09:30') => isoOf(Date.parse(`${date}T${time}:00+03:00`))

// ── Reference data ──────────────────────────────────────────────────────────

/** Sentinel-2 constants. Every seeded pass date is 14 Sep 2026 minus a multiple of the cycle. */
export const SENTINEL = Object.freeze({
  lastPass: '2026-09-14',
  nextPass: '2026-09-19',
  cloudFraction: 0.041, // last pass, over the sector
  cycleDays: 5,
  baselineDate: POLICY.boundary.baselineDate,
})

// ILLUSTRATIVE: indicative Kenyan montane and agroforestry species. The approved
// list must come from KEFRI and KFS.
const MIXES = {
  'MIX-INDIG': {
    mixId: 'MIX-INDIG',
    name: 'Indigenous mix',
    species: [
      { name: 'Podocarpus latifolius', share: 30 },
      { name: 'Olea capensis', share: 30 },
      { name: 'Croton megalocarpus', share: 25 },
      { name: 'Prunus africana', share: 15 },
    ],
  },
  'MIX-FUEL': {
    mixId: 'MIX-FUEL',
    name: 'Fuelwood mix',
    species: [
      { name: 'Grevillea robusta', share: 60 },
      { name: 'Calliandra calothyrsus', share: 40 },
    ],
  },
  'MIX-BLEND': {
    mixId: 'MIX-BLEND',
    name: 'Blended mix',
    species: [
      { name: 'Cordia africana', share: 25 },
      { name: 'Markhamia lutea', share: 25 },
      { name: 'Olea capensis', share: 25 },
      { name: 'Podocarpus latifolius', share: 25 },
    ],
  },
}

// KFS counterparts, kept as data (role titles only, no names, no numbers) so a
// merger of KFS with the Kenya Water Towers Agency means editing data, not code.
const LADDER = {
  station_in_charge: { title: 'KFS station in-charge' },
  county_ecosystem_conservator: { title: 'Ecosystem Conservator, {county} County' },
  kfs_commandant: { title: 'KFS Commandant (headquarters)' },
}

// Role titles used to address tasks. Never a person.
const ROLES = {
  zoneManager: 'Zone Manager',
  blockSupervisor: 'Block Supervisor',
  surveyOfficer: 'GIS / Survey Officer',
  unitHead: 'Unit Head, Buffer Zones & Protected Forest',
}

/** Sample plots from the sector map, with the illustrative zone assignment. The schematic ring is deliberately left out. */
const PLOTS = EUDR.plots.map((p) => ({
  id: p.id,
  centre: p.centre,
  lat: p.lat,
  lon: p.lon,
  hectares: p.hectares,
  status: p.status,
  zoneId: PLOT_ZONE[p.id],
}))
const PLOT = Object.fromEntries(PLOTS.map((p) => [p.id, p]))

// Boundary segments. Lengths are illustrative allocations that sum per zone to
// the derived belt lengths. Beacon totals are 4 per km and sign totals 1 per km
// (a planning assumption).
const SEGMENT_ROWS = [
  ['MAU-OLE', 1, 'Kiptunga NW', 9.0, 300, 0.91, 0.94, 36, 36, 8, 9],
  ['MAU-OLE', 2, 'Nessuit spur', 14.0, 1200, 0.83, 0.92, 53, 56, 11, 14],
  ['MAU-OLE', 3, 'Olenguruone south', 17.8, 1050, 0.88, 0.92, 70, 71, 15, 18],
  ['MAU-NYA', 1, 'Mariashoni S', 9.5, 250, 0.87, 0.92, 38, 38, 8, 10],
  ['MAU-NYA', 2, 'Nyangores north', 9.0, 400, 0.86, 0.9, 36, 36, 6, 9],
  ['MAU-NYA', 3, 'Nyangores east', 9.4, 900, 0.81, 0.9, 36, 38, 6, 9],
  ['MAU-KER', 1, 'Tinet edge', 12.0, 2000, 0.75, 0.88, 41, 48, 9, 12],
  ['MAU-KER', 2, 'Kericho east', 12.0, 450, 0.85, 0.92, 48, 48, 10, 12],
  ['MAU-KER', 3, 'Kericho south', 12.6, 400, 0.87, 0.91, 50, 50, 10, 13],
  ['MAU-KUR', 1, 'Kuresoi north', 8.0, 550, 0.92, 0.92, 32, 32, 6, 8],
  ['MAU-KUR', 2, 'Likia edge', 8.0, 900, 0.92, 0.92, 31, 32, 5, 8],
  ['MAU-KUR', 3, 'Kuresoi south', 8.0, 350, 0.91, 0.91, 32, 32, 6, 8],
]

const SEGMENTS = SEGMENT_ROWS.map(
  ([zoneId, n, name, lengthKm, markerGapM, canopyNow, canopyRef, beaconsPresent, beaconsTotal, signsPresent, signsTotal]) => ({
    segmentId: makeSegmentId(zoneCode(zoneId), n),
    zoneId,
    name,
    lengthKm,
    markerGapM,
    canopyNow,
    canopyRef,
    beaconsPresent,
    beaconsTotal,
    signsPresent,
    signsTotal,
  }),
)
const SEGMENT = Object.fromEntries(SEGMENTS.map((s) => [s.segmentId, s]))
const seg = (zone, n) => makeSegmentId(zoneCode(zone), n)

export const REF = deepFreeze({
  zones: ZONES,
  belts: BELTS,
  segments: SEGMENTS,
  plots: PLOTS,
  mixes: MIXES,
  ladder: LADDER,
  sentinel: SENTINEL,
  roles: ROLES,
  regions: REGION_IDS.map((regionId) => ({ regionId, label: REGION_LABEL[regionId], beltKm: REGION_BELT_KM[regionId] })),
  // The source's own figures and oddities, kept visible on the Hub rather than reconciled.
  structure: {
    source: STRUCTURE_SOURCE,
    zoneTotals: ZONE_TOTALS,
    beltTotals: BELT_TOTALS,
    mauReconciliation: MAU_RECONCILIATION,
  },
})

// ── Claims ──────────────────────────────────────────────────────────────────
// Work date is the reported date minus one day unless stated. GPS is the plot
// centroid moved by the offset along bearing (claim number × 47) mod 360. Photo
// i of n is captured oldest × (1 − i/(n−1)) hours before submission (one photo:
// `oldest` hours) and sits farthest × i/(n−1) m from the claim GPS along
// bearing + 90° (one photo: `farthest` m).

function buildClaim(spec) {
  const plot = PLOT[spec.plot]
  const bearing = (spec.n * 47) % 360
  const reportedAt = eat(spec.reported)
  const reportedMs = msOf(reportedAt)
  const point = spec.gps ? destination(plot, bearing, spec.gps[0]) : null
  const [photoCount, oldestH, farthestM] = spec.photos
  const photos = point
    ? Array.from({ length: photoCount }, (_, i) => {
        const hoursBefore = photoCount === 1 ? oldestH : oldestH * (1 - i / (photoCount - 1))
        const distance = photoCount === 1 ? farthestM : (farthestM * i) / (photoCount - 1)
        const where = destination(point, (bearing + 90) % 360, distance)
        return { capturedAt: isoOf(reportedMs - hoursBefore * HOUR_MS), lat: where.lat, lon: where.lon }
      })
    : []
  const decision = spec.decision
    ? {
        outcome: spec.decision.outcome,
        reason: spec.decision.reason ?? null,
        note: spec.decision.note,
        justification: null,
        decidedAt: spec.decision.at,
        decidedBy: 'CON-SR-01',
        countersign: spec.decision.countersign ?? null,
      }
    : null
  return {
    claimId: makeClaimId(spec.n),
    legacyRef: spec.legacy ? spec.legacy[0] : null,
    legacyPlotId: spec.legacy ? spec.legacy[1] : null,
    type: spec.type,
    plotId: spec.plot,
    zoneId: plot.zoneId,
    reportedBy: spec.by,
    reportedAt,
    stage: spec.stage,
    work: {
      workDate: spec.worked ?? addDaysKey(spec.reported, -1),
      trees: spec.trees ?? null,
      areaHa: spec.areaHa ?? null,
      lengthM: spec.lengthM ?? null,
      structures: spec.structures ?? null,
      spacingM: spec.spacingM ?? null,
      mixId: spec.mix ?? null,
      description: spec.desc,
    },
    evidence: point ? { gps: { lat: point.lat, lon: point.lon, accuracyM: spec.gps[1] }, photos } : { gps: null, photos },
    satellite: spec.sat
      ? { ndviBefore: spec.sat[0], ndviAfter: spec.sat[1], cloudFraction: spec.sat[2], passDate: spec.sat[3] }
      : null,
    evidenceRequest: spec.request ?? null,
    resubmittedAt: null,
    decision,
    arrivesAt: null,
  }
}

// Older verified plantings that anchor the survival checks: unflagged, four
// photos (oldest 4 h, farthest 30 m), GPS offset 30 m at 7 m accuracy, no
// spacing recorded, decided at 10:00 on the verified date.
const VERIFIED_NOTE = 'Verified against field visit and photos.'
const OLDER = [
  // n, plot, worked, reported, verified, trees, ha, mix, satellite [before, after, pass], reporter
  [122, 'SUR-07', '2026-03-10', '2026-03-12', '2026-03-24', 1400, 1.8, 'MIX-INDIG', [0.4, 0.42, '2026-03-23'], 'RVT-1042'],
  [124, 'LIK-16', '2026-03-14', '2026-03-16', '2026-03-27', 700, 1.0, 'MIX-FUEL', [0.4, 0.42, '2026-03-23'], 'RVT-1190'],
  [128, 'KIP-01', '2026-07-08', '2026-07-10', '2026-07-20', 900, 1.0, 'MIX-INDIG', [0.4, 0.42, '2026-07-16'], 'RVT-0723'],
  [130, 'TER-14', '2026-07-16', '2026-07-18', '2026-07-29', 1500, 2.5, 'MIX-BLEND', [0.4, 0.42, '2026-07-26'], 'RVT-1077'],
  [131, 'KIP-17', '2026-07-17', '2026-07-19', '2026-07-24', 103, 0.2, 'MIX-INDIG', [0.4, 0.48, '2026-07-21'], 'RVT-1421'],
  [133, 'NES-18', '2026-07-22', '2026-07-24', '2026-08-04', 800, 1.5, 'MIX-BLEND', [0.4, 0.42, '2026-07-31'], 'RVT-0634'],
].map(([n, plot, worked, reported, verified, trees, areaHa, mix, sat, by]) =>
  buildClaim({
    n,
    type: 'tree_planting',
    plot,
    worked,
    reported,
    stage: 'verified',
    by,
    trees,
    areaHa,
    mix,
    gps: [30, 7],
    photos: [4, 4, 30],
    sat: [sat[0], sat[1], 0.05, sat[2]],
    desc: 'Block planting on the plot, verified in an earlier period.',
    decision: { outcome: 'verified', note: VERIFIED_NOTE, at: eat(verified, '10:00') },
  }),
)

const CURRENT = [
  {
    n: 135,
    legacy: ['VC-2042', 'NES-BLK-06'],
    type: 'tree_planting',
    plot: 'NES-10',
    reported: '2026-08-26',
    worked: '2026-06-24',
    stage: 'verified',
    by: 'RVT-1421',
    trees: 2100,
    areaHa: 3.1,
    mix: 'MIX-INDIG',
    gps: [35, 7],
    photos: [8, 5, 30],
    sat: [0.38, 0.5, 0.04, '2026-08-25'],
    desc: 'Block-scale replanting of three retired plucking plots handed back under the buffer covenant.',
    decision: {
      outcome: 'verified',
      note: 'Survival count 92% at 60 days. Satellite cross-check shows a +0.12 NDVI step over two quarters against the plot baseline. Verified.',
      at: eat('2026-08-31', '10:00'),
      countersign: { by: 'UNIT-HEAD', at: eat('2026-09-01', '09:00') },
    },
  },
  {
    n: 136,
    legacy: ['VC-2043', 'TIN-BLK-09'],
    type: 'erosion_control',
    plot: 'TIN-04',
    reported: '2026-08-28',
    stage: 'rejected',
    by: 'RVT-0459',
    structures: 8,
    gps: null,
    photos: [0, 0, 0],
    sat: null,
    desc: 'Check-dams reported along the western drainage line.',
    decision: {
      outcome: 'rejected',
      reason: 'no_structures_found',
      note: 'No structures found at the reported location on the 2026-08-31 visit and no GPS track or photos attached. Returned to the centre for resubmission with evidence.',
      at: eat('2026-08-31', '12:00'),
    },
  },
  {
    n: 137,
    legacy: ['VC-2044', 'KPT-BLK-02'],
    type: 'buffer_maintenance',
    plot: 'KIP-01',
    reported: '2026-08-30',
    stage: 'verified',
    by: 'RVT-1077',
    lengthM: 1200,
    areaHa: 0.3,
    gps: [25, 6],
    photos: [6, 4, 25],
    sat: [0.62, 0.68, 0.05, '2026-08-30'],
    desc: 'Routine covenant patrol. One 0.3 ha incursion cleared and replanted; camera traps serviced.',
    decision: {
      outcome: 'verified',
      note: 'Field visit 2026-09-01. Cleared area matches the reported polygon; replanting stocked and mulched. NDVI recovery consistent with the covenant trend. Approved for the Q3 covenant tranche.',
      at: eat('2026-09-01', '12:00'),
    },
  },
  {
    n: 138,
    legacy: ['VC-2041', 'MAR-BLK-04'],
    type: 'buffer_maintenance',
    plot: 'MAR-03',
    reported: '2026-09-02',
    stage: 'satellite_checked',
    by: 'RVT-0634',
    lengthM: 600,
    areaHa: 1.0,
    gps: [55, 9],
    photos: [2, 71, 40],
    sat: [0.55, 0.54, 0.34, '2026-09-09'],
    desc: 'Fence maintenance and undergrowth clearing on the southern covenant boundary.',
  },
  {
    n: 139,
    legacy: ['VC-2045', 'TIN-BLK-05'],
    type: 'tree_planting',
    plot: 'TIN-12',
    reported: '2026-09-03',
    worked: '2026-09-01',
    stage: 'reported',
    by: 'RVT-0912',
    trees: 600,
    areaHa: 0.9,
    mix: 'MIX-INDIG',
    gps: [20, 12],
    photos: [1, 2, 20],
    sat: null,
    desc: 'Enrichment planting inside the standing buffer strip. Awaiting a field visit to confirm species mix and survival.',
  },
  {
    n: 140,
    legacy: ['VC-2046', 'MAR-BLK-11'],
    type: 'erosion_control',
    plot: 'MAR-11',
    reported: '2026-09-04',
    stage: 'evidence_attached',
    by: 'RVT-0723',
    structures: 14,
    lengthM: 320,
    gps: [15, 6],
    photos: [4, 3, 30],
    sat: null,
    desc: 'Gully head cutting toward a plucking block after the August storms. Brush check-dams and stone-faced bunds installed along the contour.',
  },
  {
    n: 141,
    legacy: ['VC-2047', 'NES-BLK-03'],
    type: 'buffer_maintenance',
    plot: 'NES-02',
    reported: '2026-09-05',
    stage: 'evidence_attached',
    by: 'RVT-1190',
    lengthM: 900,
    areaHa: 0.6,
    gps: [30, 6],
    photos: [5, 4, 40],
    sat: null,
    desc: 'Boundary live-fence gapped by livestock pressure on the eastern edge. Re-staked and inter-planted with Kei apple.',
  },
  {
    n: 142,
    legacy: ['VC-2048', 'KPT-BLK-07'],
    type: 'tree_planting',
    plot: 'KIP-09',
    reported: '2026-09-06',
    worked: '2026-09-02',
    stage: 'satellite_checked',
    by: 'RVT-1042',
    trees: 1800,
    areaHa: 2.4,
    spacingM: 2,
    mix: 'MIX-INDIG',
    gps: [40, 8],
    photos: [3, 6, 25],
    sat: [0.41, 0.52, 0.04, '2026-09-09'],
    desc: 'Replanting on the NW spur retired last season. Seedlings raised at the Nessuit nursery, planted at 2×2 m spacing after the first rains.',
  },
  {
    n: 143,
    type: 'tree_planting',
    plot: 'KIL-05',
    reported: '2026-09-08',
    worked: '2026-09-07',
    stage: 'evidence_attached',
    by: 'RVT-1355',
    trees: 1000,
    areaHa: 2.0,
    spacingM: 4,
    mix: 'MIX-BLEND',
    gps: [30, 7],
    photos: [4, 5, 35],
    sat: null,
    desc: 'Enrichment planting along the standing buffer strip, 1,000 seedlings at 4 m spacing.',
  },
  {
    n: 144,
    type: 'tree_planting',
    plot: 'SUR-07',
    reported: '2026-09-09',
    worked: '2026-09-08',
    stage: 'satellite_checked',
    by: 'RVT-1508',
    trees: 9000,
    areaHa: 1.8,
    mix: 'MIX-INDIG',
    gps: [45, 9],
    photos: [3, 8, 30],
    sat: [0.47, 0.48, 0.04, '2026-09-09'],
    desc: 'Replanting of gaps on the plot.',
  },
  {
    n: 145,
    type: 'tree_planting',
    plot: 'TIN-04',
    reported: '2026-09-10',
    worked: '2026-09-09',
    stage: 'satellite_checked',
    by: 'RVT-0887',
    trees: 1650,
    areaHa: 3.0,
    spacingM: 4,
    mix: 'MIX-BLEND',
    gps: [35, 7],
    photos: [4, 5, 35],
    sat: [0.52, 0.46, 0.041, '2026-09-14'],
    desc: 'Block planting of 1,650 seedlings at 4 m spacing.',
  },
  {
    n: 146,
    type: 'erosion_control',
    plot: 'SUR-15',
    reported: '2026-09-11',
    worked: '2026-09-10',
    stage: 'evidence_attached',
    by: 'RVT-1263',
    structures: 22,
    gps: [50, 41],
    photos: [4, 6, 45],
    sat: null,
    desc: '22 brush check-dams across a gully head.',
    request: {
      kind: 'gps_retake',
      note: 'GPS accuracy 41 m. Please re-take the position at the structures.',
      requestedAt: eat('2026-09-12'),
    },
  },
  {
    n: 147,
    type: 'tree_planting',
    plot: 'KIL-05',
    reported: '2026-09-12',
    worked: '2026-09-11',
    stage: 'reported',
    by: 'RVT-1355',
    trees: 1000,
    areaHa: 2.0,
    spacingM: 4,
    mix: 'MIX-BLEND',
    gps: [30, 7],
    photos: [4, 5, 35],
    sat: null,
    desc: 'Enrichment planting along the standing buffer strip, 1,000 seedlings at 4 m spacing.',
  },
  {
    n: 148,
    type: 'invasive_removal',
    plot: 'LIK-08',
    reported: '2026-09-14',
    worked: '2026-09-13',
    stage: 'evidence_attached',
    by: 'RVT-0501',
    areaHa: 1.5,
    gps: [210, 8],
    photos: [3, 5, 60],
    sat: null,
    desc: 'Lantana camara cleared along the belt edge.',
  },
].map(buildClaim)

const CLAIMS = [...OLDER, ...CURRENT]

// ── Survival checks ─────────────────────────────────────────────────────────
// Sample size 50 throughout. SVC-2026-00731 is the count the Admin audit log
// records at 16 Sep 09:14, so it appears only once the demo clock passes it.

const check = (seq, claimN, checkpointDays, checkedAt, alive, submittedBy, arrivesAt = null) => ({
  checkId: makeSurvivalId(2026, seq),
  claimId: makeClaimId(claimN),
  checkpointDays,
  checkedAt,
  sampleSize: POLICY.survival.sampleSize,
  alive,
  submittedBy,
  review: null,
  arrivesAt,
})

const SURVIVAL_CHECKS = [
  check(610, 122, 60, eat('2026-05-09'), 46, 'SUP-SUR-01'),
  check(688, 135, 60, eat('2026-08-23'), 46, 'SUP-NES-01'),
  check(702, 122, 180, eat('2026-09-05'), 34, 'SUP-SUR-01'),
  check(709, 124, 180, eat('2026-09-09'), 38, 'SUP-LIK-01'),
  check(724, 130, 60, eat('2026-09-14'), 44, 'SUP-TER-01'),
  check(731, 131, 60, eat('2026-09-16', '09:14'), 43, 'SUP-KIP-02', eat('2026-09-16', '09:14')),
]

// ── Incidents ───────────────────────────────────────────────────────────────
// GPS = the anchor plot's centroid moved by the offset along the bearing. No
// incident carries a person's name or an identifier.

const ACK_SMS = 'sms'

function incident(spec) {
  const plot = PLOT[spec.anchor[0]]
  const where = destination(plot, spec.anchor[2], spec.anchor[1])
  const segment = SEGMENT[spec.segment]
  return {
    incidentId: makeIncidentId(2026, spec.n),
    type: spec.type,
    zoneId: segment.zoneId,
    segmentId: spec.segment,
    plotId: spec.anchor[0],
    lat: where.lat,
    lon: where.lon,
    firstReportedAt: eat(spec.first[0], spec.first[1]),
    reports: spec.reports.map(([channel, date, time]) => ({ at: eat(date, time), channel })),
    estAreaHa: spec.areaHa ?? null,
    status: spec.status,
    escalations: (spec.sent ?? []).map(([date, time, ack]) => ({
      rung: 'station_in_charge',
      channel: 'sms',
      sentAt: eat(date, time),
      ackAt: ack ? eat(ack[0], ack[1]) : null,
      ackChannel: ack ? ACK_SMS : null,
      ackNote: ack ? ack[2] : null,
    })),
    sourceRefs: spec.refs ?? [],
    kfsRef: null,
    note: null,
    outcome: spec.outcome
      ? {
          kind: spec.outcome.kind,
          areaAffectedHa: spec.outcome.areaHa ?? null,
          note: spec.outcome.note,
          closedAt: eat(spec.outcome.at[0], spec.outcome.at[1]),
        }
      : null,
  }
}

const INCIDENTS = [
  incident({
    n: 187, type: 'fire', segment: seg('MAU-OLE', 1), anchor: ['KIP-17', 450, 0],
    first: ['2026-09-16', '06:52'],
    reports: [['app', '2026-09-16', '06:52'], ['app', '2026-09-16', '06:55'], ['ussd', '2026-09-16', '06:56']],
    areaHa: 2, status: 'escalated', sent: [['2026-09-16', '06:58', null]], refs: ['PR-0231'],
  }),
  incident({
    n: 186, type: 'illegal_logging', segment: seg('MAU-KER', 1), anchor: ['TIN-04', 150, 45],
    first: ['2026-09-15', '16:20'],
    reports: [['app', '2026-09-15', '16:20'], ['app', '2026-09-15', '16:31']],
    status: 'responding', sent: [['2026-09-15', '17:05', ['2026-09-15', '17:40', 'Ranger team dispatched']]],
  }),
  incident({
    n: 185, type: 'charcoal', segment: seg('MAU-OLE', 3), anchor: ['NES-10', 600, 180],
    first: ['2026-09-14', '06:10'],
    reports: [['patrol', '2026-09-14', '06:10']],
    status: 'controlled', sent: [['2026-09-14', '07:30', ['2026-09-14', '10:15', 'Kilns dismantled']]],
  }),
  incident({
    n: 184, type: 'illegal_grazing', segment: seg('MAU-NYA', 3), anchor: ['SUR-15', 300, 90],
    first: ['2026-09-13', '09:00'],
    reports: [['ussd', '2026-09-13', '09:00']],
    status: 'triaged',
  }),
  incident({
    n: 183, type: 'beacon_or_fence_damage', segment: seg('MAU-KER', 3), anchor: ['KIL-13', 250, 270],
    first: ['2026-09-15', '10:00'],
    reports: [['app', '2026-09-15', '10:00']],
    status: 'triaged',
  }),
  incident({
    n: 182, type: 'encroachment', segment: seg('MAU-KER', 1), anchor: ['TIN-04', 320, 60],
    first: ['2026-09-06', '04:12'],
    reports: [['satellite', '2026-09-06', '04:12'], ['patrol', '2026-09-06', '08:30']],
    areaHa: 0.4, status: 'responding',
    sent: [['2026-09-06', '14:00', ['2026-09-07', '09:00', 'Ranger dispatched']]],
    refs: ['ALERT-2291', 'BM-318'],
  }),
  incident({
    n: 181, type: 'fire', segment: seg('MAU-KER', 2), anchor: ['TER-14', 200, 135],
    first: ['2026-08-30', '13:40'],
    reports: [['app', '2026-08-30', '13:40'], ['app', '2026-08-30', '13:46']],
    areaHa: 0.6, status: 'closed',
    sent: [['2026-08-30', '13:52', ['2026-08-30', '14:04', 'Fire crew on site']]],
    outcome: {
      kind: 'resolved', areaHa: 0.6, at: ['2026-08-31', '10:00'],
      note: 'Fire contained by the crew; 0.6 ha burnt and the boundary fence left intact.',
    },
  }),
  incident({
    n: 180, type: 'illegal_logging', segment: seg('MAU-OLE', 2), anchor: ['NES-02', 180, 300],
    first: ['2026-08-27', '09:30'],
    reports: [['app', '2026-08-27', '09:30']],
    status: 'closed',
    sent: [['2026-08-27', '10:20', ['2026-08-27', '12:00', 'Authorised thinning']]],
    outcome: {
      kind: 'false_alarm', at: ['2026-08-27', '14:00'],
      note: 'KFS confirmed the felling was authorised thinning. No offence.',
    },
  }),
  incident({
    n: 179, type: 'encroachment', segment: seg('MAU-NYA', 2), anchor: ['MAR-03', 220, 20],
    first: ['2026-08-22', '11:00'],
    reports: [['app', '2026-08-22', '11:00']],
    areaHa: 0.2, status: 'closed',
    sent: [['2026-08-22', '15:30', ['2026-08-23', '08:30', 'Community meeting held']]],
    outcome: {
      kind: 'resolved', areaHa: 0.2, at: ['2026-08-25', '11:00'],
      note: 'Strip vacated after the community meeting and the boundary marked again.',
    },
  }),
]

// ── Satellite change alerts ─────────────────────────────────────────────────
// The first three ids and their legacy figures come from the sector's
// encroachment alerts. The two alerts outside the region have no coordinates,
// pass or NDVI figures; they exist to prove the scope filter.

function alertRow(spec) {
  const point = spec.anchor ? destination(PLOT[spec.anchor[0]], spec.anchor[2], spec.anchor[1]) : null
  return {
    alertId: makeAlertId(spec.n),
    regionId: spec.region,
    zoneId: spec.zone ?? null,
    segmentId: spec.segment ?? null,
    plotId: spec.plot ?? null,
    lat: point ? point.lat : null,
    lon: point ? point.lon : null,
    detectedAt: eat(spec.detected[0], spec.detected[1]),
    passDate: spec.pass ?? null,
    areaHa: spec.areaHa,
    distanceM: spec.distanceM,
    ndviDrop: spec.drop ?? null,
    cloudFraction: spec.cloud ?? null,
    status: spec.status,
    incidentId: spec.incident ?? null,
    dismissal: null,
  }
}

const ALERTS = [
  alertRow({ n: 2280, region: 'north_rift', detected: ['2026-08-30', '11:07'], areaHa: 0.7, distanceM: 190, status: 'resolved' }),
  alertRow({ n: 2288, region: 'eastern', detected: ['2026-09-04', '22:41'], areaHa: 0.2, distanceM: 460, status: 'under_review' }),
  alertRow({
    n: 2291, region: 'south_rift', zone: 'MAU-KER', segment: seg('MAU-KER', 1), plot: 'TIN-04',
    anchor: ['TIN-04', 320, 60], detected: ['2026-09-06', '04:12'], pass: '2026-09-04',
    areaHa: 0.4, distanceM: 320, drop: 0.21, cloud: 0.05, status: 'confirmed', incident: makeIncidentId(2026, 182),
  }),
  alertRow({
    n: 2292, region: 'south_rift', zone: 'MAU-KER', segment: seg('MAU-KER', 2),
    anchor: ['TER-14', 200, 135], detected: ['2026-09-11', '05:30'], pass: '2026-09-09',
    areaHa: 0.5, distanceM: 410, drop: 0.16, cloud: 0.09, status: 'under_review',
  }),
  alertRow({
    n: 2294, region: 'south_rift', zone: 'MAU-NYA', segment: seg('MAU-NYA', 3),
    anchor: ['SUR-15', 300, 90], detected: ['2026-09-16', '01:10'], pass: '2026-09-14',
    areaHa: 0.3, distanceM: 250, drop: 0.18, cloud: 0.041, status: 'new',
  }),
  alertRow({
    n: 2295, region: 'south_rift', zone: 'MAU-KUR', segment: seg('MAU-KUR', 2),
    anchor: ['LIK-08', 400, 200], detected: ['2026-09-16', '01:10'], pass: '2026-09-14',
    areaHa: 0.15, distanceM: 480, drop: 0.19, cloud: 0.041, status: 'new',
  }),
]

// ── Tasks ───────────────────────────────────────────────────────────────────
// Assignees are role titles, never a person. No replanting order exists in the
// seed on purpose: SVC-2026-00702 (SUR-07, fail) has none, so it stays on the
// Hub until the officer issues one.

const task = (n, type, where, linkedRef, assigneeRole, dueOn, status, quantity, note, extra = {}) => ({
  taskId: makeTaskId(n),
  type,
  segmentId: where.segment ?? null,
  zoneId: where.zone ?? (where.segment ? SEGMENT[where.segment].zoneId : null),
  plotId: where.plot ?? null,
  linkedRef,
  assigneeRole,
  dueOn,
  status,
  blockedReason: extra.blockedReason ?? null,
  quantity,
  note,
  logRef: extra.logRef ?? null,
})

const TASKS = [
  task(1, 'firebreak_clearing', { segment: seg('MAU-OLE', 1) }, 'INC-2026-0187', 'Zone Manager, Olenguruone', '2026-09-19', 'planned', null, 'Post-fire break on the north edge'),
  task(2, 'fence_repair', { segment: seg('MAU-KER', 1) }, 'INC-2026-0182', 'Block Supervisor, Tinet', '2026-09-18', 'in_progress', 400, 'Re-stake and close the cleared gap'),
  task(3, 'field_check', { zone: 'MAU-KER', plot: 'TIN-12' }, 'VER-0139', 'Zone Manager, Kericho', '2026-09-18', 'planned', null, 'Field verification for the 600-tree planting'),
  task(4, 'fence_repair', { segment: seg('MAU-KER', 3) }, 'INC-2026-0183', 'Block Supervisor, Kericho', '2026-09-21', 'planned', 60, 'Repair the damaged section reported on the fence line'),
  task(5, 'beacon_replacement', { segment: seg('MAU-KER', 1) }, null, 'Zone Manager, Kericho', '2026-09-30', 'planned', 7, 'Replace 7 missing beacons (41 of 48 in place)'),
  task(6, 'signage', { segment: seg('MAU-NYA', 3) }, null, 'Block Supervisor, Nyangores', '2026-09-30', 'planned', 3, 'Replace 3 missing signs (6 of 9 in place)'),
  task(7, 'invasive_clearing', { segment: seg('MAU-KUR', 2) }, null, 'Zone Manager, Kuresoi', '2026-09-25', 'blocked', 1.5, 'Clear the invasive stand along the belt edge', { blockedReason: 'Waiting for equipment (brush cutters)' }),
  task(8, 'fence_repair', { segment: seg('MAU-OLE', 1) }, 'BM-316', 'Block Supervisor, Kiptunga', '2026-09-02', 'done', 800, 'Live-fence maintenance on the NW boundary', { logRef: 'BM-316' }),
  task(9, 'planting', { segment: seg('MAU-OLE', 2) }, 'BM-317', 'Block Supervisor, Nessuit', '2026-09-04', 'done', 1200, 'Indigenous seedlings on the retired plots', { logRef: 'BM-317' }),
  task(10, 'boundary_survey_request', { segment: seg('MAU-KER', 1) }, 'INC-2026-0182', 'GIS / Survey Officer', '2026-10-15', 'planned', null, 'Re-survey the beacons after the cleared area'),
]

// ── Patrol and maintenance log (BM-) ────────────────────────────────────────
// The four legacy entries keep their number, date and note and are attached to
// segments. The rest are generated so each segment's newest `patrol` entry is
// the last patrol below and every segment has at least two entries. Numbering:
// generated entries dated before 30 Aug take numbers below 315 in date order
// (the last is BM-314); every other generated entry takes 319 upward in date
// order. So numbers do not rise strictly with date across the whole log.

const LEGACY_LOG = [
  { n: 315, segment: seg('MAU-NYA', 1), on: '2026-08-30', kind: 'patrol', note: 'Mariashoni — no incursion, camera traps serviced' },
  { n: 316, segment: seg('MAU-OLE', 1), on: '2026-09-02', kind: 'fence', note: 'Kiptunga NW boundary — 800 m live-fence maintenance' },
  { n: 317, segment: seg('MAU-OLE', 2), on: '2026-09-04', kind: 'planting', note: 'Nessuit spur — 1,200 indigenous seedlings, retired plots' },
  { n: 318, segment: seg('MAU-KER', 1), on: '2026-09-06', kind: 'patrol', note: 'Tinet edge — cleared 0.4 ha flagged, ranger dispatched' },
]

const PATROL_NOTES = [
  'routine boundary walk, no incursion',
  'boundary walk with the block supervisor, beacons checked',
  'fence line walked, no gaps found',
  'walked the belt edge, no fresh cutting',
  'joint patrol with the guard, markers in place',
]

// [segment, date, kind, note override] — the generated entries (the legacy four are separate).
const GENERATED_LOG = [
  [seg('MAU-OLE', 1), '2026-09-05', 'patrol'],
  [seg('MAU-OLE', 1), '2026-09-12', 'patrol'],
  [seg('MAU-OLE', 2), '2026-08-25', 'patrol'],
  [seg('MAU-OLE', 2), '2026-09-08', 'patrol'],
  [seg('MAU-OLE', 3), '2026-09-07', 'patrol'],
  [seg('MAU-OLE', 3), '2026-09-14', 'patrol'],
  [seg('MAU-NYA', 1), '2026-08-17', 'patrol'],
  [seg('MAU-NYA', 2), '2026-08-27', 'planting', 'Nyangores north — 300 indigenous seedlings in boundary gaps'],
  [seg('MAU-NYA', 2), '2026-09-10', 'patrol'],
  [seg('MAU-NYA', 3), '2026-08-19', 'patrol'],
  [seg('MAU-NYA', 3), '2026-09-02', 'patrol'],
  [seg('MAU-KER', 1), '2026-08-30', 'patrol'],
  [seg('MAU-KER', 2), '2026-08-26', 'patrol'],
  [seg('MAU-KER', 2), '2026-09-09', 'patrol'],
  [seg('MAU-KER', 3), '2026-08-17', 'patrol'],
  [seg('MAU-KER', 3), '2026-08-29', 'patrol'],
  [seg('MAU-KUR', 1), '2026-08-28', 'fence', 'Kuresoi north — 200 m live-fence maintenance'],
  [seg('MAU-KUR', 1), '2026-09-11', 'patrol'],
  [seg('MAU-KUR', 2), '2026-08-18', 'patrol'],
  [seg('MAU-KUR', 2), '2026-09-01', 'patrol'],
  [seg('MAU-KUR', 3), '2026-08-30', 'patrol'],
  [seg('MAU-KUR', 3), '2026-09-13', 'patrol'],
]

function generateLog() {
  const order = (segmentId) => SEGMENTS.findIndex((s) => s.segmentId === segmentId)
  const byDate = (a, b) => a[1].localeCompare(b[1]) || order(a[0]) - order(b[0])
  const early = GENERATED_LOG.filter((row) => row[1] < '2026-08-30').sort(byDate)
  const late = GENERATED_LOG.filter((row) => row[1] >= '2026-08-30').sort(byDate)
  const entry = (row, n, i) => ({
    logId: makeBufferLogId(n),
    segmentId: row[0],
    on: row[1],
    kind: row[2],
    note: row[3] ?? `${SEGMENT[row[0]].name} — ${PATROL_NOTES[i % PATROL_NOTES.length]}`,
    issues: [],
  })
  const firstEarly = 315 - early.length
  return [
    ...early.map((row, i) => entry(row, firstEarly + i, i)),
    ...late.map((row, i) => entry(row, 319 + i, early.length + i)),
  ]
}

const PATROL_LOGS = [
  ...LEGACY_LOG.map((row) => ({
    logId: makeBufferLogId(row.n),
    segmentId: row.segment,
    on: row.on,
    kind: row.kind,
    note: row.note,
    issues: [],
  })),
  ...generateLog(),
].sort((a, b) => b.on.localeCompare(a.on) || b.logId.localeCompare(a.logId))

const highestLog = Math.max(...PATROL_LOGS.map((l) => Number(l.logId.split('-')[1])))

// ── Exports and activity ────────────────────────────────────────────────────

// Kept in id order as given; the screens sort by generation time.
const EXPORTS = [
  { exportId: makeExportId(1), template: 'kfs_register', period: 'August 2026', rows: 3, generatedAt: eat('2026-09-02', '09:10'), hash: 'fnv1a:3fa9c2d1' },
  { exportId: makeExportId(2), template: 'jaza_miti', period: 'all time', rows: 26, generatedAt: eat('2026-09-10', '11:00'), hash: 'fnv1a:b7204e5a' },
  { exportId: makeExportId(3), template: 'monthly_return', period: 'August 2026', rows: 65, generatedAt: eat('2026-09-02', '09:20'), hash: 'fnv1a:0c6d81f3' },
]

// Copied from the Admin audit log; new entries chain from this row's check value.
const ACTIVITY = [
  {
    ref: makeAuditLogId(4408),
    when: '16 Sep 06:58',
    who: 'SUP-KIP-02',
    event: 'Incident escalated to KFS · fire',
    record: 'PR-0231',
    hash: 'a907…12d4',
    tone: 'critical',
  },
]

export const SEED_STATE = deepFreeze({
  claims: CLAIMS,
  incidents: INCIDENTS,
  alerts: ALERTS,
  survivalChecks: SURVIVAL_CHECKS,
  tasks: TASKS,
  patrolLogs: PATROL_LOGS,
  exports: EXPORTS,
  activity: ACTIVITY,
  // The next number per prefix.
  seq: { AL: 4413, INC: 188, MT: 11, EXP: 4, BM: highestLog + 1 },
})
