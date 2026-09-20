// Mock data for the Factory Manager view — the processing layer, distinct
// from the block/zone/national hierarchy: a factory receives green leaf from
// several blocks and turns it into made tea, so its screens are organised
// around intake, the processing line, grade output and dispatch rather than
// field operations. Kiptunga Tea Factory already exists as a named
// processing facility in `lib/batchChain.js` (`processing.facility`,
// `lotId`, `method`) — this file is the operational detail behind that same
// facility, seen from its manager's desk. Illustrative only; no real figures.

export const FACTORY = {
  id: 'KTF',
  name: 'Kiptunga Tea Factory',
  code: 'KTF',
  month: 'September 2026',
  workers: 96,
  kpis: {
    greenLeafIntakeT: 21.4,
    madeTeaOutputT: 4.7,
    recoveryRatioPct: 22.0,
    recoveryTargetPct: 22.5,
    machineUptimePct: 96.4,
    energyCostPerKg: 24.1,
    energyCostDeltaPct: 2.6,
  },
  alerts: [
    {
      id: 'FAL-1',
      tone: 'warn',
      tag: 'Investigate',
      title: 'Dryer 2 running 4°C below spec',
      detail: 'Batch KTF-2026-0913 held for re-test · 1,180 kg affected',
    },
    {
      id: 'FAL-2',
      tone: 'default',
      tag: 'Review',
      title: 'Buyer QA requested a moisture re-check',
      detail: 'Lot KTF-2026-0910 · 640 kg · cleared, pending release',
    },
    {
      id: 'FAL-3',
      tone: 'critical',
      tag: 'Now',
      title: 'Sorting line idle since 06:40',
      detail: 'Awaiting next drying batch — no fault, but recovery time is being lost',
    },
  ],
  intake: {
    todayTotalKg: 21400,
    ticketCount: 34,
    avgMoisturePct: 78.2,
    routes: [
      { id: 'RT-1', route: 'Kiptunga North', block: 'KIP', tickets: 12, kg: 8200, avgMoisturePct: 77.8, status: 'clear' },
      { id: 'RT-2', route: 'Kiptunga South', block: 'KIP', tickets: 9, kg: 6100, avgMoisturePct: 79.1, status: 'clear' },
      { id: 'RT-3', route: 'Nessuit feeder', block: 'NES', tickets: 8, kg: 4300, avgMoisturePct: 78.6, status: 'clear' },
      { id: 'RT-4', route: 'Marioshoni feeder', block: 'MAR', tickets: 5, kg: 2800, avgMoisturePct: 81.4, status: 'flagged' },
    ],
  },
  processing: {
    lines: [
      { id: 'LN-1', stage: 'Withering', status: 'running', throughputKgHr: 890, note: '14 h trough cycle · batch 3 of 4' },
      { id: 'LN-2', stage: 'CTC', status: 'running', throughputKgHr: 640, note: 'both cutters online' },
      { id: 'LN-3', stage: 'Fermentation', status: 'running', throughputKgHr: 610, note: 'within 90–120 min window' },
      { id: 'LN-4', stage: 'Drying', status: 'flagged', throughputKgHr: 580, note: 'dryer 2 running 4°C below spec' },
      { id: 'LN-5', stage: 'Sorting', status: 'below', throughputKgHr: 0, note: 'idle — awaiting next drying batch' },
    ],
    gradeOutput: [
      { grade: 'BP1', kg: 2350, pct: 50 },
      { grade: 'PF1', kg: 940, pct: 20 },
      { grade: 'PD', kg: 705, pct: 15 },
      { grade: 'Dust', kg: 470, pct: 10 },
      { grade: 'Fannings', kg: 235, pct: 5 },
    ],
  },
  qualityHolds: [
    {
      id: 'QH-1',
      tone: 'warn',
      lotId: 'KTF-2026-0913',
      reason: 'Dryer 2 temperature 4°C below spec',
      kg: 1180,
      status: 'Awaiting re-test',
    },
    {
      id: 'QH-2',
      tone: 'default',
      lotId: 'KTF-2026-0910',
      reason: 'Moisture re-check requested by buyer QA',
      kg: 640,
      status: 'Cleared, pending release',
    },
  ],
  dispatch: {
    warehouseStockKg: 18400,
    stockByGrade: [
      { grade: 'BP1', kg: 9200 },
      { grade: 'PF1', kg: 4100 },
      { grade: 'PD', kg: 2900 },
      { grade: 'Dust', kg: 1400 },
      { grade: 'Fannings', kg: 800 },
    ],
    pendingLoads: [
      { id: 'DSP-1', destination: 'Mombasa auction', grade: 'BP1', kg: 4200, status: 'Loading' },
      { id: 'DSP-2', destination: 'Rift Valley Tea Co. (direct)', grade: 'PF1', kg: 1840, status: 'Scheduled' },
      { id: 'DSP-3', destination: 'Mombasa auction', grade: 'PD', kg: 1200, status: 'Scheduled' },
    ],
  },
}
