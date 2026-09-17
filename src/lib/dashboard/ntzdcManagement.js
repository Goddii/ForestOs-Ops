// Mock data for the NTZDC Management view — the org-wide roll-up across every
// operating zone, as opposed to the single-block NTZDC Operations view.
// Illustrative only; no real figures. Pay is KES per kg of green leaf: a
// zone-set base rate plus a quality premium and a conservation premium, all
// operator-tuned per zone — the spread between them is the disparity this view
// exists to surface.

import { toZoneComparisonRow } from '../contracts/adapters'

export const NTZDC_MANAGEMENT = {
  season: '2025/26',
  priorSeason: '2024/25',
  ndviQuarters: ['Q1·24', 'Q2·24', 'Q3·24', 'Q4·24', 'Q1·25', 'Q2·25', 'Q3·25', 'Q4·25', 'Q1·26'],
  zones: [
    {
      id: 'SWM',
      name: 'South West Mau',
      code: 'NTZDC-SWM',
      blocks: 5,
      farmers: 4120,
      intakeSeasonT: 5240,
      intakePriorT: 4880,
      rejectionRatePct: 4.2,
      bufferHa: 3180,
      boundaryIntegrityPct: 94,
      patrolsThisWeek: 11,
      trainingCoveragePct: 78,
      pay: { baseKesPerKg: 210, qualityPremiumKesPerKg: 3.0, conservationPremiumKesPerKg: 14.0 },
      ndviSeries: [0.55, 0.57, 0.56, 0.6, 0.63, 0.62, 0.66, 0.69, 0.71],
    },
    {
      id: 'EMAU',
      name: 'Eastern Mau',
      code: 'NTZDC-EMAU',
      blocks: 4,
      farmers: 3350,
      intakeSeasonT: 3980,
      intakePriorT: 3820,
      rejectionRatePct: 5.1,
      bufferHa: 2440,
      boundaryIntegrityPct: 89,
      patrolsThisWeek: 8,
      trainingCoveragePct: 71,
      pay: { baseKesPerKg: 210, qualityPremiumKesPerKg: 2.4, conservationPremiumKesPerKg: 9.5 },
      ndviSeries: [0.52, 0.53, 0.54, 0.55, 0.57, 0.58, 0.6, 0.62, 0.64],
    },
    {
      id: 'CHER',
      name: 'Cherangani Hills',
      code: 'NTZDC-CHER',
      blocks: 6,
      farmers: 5210,
      intakeSeasonT: 6120,
      intakePriorT: 6040,
      rejectionRatePct: 6.8,
      bufferHa: 3910,
      boundaryIntegrityPct: 82,
      patrolsThisWeek: 13,
      trainingCoveragePct: 58,
      pay: { baseKesPerKg: 205, qualityPremiumKesPerKg: 2.0, conservationPremiumKesPerKg: 7.0 },
      ndviSeries: [0.48, 0.47, 0.49, 0.5, 0.51, 0.52, 0.54, 0.55, 0.57],
    },
    {
      id: 'ABER',
      name: 'Aberdare Range',
      code: 'NTZDC-ABER',
      blocks: 3,
      farmers: 2480,
      intakeSeasonT: 3210,
      intakePriorT: 2910,
      rejectionRatePct: 3.6,
      bufferHa: 1680,
      boundaryIntegrityPct: 96,
      patrolsThisWeek: 6,
      trainingCoveragePct: 84,
      pay: { baseKesPerKg: 212, qualityPremiumKesPerKg: 3.4, conservationPremiumKesPerKg: 16.5 },
      ndviSeries: [0.6, 0.62, 0.63, 0.65, 0.66, 0.68, 0.7, 0.72, 0.74],
    },
    {
      id: 'MTK',
      name: 'Mount Kenya East',
      code: 'NTZDC-MTK',
      blocks: 5,
      farmers: 4670,
      intakeSeasonT: 5580,
      intakePriorT: 5210,
      rejectionRatePct: 4.4,
      bufferHa: 2960,
      boundaryIntegrityPct: 91,
      patrolsThisWeek: 10,
      trainingCoveragePct: 74,
      pay: { baseKesPerKg: 210, qualityPremiumKesPerKg: 2.8, conservationPremiumKesPerKg: 12.0 },
      ndviSeries: [0.56, 0.57, 0.58, 0.6, 0.61, 0.63, 0.64, 0.66, 0.68],
    },
    {
      id: 'NAND',
      name: 'Nandi Hills',
      code: 'NTZDC-NAND',
      blocks: 4,
      farmers: 3890,
      intakeSeasonT: 4740,
      intakePriorT: 4600,
      rejectionRatePct: 5.9,
      bufferHa: 2210,
      boundaryIntegrityPct: 86,
      patrolsThisWeek: 7,
      trainingCoveragePct: 63,
      pay: { baseKesPerKg: 208, qualityPremiumKesPerKg: 2.2, conservationPremiumKesPerKg: 8.0 },
      ndviSeries: [0.5, 0.51, 0.51, 0.53, 0.54, 0.55, 0.57, 0.58, 0.6],
    },
  ],
}

/** Total KES/kg a zone pays: base rate + both premiums. */
export function zoneTotalPay(zone) {
  const { baseKesPerKg, qualityPremiumKesPerKg, conservationPremiumKesPerKg } = zone.pay
  return baseKesPerKg + qualityPremiumKesPerKg + conservationPremiumKesPerKg
}

/**
 * Share of a zone's conservation activity that has cleared field + satellite
 * verification. Derived from boundary integrity and training coverage — the same
 * zones that lag on those lag on getting their conservation work verified, which
 * is why they earn less of the conservation premium.
 */
export function zoneConservationVerifiedPct(zone) {
  return Math.round(zone.boundaryIntegrityPct * 0.6 + zone.trainingCoveragePct * 0.4)
}

/**
 * The conservation premium is conditional: a zone earns it in proportion to how
 * much of its conservation work is verified. The rest is held pending
 * verification — not a shortfall, an amount the zone can still unlock.
 */
export function zoneConservationPremium(zone) {
  const full = zone.pay.conservationPremiumKesPerKg
  const earned = +(full * (zoneConservationVerifiedPct(zone) / 100)).toFixed(1)
  return { full, earned, held: +(full - earned).toFixed(1) }
}

/**
 * The zone rows in the shape a real endpoint should return
 * (`ZoneComparisonRow` in `lib/contracts/shapes.js`). The Zone Comparison
 * module reads `NTZDC_MANAGEMENT.zones` today; the swap is
 * `zones.map(fromZoneComparisonRow)` at the import site.
 */
export const zoneComparisonContract = NTZDC_MANAGEMENT.zones.map(toZoneComparisonRow)

/** Org-wide aggregates derived from the zone set (intake-weighted where a rate). */
export function managementRollup() {
  const { zones, ndviQuarters } = NTZDC_MANAGEMENT
  const intakeSeasonT = zones.reduce((s, z) => s + z.intakeSeasonT, 0)
  const intakePriorT = zones.reduce((s, z) => s + z.intakePriorT, 0)
  const weightedRate = (pick) =>
    zones.reduce((s, z) => s + pick(z) * z.intakeSeasonT, 0) / intakeSeasonT

  const ndviTrend = ndviQuarters.map(
    (_, i) => +(zones.reduce((s, z) => s + z.ndviSeries[i], 0) / zones.length).toFixed(3),
  )

  return {
    zoneCount: zones.length,
    blocks: zones.reduce((s, z) => s + z.blocks, 0),
    farmers: zones.reduce((s, z) => s + z.farmers, 0),
    intakeSeasonT,
    intakePriorT,
    intakeChangePct: ((intakeSeasonT - intakePriorT) / intakePriorT) * 100,
    rejectionRatePct: weightedRate((z) => z.rejectionRatePct),
    bufferHa: zones.reduce((s, z) => s + z.bufferHa, 0),
    boundaryIntegrityPct: weightedRate((z) => z.boundaryIntegrityPct),
    patrolsThisWeek: zones.reduce((s, z) => s + z.patrolsThisWeek, 0),
    trainingCoveragePct: weightedRate((z) => z.trainingCoveragePct),
    ndviTrend,
  }
}
