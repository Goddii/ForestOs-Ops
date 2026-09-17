// ── Canonical batch provenance ───────────────────────────────────────────────
// One source of truth for a batch's Land → Block → Plot → Harvest → Batch →
// Processing chain. The public QR site (`forestos-qr-landing`) forked its own
// copy of this file at the split; this one now serves only the internal
// NTZDC console.
//
// PRIVACY: these records carry no farmer names, phone numbers, or IDs — only
// aggregate counts (`farmers`, `pluckers`).
// Illustrative mock data; there is no ForestOS backend.

import { EUDR } from './dashboardData'

// Channels the consumer / brand surfaces are allowed to show (never 'auction').
// Per ForestOS Responses: Phase 1 priority is branded / value-added / direct-sold
// / specific-offtaker tea; auction volume is out of scope until later.
const NON_AUCTION = new Set(['direct_sold', 'branded'])
export const isNonAuction = (channel) => NON_AUCTION.has(channel)

const RECORDS = [
  {
    id: '802', // short retail code carried on the pack / QR
    traceId: 'TL-2026-00482', // full production trace id (dashboard + contract layer)
    sectorPlotId: 'KIP-09', // the SW-MAU sector-map plot this batch was pressed from
    channel: 'branded', // 'direct_sold' | 'branded' | 'auction'
    brand: 'Rift Valley Tea Co.',
    brandId: 'riftValley', // → lib/brands.js BRANDS (public brand-beat + belt standings)
    product: 'Origin Series — First Flush',
    season: '2026 main crop',
    volumeKg: 1840,
    premiumKesPerKg: 14,
    protectedPerCup: '10 m²',
    hectaresPreserved: 3.2,
    carbonTonnesCo2: 141,
    settlementDays: 4,
    land: {
      name: 'Mau Forest Complex',
      region: 'South West Mau',
      waterTowers: ['Mara', 'Sondu', 'Njoro'],
    },
    block: {
      id: 'KPT',
      name: 'Kiptunga Block',
      bufferZone: 'Mau Forest',
      region: 'Kiptunga Block, South West Mau',
      covenantHa: 3180,
      patrolsThisMonth: 11,
      seedlingsPlanted: 4200,
    },
    plot: {
      id: 'MAU-KPT-0802',
      centre: 'Kiptunga Collection Centre',
      lat: -0.415,
      lon: 35.618,
      areaHa: 4.1,
      canopyBaseline2020Pct: 66,
      canopyNowPct: 71,
      ndvi: 0.71,
      farmers: 38,
    },
    harvest: {
      window: '2026-08-18 – 2026-08-24',
      month: 'August 2026',
      greenLeafKg: 8200,
      pluckers: 1240,
    },
    batch: { sealedAt: '2026-08-26', madeTeaKg: 1840, grade: 'BP1' },
    processing: {
      facility: 'Kiptunga Tea Factory',
      lotId: 'KTF-2026-0802',
      processedAt: '2026-08-27',
      method: 'CTC · 14 h withering',
    },
    verification: {
      standard: 'EUDR — Deforestation-Free',
      status: 'Verified',
      timestamp: '2026-08-29 14:02 EAT',
      reference: '0x7b4c9e1a2f8d6035',
      field: { status: 'Verified', date: '2026-08-20', by: 'NTZDC field officer' },
      satellite: { status: 'Verified', date: '2026-08-29', source: 'Sentinel-2 L2A', baseline: '2020-12-31' },
    },
    community: { farmersRepresented: 38, womenPluckersPct: 61, paidMobileMoneyPct: 100, settledSameWeekPct: 92 },
  },
  {
    id: '774',
    traceId: 'TL-2026-00461',
    sectorPlotId: 'NES-10',
    channel: 'branded',
    brand: 'Rift Valley Tea Co.',
    brandId: 'riftValley',
    product: 'Origin Series — Highland Reserve',
    season: '2026 main crop',
    volumeKg: 1520,
    premiumKesPerKg: 13.6,
    protectedPerCup: '9 m²',
    hectaresPreserved: 2.6,
    carbonTonnesCo2: 118,
    settlementDays: 5,
    land: {
      name: 'Mau Forest Complex',
      region: 'South West Mau',
      waterTowers: ['Sondu', 'Yala'],
    },
    block: {
      id: 'NES',
      name: 'Nessuit Block',
      bufferZone: 'Mau Forest',
      region: 'Nessuit Block, South West Mau',
      covenantHa: 2440,
      patrolsThisMonth: 8,
      seedlingsPlanted: 3100,
    },
    plot: {
      id: 'MAU-NES-0774',
      centre: 'Nessuit Collection Centre',
      lat: -0.523,
      lon: 35.702,
      areaHa: 3.4,
      canopyBaseline2020Pct: 61,
      canopyNowPct: 64,
      ndvi: 0.64,
      farmers: 29,
    },
    harvest: {
      window: '2026-08-11 – 2026-08-17',
      month: 'August 2026',
      greenLeafKg: 6800,
      pluckers: 880,
    },
    batch: { sealedAt: '2026-08-19', madeTeaKg: 1520, grade: 'PF1' },
    processing: {
      facility: 'Nessuit Tea Factory',
      lotId: 'NTF-2026-0774',
      processedAt: '2026-08-20',
      method: 'CTC · 16 h withering',
    },
    verification: {
      standard: 'EUDR — Deforestation-Free',
      status: 'Verified',
      timestamp: '2026-08-22 09:40 EAT',
      reference: '0x2f19ac83b7e04d5c',
      field: { status: 'Verified', date: '2026-08-13', by: 'NTZDC field officer' },
      satellite: { status: 'Verified', date: '2026-08-22', source: 'Sentinel-2 L2A', baseline: '2020-12-31' },
    },
    community: { farmersRepresented: 29, womenPluckersPct: 57, paidMobileMoneyPct: 100, settledSameWeekPct: 88 },
  },
  {
    // The consumer / artist collaboration batch — the public QR-scan demo pairs
    // with this one (`/batch/921`). It sits in South West Mau like 802 so the
    // public globe's fixed Kiptunga dive still reads true; `sectorPlotId` is
    // null so it stays out of the dashboard's SW-MAU sector roll-up.
    id: '921',
    traceId: 'TL-2026-00521',
    sectorPlotId: null,
    channel: 'branded',
    brand: 'Nyashinski Tea',
    brandId: 'nyashinski',
    product: 'I.D TAICHI — The Guardian Edition',
    season: '2026 main crop',
    volumeKg: 1660,
    premiumKesPerKg: 15,
    protectedPerCup: '11 m²',
    hectaresPreserved: 3.0,
    carbonTonnesCo2: 128,
    settlementDays: 4,
    land: {
      name: 'Mau Forest Complex',
      region: 'South West Mau',
      waterTowers: ['Mara', 'Sondu', 'Ewaso Ng’iro'],
    },
    block: {
      id: 'MAR',
      name: 'Mariashoni Block',
      bufferZone: 'Mau Forest',
      region: 'Mariashoni Block, South West Mau',
      covenantHa: 2870,
      patrolsThisMonth: 12,
      seedlingsPlanted: 3800,
    },
    plot: {
      id: 'MAU-MAR-0921',
      centre: 'Mariashoni Collection Centre',
      lat: -0.552,
      lon: 35.548,
      areaHa: 3.7,
      canopyBaseline2020Pct: 64,
      canopyNowPct: 70,
      ndvi: 0.7,
      farmers: 33,
    },
    harvest: {
      window: '2026-08-19 – 2026-08-25',
      month: 'August 2026',
      greenLeafKg: 7400,
      pluckers: 1010,
    },
    batch: { sealedAt: '2026-08-27', madeTeaKg: 1660, grade: 'BP1' },
    processing: {
      facility: 'Mariashoni Tea Factory',
      lotId: 'MTF-2026-0921',
      processedAt: '2026-08-28',
      method: 'CTC · 14 h withering',
    },
    verification: {
      standard: 'EUDR — Deforestation-Free',
      status: 'Verified',
      timestamp: '2026-08-30 15:18 EAT',
      reference: '0x3ac41f9e7b25d086',
      field: { status: 'Verified', date: '2026-08-21', by: 'NTZDC field officer' },
      satellite: { status: 'Verified', date: '2026-08-30', source: 'Sentinel-2 L2A', baseline: '2020-12-31' },
    },
    community: { farmersRepresented: 33, womenPluckersPct: 63, paidMobileMoneyPct: 100, settledSameWeekPct: 94 },
  },
  {
    id: '618',
    traceId: 'TL-2026-00388',
    sectorPlotId: null, // Aberdare Range — outside the SW-MAU sector map
    channel: 'direct_sold',
    brand: 'Highland Leaf Collective',
    brandId: null, // no rich brand profile — brand-beat renders the minimal variant
    product: 'Single-Origin Aberdare',
    season: '2026 main crop',
    volumeKg: 980,
    premiumKesPerKg: 12.4,
    protectedPerCup: '8 m²',
    hectaresPreserved: 1.7,
    carbonTonnesCo2: 74,
    settlementDays: 6,
    land: {
      name: 'Aberdare Range',
      region: 'Central Highlands',
      waterTowers: ['Tana', 'Ewaso Ng’iro'],
    },
    block: {
      id: 'WAN',
      name: 'Wanjohi Block',
      bufferZone: 'Aberdare Forest',
      region: 'Wanjohi Block, Aberdare Range',
      covenantHa: 1680,
      patrolsThisMonth: 6,
      seedlingsPlanted: 1900,
    },
    plot: {
      id: 'ABD-WAN-0618',
      centre: 'Wanjohi Collection Centre',
      lat: -0.402,
      lon: 36.612,
      areaHa: 2.2,
      canopyBaseline2020Pct: 70,
      canopyNowPct: 74,
      ndvi: 0.72,
      farmers: 21,
    },
    harvest: {
      window: '2026-08-04 – 2026-08-10',
      month: 'August 2026',
      greenLeafKg: 4300,
      pluckers: 540,
    },
    batch: { sealedAt: '2026-08-12', madeTeaKg: 980, grade: 'BP1' },
    processing: {
      facility: 'Wanjohi Tea Factory',
      lotId: 'WTF-2026-0618',
      processedAt: '2026-08-13',
      method: 'CTC · 12 h withering',
    },
    verification: {
      standard: 'EUDR — Deforestation-Free',
      status: 'Verified',
      timestamp: '2026-08-16 11:07 EAT',
      reference: '0x9d3e70c1a45f28b6',
      field: { status: 'Verified', date: '2026-08-06', by: 'NTZDC field officer' },
      satellite: { status: 'Verified', date: '2026-08-16', source: 'Sentinel-2 L2A', baseline: '2020-12-31' },
    },
    community: { farmersRepresented: 21, womenPluckersPct: 64, paidMobileMoneyPct: 100, settledSameWeekPct: 95 },
  },
  {
    id: '540',
    traceId: 'TL-2026-00327',
    sectorPlotId: null, // Mount Kenya East — outside the SW-MAU sector map
    channel: 'branded',
    brand: 'Rift Valley Tea Co.',
    brandId: 'riftValley',
    product: 'Origin Series — Mount Kenya',
    season: '2026 early crop',
    volumeKg: 1310,
    premiumKesPerKg: 12.0,
    protectedPerCup: '8 m²',
    hectaresPreserved: 2.1,
    carbonTonnesCo2: 92,
    settlementDays: 5,
    land: {
      name: 'Mount Kenya Forest',
      region: 'Central Highlands',
      waterTowers: ['Tana', 'Ewaso Ng’iro'],
    },
    block: {
      id: 'KAN',
      name: 'Kangaita Block',
      bufferZone: 'Mount Kenya Forest',
      region: 'Kangaita Block, Mount Kenya East',
      covenantHa: 2960,
      patrolsThisMonth: 10,
      seedlingsPlanted: 2600,
    },
    plot: {
      id: 'MTK-KAN-0540',
      centre: 'Kangaita Collection Centre',
      lat: -0.489,
      lon: 37.291,
      areaHa: 3.0,
      canopyBaseline2020Pct: 63,
      canopyNowPct: 68,
      ndvi: 0.68,
      farmers: 26,
    },
    harvest: {
      window: '2026-07-21 – 2026-07-27',
      month: 'July 2026',
      greenLeafKg: 5900,
      pluckers: 720,
    },
    batch: { sealedAt: '2026-07-29', madeTeaKg: 1310, grade: 'PD' },
    processing: {
      facility: 'Kangaita Tea Factory',
      lotId: 'KGT-2026-0540',
      processedAt: '2026-07-30',
      method: 'CTC · 15 h withering',
    },
    verification: {
      standard: 'EUDR — Deforestation-Free',
      status: 'Verified',
      timestamp: '2026-08-02 08:15 EAT',
      reference: '0x51b8fe26d9c37a04',
      field: { status: 'Verified', date: '2026-07-23', by: 'NTZDC field officer' },
      satellite: { status: 'Verified', date: '2026-08-02', source: 'Sentinel-2 L2A', baseline: '2020-12-31' },
    },
    community: { farmersRepresented: 26, womenPluckersPct: 59, paidMobileMoneyPct: 100, settledSameWeekPct: 90 },
  },
  {
    // Auction-pool volume — deliberately NOT branded. Batch Lookup rejects it.
    id: 'AUC-4471',
    traceId: null,
    sectorPlotId: null,
    channel: 'auction',
    brand: null,
    brandId: null,
    product: 'Mombasa auction lot',
    season: '2026 main crop',
    volumeKg: 5400,
    premiumKesPerKg: 0,
    protectedPerCup: null,
    hectaresPreserved: null,
    carbonTonnesCo2: null,
    settlementDays: null,
    land: { name: 'Mixed origin', region: 'Rift Valley', waterTowers: [] },
    block: { id: 'MIX', name: 'Pooled', bufferZone: '—', region: 'Multiple blocks', covenantHa: 0, patrolsThisMonth: 0, seedlingsPlanted: 0 },
    plot: { id: '—', centre: 'Multiple', lat: 0, lon: 0, areaHa: 0, canopyBaseline2020Pct: 0, canopyNowPct: 0, ndvi: 0, farmers: 0 },
    harvest: { window: '—', month: '—', greenLeafKg: 0, pluckers: 0 },
    batch: { sealedAt: '—', madeTeaKg: 5400, grade: 'mixed' },
    processing: { facility: 'Multiple factories', lotId: '—', processedAt: '—', method: '—' },
    verification: {
      standard: '—',
      status: 'Not tracked',
      timestamp: '—',
      reference: '—',
      field: { status: 'Not tracked', date: '—', by: '—' },
      satellite: { status: 'Not tracked', date: '—', source: '—', baseline: '—' },
    },
    community: { farmersRepresented: 0, womenPluckersPct: 0, paidMobileMoneyPct: 0, settledSameWeekPct: 0 },
  },
]

export const BATCH_CHAIN = RECORDS

/** Case-insensitive lookup by short retail code or full trace id, across all channels. */
export function findBatchRecord(batchId) {
  if (!batchId) return null
  const q = String(batchId).trim().toUpperCase().replace(/^#/, '')
  return (
    RECORDS.find((r) => r.id.toUpperCase() === q || (r.traceId && r.traceId.toUpperCase() === q)) ??
    null
  )
}

const roundCoord = (n, dp) => Number(n.toFixed(dp))

/**
 * The plot a batch was pressed from. Geographic + canopy facts come from the
 * sector map plot when the batch is linked to one (so the chain, the 3D map and
 * the audit export never disagree); centre name and farmer count stay from the
 * record.
 */
export function resolvePlot(record) {
  const mapPlot = record.sectorPlotId
    ? EUDR.plots.find((p) => p.id === record.sectorPlotId)
    : null
  if (!mapPlot) return record.plot
  return {
    ...record.plot,
    id: mapPlot.id,
    lat: mapPlot.lat,
    lon: mapPlot.lon,
    areaHa: mapPlot.hectares,
    canopyBaseline2020Pct: mapPlot.canopy2020,
    canopyNowPct: mapPlot.canopyNow,
    ndvi: mapPlot.ndvi,
    eudrStatus: mapPlot.status,
  }
}

/**
 * The legacy flat `BATCH` shape the public QR sections still expect. Derived from
 * the canonical record so `lib/mock.js` no longer hand-maintains its own copy.
 */
export function toLegacyBatch(record) {
  // `collectionCentre` is the delivery facility (a fixed location, distinct from
  // the plot), so it keeps the record's hand-authored coordinates — the public
  // globe pin does not move. `plotId` follows the resolved sector plot so the
  // downloaded passport agrees with the dashboard chain.
  return {
    id: record.id,
    brandId: record.brandId ?? null,
    brand: record.brand,
    product: record.product,
    bufferZone: record.block.bufferZone,
    region: record.block.region,
    block: {
      name: record.block.name,
      bufferZone: record.block.bufferZone,
      covenantHa: record.block.covenantHa,
      patrolsThisMonth: record.block.patrolsThisMonth,
      seedlingsPlanted: record.block.seedlingsPlanted,
    },
    protectedPerCup: record.protectedPerCup,
    hectaresPreserved: record.hectaresPreserved == null ? null : String(record.hectaresPreserved),
    sourcedVolumeKg: record.volumeKg,
    sourcedVolumeLabel: `${record.volumeKg.toLocaleString()} kg made tea`,
    pluckerPremiumKesPerKg: record.premiumKesPerKg,
    settlementDays: record.settlementDays ?? null,
    collectionCentre: {
      name: record.plot.centre,
      lon: roundCoord(record.plot.lon, 3),
      lat: roundCoord(record.plot.lat, 3),
      pluckers: record.harvest.pluckers,
    },
    verification: {
      standard: record.verification.standard,
      status: record.verification.status,
      timestamp: record.verification.timestamp,
      plotId: resolvePlot(record).id,
      reference: record.verification.reference,
      // Additive — existing consumers (the public `/batch/:id` page) don't
      // destructure these, so this doesn't change their render. Added for
      // the tenant passport's Verify stage, which needs the field-check and
      // satellite-confirm dates as two distinct real values, not one.
      field: record.verification.field,
      satellite: record.verification.satellite,
    },
  }
}
