// Mock data for the Factory Manager view — the processing layer, distinct
// from the block/zone/national hierarchy: a factory receives green leaf from
// several blocks and turns it into made tea, so its screens are organised
// around intake, the processing line, energy, grade output and dispatch
// rather than field operations.
//
// Modelled on Gatitu Tea Factory, one of the two real NTZDC facilities named
// in the SolGrid Tea Energy Intelligence build this was ported from
// (Kipchabo and Gatitu) — a smaller, older site than Kiptunga (which stays
// as its own named facility elsewhere in this app: `lib/batchChain.js`,
// Block Operations, Zone Manager), with a genuinely underperforming solar
// array carried over from that source, not invented fresh. Illustrative
// only; no real figures.
export const FACTORY = {
  id: 'GTU',
  name: 'Gatitu Tea Factory',
  code: 'GTU',
  month: 'September 2026',
  workers: 52,
  kpis: {
    greenLeafIntakeT: 11.2,
    madeTeaOutputT: 2.4,
    recoveryRatioPct: 21.4,
    recoveryTargetPct: 22.5,
    machineUptimePct: 93.8,
    energyCostPerKg: 27.6,
    energyCostDeltaPct: 4.1,
  },
  alerts: [
    {
      id: 'FAL-1',
      tone: 'critical',
      tag: 'Now',
      title: 'Battery state of health dropped 1.1 pts this month',
      detail: 'Faster than typical degradation — budget for replacement within the year',
    },
    {
      id: 'FAL-2',
      tone: 'warn',
      tag: 'Investigate',
      title: 'Solar generation 79% of trailing average',
      detail: 'Below the underperformance threshold — check for shading, panel soiling or an inverter fault',
    },
    {
      id: 'FAL-3',
      tone: 'default',
      tag: 'Review',
      title: 'Withering trough 2 running long',
      detail: 'Batch GTF-2026-0904 at 16 h, 2 h over standard cycle — leaf condition being watched',
    },
  ],
  intake: {
    todayTotalKg: 11200,
    ticketCount: 21,
    avgMoisturePct: 77.4,
    routes: [
      { id: 'RT-1', route: 'Gatitu Central', block: 'GTU-C', tickets: 9, kg: 5100, avgMoisturePct: 77.1, status: 'clear' },
      { id: 'RT-2', route: 'Ragati feeder', block: 'RAG', tickets: 6, kg: 3400, avgMoisturePct: 77.6, status: 'clear' },
      { id: 'RT-3', route: 'Karima feeder', block: 'KAR', tickets: 4, kg: 1900, avgMoisturePct: 78.3, status: 'clear' },
      { id: 'RT-4', route: 'Mukurwe-ini feeder', block: 'MUK', tickets: 2, kg: 800, avgMoisturePct: 76.9, status: 'clear' },
    ],
  },
  processing: {
    lines: [
      { id: 'LN-1', stage: 'Withering', status: 'flagged', throughputKgHr: 410, note: 'trough 2 at 16 h — 2 h over standard cycle' },
      { id: 'LN-2', stage: 'CTC', status: 'running', throughputKgHr: 340, note: 'single cutter online' },
      { id: 'LN-3', stage: 'Fermentation', status: 'running', throughputKgHr: 320, note: 'within 90–120 min window' },
      { id: 'LN-4', stage: 'Drying', status: 'running', throughputKgHr: 300, note: 'both dryers within spec' },
      { id: 'LN-5', stage: 'Sorting', status: 'running', throughputKgHr: 280, note: 'on pace with drying output' },
    ],
    gradeOutput: [
      { grade: 'BP1', kg: 1150, pct: 48 },
      { grade: 'PF1', kg: 480, pct: 20 },
      { grade: 'PD', kg: 360, pct: 15 },
      { grade: 'Dust', kg: 264, pct: 11 },
      { grade: 'Fannings', kg: 146, pct: 6 },
    ],
  },
  qualityHolds: [
    {
      id: 'QH-1',
      tone: 'default',
      lotId: 'GTF-2026-0901',
      reason: 'Routine moisture re-check ahead of dispatch',
      kg: 320,
      status: 'Cleared, pending release',
    },
  ],
  // Grid/diesel/fuelwood/solar behind the factory's energy cost — the same
  // energy-mix concept SolGrid Tea Energy Intelligence tracks for NTZDC
  // factories, folded into this console's own illustrative-mock-data style
  // (no backend here, so no live weather/telemetry — just static figures
  // presented the way every other Factory Manager screen presents them).
  // Gatitu's solar figures mirror that source's own seeded profile for this
  // facility: a smaller 80 kW array, faster battery degradation, and a real
  // underperformance case — not cleaned up for a nicer demo.
  energy: {
    mix: {
      gridKwh: 31800,
      dieselLitres: 2100,
      fuelwoodM3: 260,
      solarGenerationKwh: 1380,
    },
    mixShare: [
      { source: 'Grid electricity', pct: 74 },
      { source: 'Fuelwood', pct: 17 },
      { source: 'Diesel', pct: 8 },
      { source: 'Solar (self-consumed)', pct: 1 },
    ],
    costPerKgTrendKes: [24.8, 25.1, 25.9, 26.4, 26.0, 26.8, 27.2, 27.6],
    solar: {
      installCapacityKw: 80,
      generationTodayKwh: 140,
      generationTrailingKwh: [2050, 2120, 2400, 2350, 1980, 1720, 1590, 1380],
      selfConsumptionPct: 4.3,
      // Two-tier underperformance check, same distinction SolGrid's
      // solar_insights.py draws: weather-adjusted (real recorded
      // irradiance for the site) when available, else a cruder
      // self-relative comparison against the site's own trailing average.
      // Gatitu has no weather baseline on file yet, so this is the
      // fallback tier — and the insight below says so explicitly, so a
      // "cloudy month" is never silently read as "broken panel" or
      // vice versa.
      comparison: { method: 'trailing_average', pct: 79 },
      insight:
        "September generation was 79% of this site's trailing average — check for shading, panel soiling, or an inverter fault. No weather baseline on file yet for Gatitu, so this compares against the site's own recent history rather than actual recorded irradiance.",
      battery: {
        socPct: 48.0,
        sohPct: 84.5,
        panelStatus: 'Underperforming',
        batteryStatus: 'Degraded',
        lastReadingAgo: '6 hours ago',
      },
    },
  },
  // Itemised metered readings behind the energy-mix and cost figures above —
  // the same reading-type vocabulary and per-reading source channel as
  // SolGrid's energy ledger (`grid_electricity` | `diesel` | `fuelwood` |
  // `solar_generation`, plus the matched production record), so anyone
  // checking a monthly total can trace it back to what was actually
  // recorded, when, and how it reached the system.
  ledger: {
    entries: [
      { id: 'ER-2026-09-GRID', periodStart: '2026-09-01', periodEnd: '2026-09-30', readingType: 'Grid electricity', quantity: 31800, unit: 'kWh', costKes: 486000, sourceChannel: 'Manual · weighbridge office' },
      { id: 'ER-2026-09-DSL', periodStart: '2026-09-01', periodEnd: '2026-09-30', readingType: 'Diesel', quantity: 2100, unit: 'litres', costKes: 390000, sourceChannel: 'Manual · fuel log' },
      { id: 'ER-2026-09-FWD', periodStart: '2026-09-01', periodEnd: '2026-09-30', readingType: 'Fuelwood', quantity: 260, unit: 'm³', costKes: 1040000, sourceChannel: 'Manual · delivery note' },
      { id: 'ER-2026-09-SOL', periodStart: '2026-09-01', periodEnd: '2026-09-30', readingType: 'Solar generation', quantity: 1380, unit: 'kWh', costKes: null, sourceChannel: 'Seeded · no ESP32 hardware yet' },
      { id: 'PR-2026-09', periodStart: '2026-09-01', periodEnd: '2026-09-30', readingType: 'Made tea (production)', quantity: 2400, unit: 'kg', costKes: null, sourceChannel: 'Manual · production log' },
      { id: 'ER-2026-08-GRID', periodStart: '2026-08-01', periodEnd: '2026-08-31', readingType: 'Grid electricity', quantity: 30600, unit: 'kWh', costKes: 468000, sourceChannel: 'Manual · weighbridge office' },
      { id: 'ER-2026-08-DSL', periodStart: '2026-08-01', periodEnd: '2026-08-31', readingType: 'Diesel', quantity: 1980, unit: 'litres', costKes: 366000, sourceChannel: 'Manual · fuel log' },
      { id: 'ER-2026-08-FWD', periodStart: '2026-08-01', periodEnd: '2026-08-31', readingType: 'Fuelwood', quantity: 250, unit: 'm³', costKes: 998000, sourceChannel: 'Manual · delivery note' },
      { id: 'ER-2026-08-SOL', periodStart: '2026-08-01', periodEnd: '2026-08-31', readingType: 'Solar generation', quantity: 1590, unit: 'kWh', costKes: null, sourceChannel: 'Seeded · no ESP32 hardware yet' },
      { id: 'PR-2026-08', periodStart: '2026-08-01', periodEnd: '2026-08-31', readingType: 'Made tea (production)', quantity: 2280, unit: 'kg', costKes: null, sourceChannel: 'Manual · production log' },
      { id: 'ER-2026-07-GRID', periodStart: '2026-07-01', periodEnd: '2026-07-31', readingType: 'Grid electricity', quantity: 29500, unit: 'kWh', costKes: 451000, sourceChannel: 'Manual · weighbridge office' },
      { id: 'ER-2026-07-DSL', periodStart: '2026-07-01', periodEnd: '2026-07-31', readingType: 'Diesel', quantity: 1850, unit: 'litres', costKes: 342000, sourceChannel: 'Manual · fuel log' },
      { id: 'ER-2026-07-FWD', periodStart: '2026-07-01', periodEnd: '2026-07-31', readingType: 'Fuelwood', quantity: 240, unit: 'm³', costKes: 958000, sourceChannel: 'Manual · delivery note' },
      { id: 'ER-2026-07-SOL', periodStart: '2026-07-01', periodEnd: '2026-07-31', readingType: 'Solar generation', quantity: 1720, unit: 'kWh', costKes: null, sourceChannel: 'Seeded · no ESP32 hardware yet' },
      { id: 'PR-2026-07', periodStart: '2026-07-01', periodEnd: '2026-07-31', readingType: 'Made tea (production)', quantity: 2350, unit: 'kg', costKes: null, sourceChannel: 'Manual · production log' },
    ],
  },
  dispatch: {
    warehouseStockKg: 6200,
    stockByGrade: [
      { grade: 'BP1', kg: 3100 },
      { grade: 'PF1', kg: 1300 },
      { grade: 'PD', kg: 980 },
      { grade: 'Dust', kg: 560 },
      { grade: 'Fannings', kg: 260 },
    ],
    pendingLoads: [
      { id: 'DSP-1', destination: 'Mombasa auction', grade: 'BP1', kg: 2200, status: 'Loading' },
      { id: 'DSP-2', destination: 'Highland Leaf Collective (direct)', grade: 'PF1', kg: 900, status: 'Scheduled' },
    ],
  },
}
