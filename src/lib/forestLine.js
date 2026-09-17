// ── Forest Line — the connected record ───────────────────────────────────────
// The Concept Brief's spine: Land → Block → Plot → Harvest → Batch → Processing
// → Buyer, as ONE navigable record. This module is the connective layer that
// links the SW-MAU sector map (`EUDR.plots`, rendered by SectorFocusMap) to the
// harvests recorded against those plots and the batches pressed from them.
//
// Batch provenance detail lives in `batchChain.js`; this file adds the
// plot ↔ harvest ↔ batch navigation and the landscape-level roll-up that the
// Forest Line overview screen shows. Illustrative mock data only.

import { EUDR, SATELLITE } from './dashboardData'
import { BATCH_CHAIN, isNonAuction } from './batchChain'
import { managementRollup } from './dashboard/ntzdcManagement'
import { ZONE } from './dashboard/zoneManager'
import { toBatchRecord } from './contracts/adapters'

/** Every batch in the shape a real endpoint should return (`BatchRecord`). */
export const batchRecordsContract = BATCH_CHAIN.map(toBatchRecord)

// Verification pipeline shared with the NTZDC Verification Queue.
export const VERIFICATION_STAGES = [
  'Reported',
  'Field verified',
  'Evidence attached',
  'Satellite cross-check',
  'Verified',
]
const isVerified = (stage) => stage === 'Verified'

// One recorded harvest = one USSD "Record Harvest" session's green leaf, logged
// against a real sector-map plot id (KIP-09, NES-10, …). Cleared plots carry the
// two verified flagship batches; watch / flagged plots carry batches still in
// the verification pipeline or auction volume — so the verification story reads
// straight off the map.
const HARVESTS = [
  { id: 'HRV-2026-0412', plotId: 'KIP-09', date: '2026-08-20', greenLeafKg: 8200, grade: 'BP1', pluckers: 1240 },
  { id: 'HRV-2026-0389', plotId: 'NES-10', date: '2026-08-14', greenLeafKg: 6800, grade: 'PF1', pluckers: 880 },
  { id: 'HRV-2026-0361', plotId: 'MAR-03', date: '2026-08-09', greenLeafKg: 5200, grade: 'BP1', pluckers: 610 },
  { id: 'HRV-2026-0377', plotId: 'NES-02', date: '2026-08-12', greenLeafKg: 4700, grade: 'PF1', pluckers: 520 },
  { id: 'HRV-2026-0355', plotId: 'TIN-04', date: '2026-08-07', greenLeafKg: 4400, grade: 'PD', pluckers: 430 },
  { id: 'HRV-2026-0402', plotId: 'KIP-01', date: '2026-08-17', greenLeafKg: 3900, grade: 'BP1', pluckers: 540 },
]

// Sector-local batches that don't yet carry a full provenance record. The two
// flagship batches (802 / KIP-09, 774 / NES-10) come from `BATCH_CHAIN`.
const SECTOR_BATCHES = [
  { id: 'TL-2026-00361', traceId: 'TL-2026-00361', plotId: 'MAR-03', harvestId: 'HRV-2026-0361',
    madeTeaKg: 1170, grade: 'BP1', channel: 'branded', buyer: 'Rift Valley Tea Co.', stage: 'Verified' },
  { id: 'TL-2026-00377', traceId: 'TL-2026-00377', plotId: 'NES-02', harvestId: 'HRV-2026-0377',
    madeTeaKg: 1050, grade: 'PF1', channel: 'branded', buyer: 'Rift Valley Tea Co.', stage: 'Field verified' },
  { id: 'TL-2026-00355', traceId: 'TL-2026-00355', plotId: 'TIN-04', harvestId: 'HRV-2026-0355',
    madeTeaKg: 990, grade: 'PD', channel: 'direct_sold', buyer: 'Highland Leaf Collective', stage: 'Satellite cross-check' },
  { id: 'TL-2026-00402', traceId: 'TL-2026-00402', plotId: 'KIP-01', harvestId: 'HRV-2026-0402',
    madeTeaKg: 880, grade: 'BP1', channel: 'auction', buyer: null, stage: 'Reported' },
]

// Which HRV id each full-chain batch rolled up from.
const CHAIN_HARVEST = { 802: 'HRV-2026-0412', 774: 'HRV-2026-0389' }

/** A `BATCH_CHAIN` record projected to the compact batch summary shape. */
function chainBatchSummary(record) {
  return {
    id: record.id,
    traceId: record.traceId,
    plotId: record.sectorPlotId,
    harvestId: CHAIN_HARVEST[record.id] ?? null,
    madeTeaKg: record.batch.madeTeaKg,
    grade: record.batch.grade,
    channel: record.channel,
    buyer: record.brand,
    product: record.product,
    stage: record.verification.status === 'Verified' ? 'Verified' : 'Satellite cross-check',
    hasFullChain: true,
  }
}

const ALL_BATCHES = [
  ...BATCH_CHAIN.filter((r) => r.sectorPlotId).map(chainBatchSummary),
  ...SECTOR_BATCHES.map((b) => ({ ...b, product: b.product ?? null, hasFullChain: false })),
]

/** The sector plots that carry at least one recorded harvest. */
export function tracedPlotIds() {
  return [...new Set(HARVESTS.map((h) => h.plotId))]
}

export function harvestsForPlot(plotId) {
  return HARVESTS.filter((h) => h.plotId === plotId)
}

export function batchesForPlot(plotId) {
  return ALL_BATCHES.filter((b) => b.plotId === plotId)
}

export function harvestById(id) {
  return HARVESTS.find((h) => h.id === id) ?? null
}

/**
 * The full connected record for one sector-map plot: the plot itself, every
 * harvest logged against it, and every batch pressed from those harvests with
 * its buyer, channel and verification stage.
 */
export function plotConnectedRecord(plotId) {
  const plot = EUDR.plots.find((p) => p.id === plotId) ?? null
  if (!plot) return null
  const harvests = harvestsForPlot(plotId)
  const batches = batchesForPlot(plotId).map((b) => ({
    ...b,
    harvest: b.harvestId ? harvestById(b.harvestId) : null,
    verified: isVerified(b.stage),
    nonAuction: isNonAuction(b.channel),
  }))
  return { plot, harvests, batches }
}

/**
 * Landscape-level roll-up for the Forest Line overview screen —
 * See → Verify → Value → Reward, with numbers aggregated from the mock data
 * so the overview stays consistent with the individual modules.
 */
export function landscapeSummary() {
  const rollup = managementRollup()
  const verifiedBatches = ALL_BATCHES.filter((b) => isVerified(b.stage))
  const pendingBatches = ALL_BATCHES.filter((b) => !isVerified(b.stage) && isNonAuction(b.channel))

  return {
    see: {
      sector: 'South West Mau',
      plotsMapped: EUDR.plots.length,
      tracedPlots: tracedPlotIds().length,
      harvestsLogged: HARVESTS.length,
      greenLeafKg: HARVESTS.reduce((s, h) => s + h.greenLeafKg, 0),
    },
    verify: {
      plotsClear: EUDR.summary.clear,
      plotsWatch: EUDR.summary.watch,
      plotsFlagged: EUDR.summary.flagged,
      batchesVerified: verifiedBatches.length,
      batchesPending: pendingBatches.length,
      ndviDelta: +(SATELLITE.ndvi.current - SATELLITE.ndvi.baseline).toFixed(2),
    },
    value: {
      // What the record turns into economically for South West Mau, read off
      // the Zone Manager's own Pay & Parity numbers so the overview never
      // disagrees with the module it links to.
      conservationPremiumKesPerKg: ZONE.pay.conservationPremiumPerKg,
      totalKesPerKg: ZONE.pay.totalPerKg,
      medianWeeklyPay: ZONE.pay.medianWeeklyPay,
      seasonIntakeT: rollup.intakeSeasonT,
    },
    reward: {
      farmers: rollup.farmers,
      bufferHa: rollup.bufferHa,
      trainingCoveragePct: Math.round(rollup.trainingCoveragePct ?? 0),
      zones: rollup.zoneCount,
    },
  }
}
