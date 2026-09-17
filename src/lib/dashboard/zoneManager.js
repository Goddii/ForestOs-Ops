// Mock data for the Zone Manager view — one zone, several blocks. Sits between
// Block Operations (single block) and National Management (every zone) in the
// org hierarchy; see DESIGN.md. Sourced from frames.html's Z1-Z5 mockups.
// Illustrative only; no real figures.

export const ZONE = {
  id: 'SWM',
  name: 'South West Mau',
  code: 'SW-MAU',
  month: 'September 2026',
  workers: 1180,
  kpis: {
    greenLeafT: 98.4,
    greenLeafTargetPct: 94,
    laborCostPerKg: 26.1,
    laborCostDeltaPct: 3.2,
    bufferVerifiedPct: 87,
    plotsOnWatch: 14,
    settledOnTimePct: 92,
    settledOnTimeCount: 1086,
    settledTotalCount: 1180,
  },
  blocks: [
    { id: 'KIP', name: 'Kiptunga', supervisor: 'J. Chirchir', workers: 87, greenLeafKg: 21400, yieldPerHa: 2140, costPerKg: 24.8, ticketLotPct: 99.9, claimsVerifiedPct: 94, status: 'clear' },
    { id: 'NES', name: 'Nessuit', supervisor: 'B. Mutai', workers: 142, greenLeafKg: 28100, yieldPerHa: 3410, costPerKg: 22.1, ticketLotPct: 97.2, claimsVerifiedPct: 82, status: 'flagged' },
    { id: 'MAR', name: 'Marioshoni', supervisor: 'S. Njeri', workers: 96, greenLeafKg: 17200, yieldPerHa: 1980, costPerKg: 25.4, ticketLotPct: 99.8, claimsVerifiedPct: 91, status: 'clear' },
    { id: 'TIN', name: 'Tinet', supervisor: 'A. Kones', workers: 88, greenLeafKg: 14600, yieldPerHa: 1610, costPerKg: 29.7, ticketLotPct: 99.6, claimsVerifiedPct: 88, status: 'below' },
    { id: 'KIL', name: 'Kilimo', supervisor: 'E. Barasa', workers: 104, greenLeafKg: 9800, yieldPerHa: 1890, costPerKg: 26.0, ticketLotPct: 99.7, claimsVerifiedPct: 96, status: 'clear' },
    { id: 'SUR', name: 'Sururu', supervisor: 'D. Kemboi', workers: 98, greenLeafKg: 7300, yieldPerHa: 1740, costPerKg: 27.3, ticketLotPct: 99.9, claimsVerifiedPct: 93, status: 'clear' },
  ],
  exceptions: [
    { id: 'EXC-1', tone: 'critical', tag: 'Now', title: 'Fire escalated · Kiptunga north edge', detail: '3 independent reports · KFS notified 06:58 · awaiting ranger ack', block: 'KIP' },
    { id: 'EXC-2', tone: 'warn', tag: 'Investigate', title: 'Nessuit block · output above agronomic ceiling', detail: 'NES-10 · 4 days running · possible in-bought leaf', block: 'NES' },
    { id: 'EXC-3', tone: 'default', tag: 'Sign', title: 'August sign-off outstanding', detail: '2,412 tickets · 30 lots · 1,180 payments awaiting your attestation', block: null },
  ],
  buffer: {
    lastPass: '14 Sep',
    cloudPct: 4.1,
    baseline: '31 Dec 2020',
    ndviNow: 0.71,
    ndviDeltaVsBaseline: 0.13,
    plotCount: 18,
    plotsFlagged: 1,
    agreement: [
      { plot: 'TIN-04', label: 'edge clearing', satellite: '0.4 ha loss', ground: '2 logging reports', tag: 'Both', tagTone: 'critical' },
      { plot: 'NES-10', label: 'canopy drift', satellite: '−1 pp', ground: 'no reports', tag: 'Satellite only', tagTone: 'warn' },
      { plot: 'KIP-12', label: 'planting recovery', satellite: '+0.08 NDVI', ground: '103 trees verified', tag: 'Both', tagTone: 'positive' },
    ],
  },
  pay: {
    recordCount: 28400,
    medianWeeklyPay: 4980,
    medianWeeklyPayDeltaPct: 6.1,
    conservationPremiumPerKg: 18.4,
    totalPerKg: 228,
    settledWithin7dPct: 92,
    womenPct: 61,
    womenPayGapPct: -4.2,
    beltComparison: [
      { belt: 'Western belt', subtitle: 'Mau · Cherangany · Elgon', ratePerKg: 18.4, widthPct: 100, note: '7-day settlement · 94% coverage' },
      { belt: 'Eastern belt', subtitle: 'Aberdares · Mt Kenya', ratePerKg: 16.9, widthPct: 92, note: '9-day settlement · 88% coverage', tone: 'warn' },
    ],
    rateByBlock: [
      { block: 'Kiptunga', basePerKg: 24.0, premiumPerKg: 18.4, settleDays: 6, vsZonePct: 2.1 },
      { block: 'Nessuit', basePerKg: 24.0, premiumPerKg: 18.4, settleDays: 7, vsZonePct: 0.0 },
      { block: 'Marioshoni', basePerKg: 23.5, premiumPerKg: 18.4, settleDays: 7, vsZonePct: -1.4 },
      { block: 'Tinet', basePerKg: 22.8, premiumPerKg: 16.9, settleDays: 11, vsZonePct: -7.8 },
      { block: 'Kilimo', basePerKg: 24.0, premiumPerKg: 18.4, settleDays: 6, vsZonePct: 1.9 },
    ],
  },
  signoff: {
    ref: 'SGN-SWMAU-2026-09',
    period: '1–30 September 2026',
    status: 'Awaiting attestation',
    tickets: 2412,
    blocks: 6,
    workers: 1180,
    dayLotsReconciled: 30,
    claimsVerified: 41,
    paymentsSettled: 1180,
    openExceptions: [
      'NES-10 above agronomic ceiling — 4 days. Under investigation; leaf from this plot excluded from the export pack for this period.',
      '1 payment dispute unresolved — WT-…3871. Payment held, not cancelled.',
    ],
    attestation:
      'I confirm the records in this period were captured under my supervision and reviewed for the exceptions listed.',
    signer: { name: 'David Kemei', id: 'ZM-SWMAU-01', role: 'Zone manager, SW-MAU', recordHash: 'sha256:9f2c…a41e' },
  },
}
