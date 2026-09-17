// Mock data for the NTZDC (zone development council) Operations view.
// Illustrative only.

import { toProblemReport, toVerificationClaim } from '../contracts/adapters'

export const NTZDC = {
  // Green-leaf moisture target band is 70–74%.
  moistureBand: { low: 70, high: 74 },
  centres: [
    { id: 'CC-KPT', name: 'Kiptunga', todayKg: 1840, targetKg: 2000, moisturePct: 71, lastIntake: '08:40', status: 'active' },
    { id: 'CC-NES', name: 'Nessuit', todayKg: 1210, targetKg: 1400, moisturePct: 73, lastIntake: '08:15', status: 'active' },
    { id: 'CC-MAR', name: 'Mariashoni', todayKg: 780, targetKg: 900, moisturePct: 69, lastIntake: '07:55', status: 'active' },
    { id: 'CC-TIN', name: 'Tinet', todayKg: 520, targetKg: 700, moisturePct: 75, lastIntake: '09:05', status: 'active' },
    { id: 'CC-KIL', name: 'Kilombe', todayKg: 0, targetKg: 600, moisturePct: 0, lastIntake: '—', status: 'pending' },
  ],

  // Per-farmer collection records for today — the QC grid. `reason` is null on
  // a clean delivery. Rejection rate is derived (rejectedKg / totalKg).
  rejectionReasons: ['Coarse Leaf', 'High Moisture', 'Foreign Matter', 'Late Window'],
  collectionRecords: [
    { farmerId: 'RVT-1042', centre: 'Kiptunga', totalKg: 48, acceptedKg: 47, reason: null },
    { farmerId: 'RVT-0887', centre: 'Tinet', totalKg: 52, acceptedKg: 41, reason: 'Coarse Leaf' },
    { farmerId: 'RVT-1190', centre: 'Nessuit', totalKg: 61, acceptedKg: 60, reason: null },
    { farmerId: 'RVT-0723', centre: 'Mariashoni', totalKg: 39, acceptedKg: 30, reason: 'High Moisture' },
    { farmerId: 'RVT-1355', centre: 'Kiptunga', totalKg: 44, acceptedKg: 43, reason: null },
    { farmerId: 'RVT-0459', centre: 'Tinet', totalKg: 57, acceptedKg: 44, reason: 'Coarse Leaf' },
    { farmerId: 'RVT-1508', centre: 'Nessuit', totalKg: 46, acceptedKg: 45, reason: null },
    { farmerId: 'RVT-0912', centre: 'Tinet', totalKg: 50, acceptedKg: 38, reason: 'Late Window' },
    { farmerId: 'RVT-1077', centre: 'Kiptunga', totalKg: 55, acceptedKg: 54, reason: null },
    { farmerId: 'RVT-0634', centre: 'Mariashoni', totalKg: 41, acceptedKg: 33, reason: 'Foreign Matter' },
    { farmerId: 'RVT-1421', centre: 'Nessuit', totalKg: 49, acceptedKg: 48, reason: null },
    { farmerId: 'RVT-0501', centre: 'Tinet', totalKg: 53, acceptedKg: 47, reason: 'High Moisture' },
    { farmerId: 'RVT-1263', centre: 'Kiptunga', totalKg: 47, acceptedKg: 46, reason: null },
    { farmerId: 'RVT-0788', centre: 'Mariashoni', totalKg: 43, acceptedKg: 42, reason: null },
  ],

  quality: {
    rejectionRatePct: 4.2,
    alertThresholdPct: 15,
    trendPct: [6.1, 5.7, 5.4, 5.0, 4.8, 4.5, 4.3, 4.2],
    byReason: [
      { reason: 'Coarse pluck (3+ leaf)', pct: 46 },
      { reason: 'Moisture over 76%', pct: 28 },
      { reason: 'Foreign matter', pct: 16 },
      { reason: 'Late delivery window', pct: 10 },
    ],
    byCentre: [
      { centre: 'Kiptunga', ratePct: 3.1 },
      { centre: 'Nessuit', ratePct: 3.8 },
      { centre: 'Mariashoni', ratePct: 4.6 },
      { centre: 'Tinet', ratePct: 6.2 },
    ],
  },

  pricing: {
    // Base green-leaf rate is operator-editable (tracks the Mombasa auction
    // clearing price); the premiums stack on top of it.
    baseRateKes: 210,
    baseRateMin: 150,
    baseRateMax: 280,
    components: [
      { key: 'quality', label: 'Quality Premium', kes: 3, min: 0, max: 10 },
      { key: 'conservation', label: 'Conservation Premium', kes: 14, min: 0, max: 25 },
      { key: 'settlement', label: 'Prompt-settlement uplift', kes: 1.4, min: 0, max: 4 },
    ],
    lastPublished: '2026-08-30',
  },

  training: {
    trainedYtd: 2140,
    sessions: [
      { id: 'TR-092', topic: 'Fine plucking standard', centre: 'Tinet', date: '2026-09-09', enrolled: 38, capacity: 40, status: 'upcoming' },
      { id: 'TR-091', topic: 'Moisture handling & shade drying', centre: 'Mariashoni', date: '2026-09-11', enrolled: 40, capacity: 40, status: 'full' },
      { id: 'TR-090', topic: 'Buffer covenant refresher', centre: 'Kiptunga', date: '2026-08-28', enrolled: 44, capacity: 45, status: 'completed' },
      { id: 'TR-089', topic: 'Mobile-money settlement onboarding', centre: 'Nessuit', date: '2026-08-21', enrolled: 31, capacity: 35, status: 'completed' },
    ],
  },

  // ── Verification Queue ────────────────────────────────────────────────
  // Conservation-claim pipeline. A claim advances Reported → Field verified →
  // Evidence attached → Satellite cross-check → Verified, or is Rejected at any
  // stage. `ndvi` is the plot-level cut of the same Sentinel-2 quarterly
  // composite the ESG "Satellite Recovery" module reads; `observations` is null
  // until the field officer files them.
  verification: {
    pipeline: ['Reported', 'Field verified', 'Evidence attached', 'Satellite cross-check', 'Verified'],
    verifiedThisWeek: 9,
    avgHoursToVerify: 34,
    claims: [
      {
        id: 'VC-2048',
        type: 'Tree planting',
        plotId: 'KPT-BLK-07',
        centre: 'Kiptunga',
        reportedDate: '2026-09-06',
        stage: 'Satellite cross-check',
        reportedBy: 'RVT-1042',
        officer: 'J. Kirui',
        quantity: '1,800 indigenous seedlings · 2.4 ha retired plots',
        note: 'Replanting on the NW spur retired last season. Seedlings raised at the Nessuit nursery, planted at 2×2 m spacing after the first rains.',
        ndvi: { baseline: 0.41, current: 0.52 },
        attachments: { photos: 3, gps: '-0.4192, 35.9310' },
        observations: null,
      },
      {
        id: 'VC-2047',
        type: 'Buffer maintenance',
        plotId: 'NES-BLK-03',
        centre: 'Nessuit',
        reportedDate: '2026-09-05',
        stage: 'Evidence attached',
        reportedBy: 'RVT-1190',
        officer: 'A. Cheruiyot',
        quantity: '900 m live-fence · 0.6 ha undergrowth cleared',
        note: 'Boundary live-fence gapped by livestock pressure on the eastern edge. Re-staked and inter-planted with Kei apple.',
        ndvi: { baseline: 0.58, current: 0.61 },
        attachments: { photos: 5, gps: '-0.3021, 35.8874' },
        observations: null,
      },
      {
        id: 'VC-2046',
        type: 'Erosion control',
        plotId: 'MAR-BLK-11',
        centre: 'Mariashoni',
        reportedDate: '2026-09-04',
        stage: 'Field verified',
        reportedBy: 'RVT-0723',
        officer: 'S. Langat',
        quantity: '14 check-dams · 320 m contour bunds',
        note: 'Gully head cutting toward a plucking block after the August storms. Brush check-dams and stone-faced bunds installed along the contour.',
        ndvi: { baseline: 0.44, current: 0.47 },
        attachments: { photos: 4, gps: '-0.3540, 35.7115' },
        observations: null,
      },
      {
        id: 'VC-2045',
        type: 'Tree planting',
        plotId: 'TIN-BLK-05',
        centre: 'Tinet',
        reportedDate: '2026-09-03',
        stage: 'Reported',
        reportedBy: 'RVT-0912',
        officer: null,
        quantity: '600 seedlings · 0.9 ha',
        note: 'Enrichment planting inside the standing buffer strip. Awaiting a field visit to confirm species mix and survival.',
        ndvi: { baseline: 0.49, current: 0.49 },
        attachments: { photos: 1, gps: '-0.4718, 35.6402' },
        observations: null,
      },
      {
        id: 'VC-2044',
        type: 'Buffer maintenance',
        plotId: 'KPT-BLK-02',
        centre: 'Kiptunga',
        reportedDate: '2026-08-30',
        stage: 'Verified',
        reportedBy: 'RVT-1077',
        officer: 'J. Kirui',
        quantity: '1,200 m boundary patrol · 0.3 ha encroachment cleared',
        note: 'Routine covenant patrol. One 0.3 ha incursion cleared and replanted; camera traps serviced.',
        ndvi: { baseline: 0.62, current: 0.68 },
        attachments: { photos: 6, gps: '-0.4090, 35.9221' },
        observations:
          'Field visit 2026-09-01. Cleared area matches the reported polygon; replanting stocked and mulched. NDVI recovery consistent with the covenant trend. Approved for the Q3 covenant tranche.',
      },
      {
        id: 'VC-2043',
        type: 'Erosion control',
        plotId: 'TIN-BLK-09',
        centre: 'Tinet',
        reportedDate: '2026-08-28',
        stage: 'Rejected',
        reportedBy: 'RVT-0459',
        officer: 'S. Langat',
        quantity: '8 check-dams claimed',
        note: 'Check-dams reported along the western drainage line.',
        ndvi: { baseline: 0.46, current: 0.45 },
        attachments: { photos: 0, gps: null },
        observations:
          'No structures found at the reported location on the 2026-08-31 visit and no GPS track or photos attached. Returned to the centre for resubmission with evidence.',
      },
      {
        id: 'VC-2042',
        type: 'Tree planting',
        plotId: 'NES-BLK-06',
        centre: 'Nessuit',
        reportedDate: '2026-08-26',
        stage: 'Verified',
        reportedBy: 'RVT-1421',
        officer: 'A. Cheruiyot',
        quantity: '2,100 seedlings · 3.1 ha retired plots',
        note: 'Block-scale replanting of three retired plucking plots handed back under the buffer covenant.',
        ndvi: { baseline: 0.38, current: 0.5 },
        attachments: { photos: 8, gps: '-0.2884, 35.8990' },
        observations:
          'Survival count 92% at 60 days. Satellite cross-check shows a +0.12 NDVI step over two quarters against the plot baseline. Verified.',
      },
      {
        id: 'VC-2041',
        type: 'Buffer maintenance',
        plotId: 'MAR-BLK-04',
        centre: 'Mariashoni',
        reportedDate: '2026-09-02',
        stage: 'Satellite cross-check',
        reportedBy: 'RVT-0634',
        officer: 'S. Langat',
        quantity: '600 m fence · 1.0 ha cleared',
        note: 'Fence maintenance and undergrowth clearing on the southern covenant boundary.',
        ndvi: { baseline: 0.55, current: 0.54 },
        attachments: { photos: 2, gps: '-0.3612, 35.7008' },
        observations: null,
        flagged: true,
      },
    ],
  },

  // ── Problem Reports ───────────────────────────────────────────────────
  // Farmer-raised field problems. Each report advances Received → Officer
  // notified → Field verification → Intervention → Outcome recorded; `overdue`
  // is set when it has missed its response window and is not yet closed.
  problems: {
    pipeline: ['Received', 'Officer notified', 'Field verification', 'Intervention', 'Outcome recorded'],
    avgResponseHours: 16,
    resolvedThisMonth: 23,
    reports: [
      { id: 'PR-3310', farmerId: 'RVT-0887', centre: 'Tinet', type: 'Pest', severity: 'High', status: 'Intervention', officer: 'S. Langat', reportedDate: '2026-09-06', overdue: false },
      { id: 'PR-3309', farmerId: 'RVT-1190', centre: 'Nessuit', type: 'Disease', severity: 'Critical', status: 'Field verification', officer: 'A. Cheruiyot', reportedDate: '2026-09-05', overdue: true },
      { id: 'PR-3308', farmerId: 'RVT-0723', centre: 'Mariashoni', type: 'Erosion', severity: 'Medium', status: 'Officer notified', officer: 'S. Langat', reportedDate: '2026-09-05', overdue: false },
      { id: 'PR-3307', farmerId: 'RVT-1042', centre: 'Kiptunga', type: 'Drought', severity: 'Medium', status: 'Received', officer: null, reportedDate: '2026-09-04', overdue: false },
      { id: 'PR-3306', farmerId: 'RVT-0459', centre: 'Tinet', type: 'Pest', severity: 'Low', status: 'Outcome recorded', officer: 'S. Langat', reportedDate: '2026-09-01', overdue: false },
      { id: 'PR-3305', farmerId: 'RVT-1355', centre: 'Kiptunga', type: 'Disease', severity: 'High', status: 'Intervention', officer: 'J. Kirui', reportedDate: '2026-08-31', overdue: false },
      { id: 'PR-3304', farmerId: 'RVT-0912', centre: 'Tinet', type: 'Erosion', severity: 'High', status: 'Field verification', officer: 'S. Langat', reportedDate: '2026-08-30', overdue: true },
      { id: 'PR-3303', farmerId: 'RVT-1508', centre: 'Nessuit', type: 'Drought', severity: 'Low', status: 'Outcome recorded', officer: 'A. Cheruiyot', reportedDate: '2026-08-28', overdue: false },
      { id: 'PR-3302', farmerId: 'RVT-0634', centre: 'Mariashoni', type: 'Pest', severity: 'Medium', status: 'Officer notified', officer: 'S. Langat', reportedDate: '2026-08-27', overdue: false },
      { id: 'PR-3301', farmerId: 'RVT-1263', centre: 'Kiptunga', type: 'Disease', severity: 'Critical', status: 'Outcome recorded', officer: 'J. Kirui', reportedDate: '2026-08-24', overdue: false },
      { id: 'PR-3300', farmerId: 'RVT-0788', centre: 'Mariashoni', type: 'Drought', severity: 'High', status: 'Intervention', officer: 'A. Cheruiyot', reportedDate: '2026-08-22', overdue: false },
    ],
  },

  buffer: {
    patrolsThisWeek: 11,
    seedlingsPlanted: 4200,
    boundaryIntegrityPct: 94,
    openIssues: 2,
    log: [
      { id: 'BM-318', date: '2026-09-06', type: 'Patrol', note: 'Tinet edge — cleared 0.4 ha flagged, ranger dispatched' },
      { id: 'BM-317', date: '2026-09-04', type: 'Planting', note: 'Nessuit spur — 1,200 indigenous seedlings, retired plots' },
      { id: 'BM-316', date: '2026-09-02', type: 'Fence', note: 'Kiptunga NW boundary — 800 m live-fence maintenance' },
      { id: 'BM-315', date: '2026-08-30', type: 'Patrol', note: 'Mariashoni — no incursion, camera traps serviced' },
    ],
  },
}

// ── API contract projections ────────────────────────────────────────────────
// The same records in the shape a real endpoint should return (see
// `lib/contracts/shapes.js`). The Verification Queue and Problem Reports
// modules consume the internal `NTZDC.*` shapes today; swapping to a live API is
// `const claims = (await api()).map(fromVerificationClaim)` at the import site.
export const verificationClaimsContract = NTZDC.verification.claims.map(toVerificationClaim)
export const problemReportsContract = NTZDC.problems.reports.map(toProblemReport)
