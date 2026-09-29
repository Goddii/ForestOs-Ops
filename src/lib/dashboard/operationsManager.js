// Mock data for the Operations Manager view — the zone's day-to-day
// execution desk. Where the Zone Manager asks "is this zone performing, and
// can I put my name on its data?" (monthly, assurance), the Operations
// Manager asks "is today running?" — leaf moving from collection centres to
// the factory before it spoils, supervisors mustered and synced, incidents
// crewed, field work and stores approved, and the weekly M-Pesa payroll batch
// released on time. Same zone (South West Mau), same six blocks and
// supervisors as `zoneManager.js`; leaf goes to Kiptunga Tea Factory, the
// facility `batchChain.js` already names for this zone.
//
// Grounded in records other roles already show rather than invented fresh:
// the Kiptunga north-edge fire (Zone Manager EXC-1), the TIN-04 edge
// clearing (Buffer Map's "both" agreement row), NES-10's over-ceiling
// output, the disputed ticket WT-2026-003871 and the Block Operations
// centre intakes. "Today" is the console's as-of date, Mon 7 Sep 2026.
// Illustrative only; no real figures.

export const OPERATIONS = {
  zoneId: 'SWM',
  name: 'South West Mau',
  code: 'SW-MAU',
  today: 'Mon 7 Sep 2026',
  factory: 'Kiptunga Tea Factory',
  // Green leaf starts to heat and ferment in the bag; factories grade down
  // leaf that reaches the weighbridge late. Warn at 4 h, hard limit 5 h.
  leafAge: { warnHrs: 4, limitHrs: 5 },

  // Collection centres, one per block. Collected = weighed in at the centre
  // today; awaiting = weighed but not yet on a lorry. The first four match
  // Block Operations' own centre board (`ntzdc.js`).
  centres: [
    { id: 'CC-KIP', block: 'KIP', name: 'Kiptunga', collectedKg: 1840, planKg: 2000, awaitingKg: 0, oldestLeafHrs: 0, lastPickup: '08:40' },
    { id: 'CC-NES', block: 'NES', name: 'Nessuit', collectedKg: 1210, planKg: 1400, awaitingKg: 0, oldestLeafHrs: 0, lastPickup: '08:15' },
    { id: 'CC-MAR', block: 'MAR', name: 'Marioshoni', collectedKg: 780, planKg: 900, awaitingKg: 0, oldestLeafHrs: 0, lastPickup: '08:15' },
    { id: 'CC-TIN', block: 'TIN', name: 'Tinet', collectedKg: 520, planKg: 700, awaitingKg: 520, oldestLeafHrs: 3.6, lastPickup: '—' },
    { id: 'CC-KIL', block: 'KIL', name: 'Kilimo', collectedKg: 0, planKg: 600, awaitingKg: 0, oldestLeafHrs: 0, lastPickup: '—' },
    { id: 'CC-SUR', block: 'SUR', name: 'Sururu', collectedKg: 410, planKg: 500, awaitingKg: 0, oldestLeafHrs: 0, lastPickup: '07:50' },
  ],

  // The zone's leaf fleet. `route` is the ordered centre run; `leafAgeHrs`
  // is the age of the oldest leaf on board.
  lorries: [
    { id: 'KDA 227P', driver: 'S. Rotich', capacityKg: 3000, route: ['CC-KIP'], loadKg: 1840, status: 'At factory', eta: 'Weighing', leafAgeHrs: 2.6 },
    { id: 'KCB 512K', driver: 'P. Kirui', capacityKg: 3000, route: ['CC-NES', 'CC-MAR'], loadKg: 1990, status: 'En route', eta: '10:40', leafAgeHrs: 2.1 },
    { id: 'KCD 118M', driver: 'J. Too', capacityKg: 2500, route: ['CC-SUR', 'CC-TIN'], loadKg: 410, status: 'Breakdown', eta: '—', leafAgeHrs: 3.4, note: 'Gearbox · stopped at Kaptagich junction 08:55 · Tinet not yet collected' },
    { id: 'KDE 044R', driver: 'M. Cheruiyot', capacityKg: 2500, route: ['CC-KIL'], loadKg: 0, status: 'Scheduled', eta: 'Departs 11:30', leafAgeHrs: 0, note: 'Held for Kilimo muster — first weigh-in not yet recorded' },
    { id: 'KBU 903L', driver: 'D. Langat', capacityKg: 3000, route: [], loadKg: 0, status: 'Standby', eta: '—', leafAgeHrs: 0, note: 'Zone depot, Elburgon' },
  ],

  // Today's muster per block, as reported by each supervisor's device.
  muster: [
    { block: 'KIP', name: 'Kiptunga', supervisor: 'J. Chirchir', rostered: 87, present: 84, musterClosed: '06:52', sync: 'Synced 08:41', syncOk: true },
    { block: 'NES', name: 'Nessuit', supervisor: 'B. Mutai', rostered: 142, present: 139, musterClosed: '06:47', sync: 'Synced 08:30', syncOk: true },
    { block: 'MAR', name: 'Marioshoni', supervisor: 'S. Njeri', rostered: 96, present: 88, musterClosed: '07:05', sync: 'Synced 08:12', syncOk: true },
    { block: 'TIN', name: 'Tinet', supervisor: 'A. Kones', rostered: 88, present: 61, musterClosed: '07:20', sync: 'Synced 09:05', syncOk: true, note: 'Third day under 75% turnout — last week’s payroll settled 11 days late' },
    { block: 'KIL', name: 'Kilimo', supervisor: 'E. Barasa', rostered: 104, present: 71, musterClosed: null, sync: 'Synced 08:10', syncOk: true, note: 'Muster still open' },
    { block: 'SUR', name: 'Sururu', supervisor: 'D. Kemboi', rostered: 98, present: 90, musterClosed: '06:58', sync: 'Offline 26 h', syncOk: false, note: 'Device last synced Sun 06:12 — Saturday’s tickets not yet on the server' },
  ],

  workOrders: [
    { id: 'WO-SWM-0415', type: 'Firebreak clearing', block: 'KIP', scope: 'North edge · 1.2 km', crew: 18, start: '2026-09-08', status: 'Requested', requestedBy: 'J. Chirchir', priority: 'High' },
    { id: 'WO-SWM-0412', type: 'Pruning cycle', block: 'MAR', scope: 'MAR-03 → MAR-07', crew: 24, start: '2026-09-14', status: 'Requested', requestedBy: 'S. Njeri', priority: 'Normal' },
    { id: 'WO-SWM-0409', type: 'Buffer planting', block: 'KIP', scope: 'KIP-12 · 400 indigenous seedlings', crew: 12, start: '2026-09-02', status: 'In progress', requestedBy: 'J. Chirchir', priority: 'Normal' },
    { id: 'WO-SWM-0410', type: 'Survival check', block: 'KIP', scope: 'KIP-09 · 6-month planting cohort', crew: 4, start: '2026-09-10', status: 'Scheduled', requestedBy: 'Ops desk', priority: 'Normal' },
    { id: 'WO-SWM-0413', type: 'Nursery potting', block: 'SUR', scope: 'Sururu nursery · 2,000 bags', crew: 8, start: '2026-09-09', status: 'Scheduled', requestedBy: 'D. Kemboi', priority: 'Normal' },
    { id: 'WO-SWM-0401', type: 'Weeding', block: 'TIN', scope: 'TIN-01 → TIN-05', crew: 20, start: '2026-08-31', status: 'Overdue', requestedBy: 'A. Kones', priority: 'Normal' },
  ],

  // Stores requisitions awaiting the ops desk. `onHand` is zone stores stock;
  // `unitKes` is the stores cost charged to the requisition's budget line
  // (seedlings from the zone's own nursery carry no purchase cost).
  requisitions: [
    { id: 'REQ-SWM-0336', item: 'Fire beaters & knapsack sprayers', qty: 20, unit: 'sets', unitKes: 4500, onHand: 12, block: 'KIP', forOrder: 'WO-SWM-0415', requestedBy: 'J. Chirchir', line: 'fire', status: 'Pending' },
    { id: 'REQ-SWM-0331', item: 'Indigenous seedlings (Prunus africana, Croton)', qty: 400, unit: 'seedlings', unitKes: 0, onHand: 2850, block: 'KIP', forOrder: 'WO-SWM-0409', requestedBy: 'J. Chirchir', line: 'nursery', status: 'Pending' },
    { id: 'REQ-SWM-0334', item: 'NPK 26:5:5 fertiliser', qty: 60, unit: 'bags', unitKes: 6800, onHand: 140, block: 'NES', forOrder: null, requestedBy: 'B. Mutai', line: 'inputs', status: 'Pending' },
    { id: 'REQ-SWM-0335', item: 'Diesel · leaf fleet', qty: 200, unit: 'litres', unitKes: 186, onHand: 480, block: null, forOrder: null, requestedBy: 'Transport', line: 'transport', status: 'Pending' },
    { id: 'REQ-SWM-0337', item: 'Gumboots & rain capes (PPE)', qty: 40, unit: 'pairs', unitKes: 1400, onHand: 65, block: 'TIN', forOrder: null, requestedBy: 'A. Kones', line: 'ppe', status: 'Pending' },
  ],

  // Delegated authority: the ops desk approves a requisition up to this
  // value; anything larger is referred to the Zone Manager.
  approvalLimitKes: 100000,

  // September operating budget by line (KES) — the zone's field opex. Worker
  // pay is its own run (Payroll Run), not a line here.
  budget: {
    month: 'September 2026',
    lines: [
      { id: 'transport', label: 'Transport & fuel', budgetKes: 620000, spentKes: 471000 },
      { id: 'inputs', label: 'Agro-inputs (fertiliser, crop protection)', budgetKes: 900000, spentKes: 512000 },
      { id: 'nursery', label: 'Nursery & planting', budgetKes: 280000, spentKes: 96000 },
      { id: 'fire', label: 'Fire & patrol', budgetKes: 220000, spentKes: 118000 },
      { id: 'maintenance', label: 'Fleet & scale maintenance', budgetKes: 240000, spentKes: 205000 },
      { id: 'ppe', label: 'Tools & PPE', budgetKes: 120000, spentKes: 64000 },
    ],
  },

  // Who the ops desk can send. KFS is external — a request, not a command.
  responders: [
    { id: 'RSP-FIRE-KIP', name: 'Kiptunga fire crew', kind: 'Fire', size: 12 },
    { id: 'RSP-SCOUT-TIN', name: 'Tinet community scouts', kind: 'Patrol', size: 6 },
    { id: 'RSP-AGRO', name: 'Zone agronomy officer', kind: 'Agronomy', size: 1 },
    { id: 'RSP-TECH', name: 'Weighbridge technician', kind: 'Equipment', size: 1 },
    { id: 'RSP-FIRSTAID', name: 'Zone first-aid officer', kind: 'Health & safety', size: 1 },
    { id: 'RSP-CLO', name: 'Community liaison officer', kind: 'Grievances', size: 1 },
    { id: 'RSP-KFS', name: 'KFS ranger post · Kiptunga (external)', kind: 'Enforcement', size: null, external: true },
    { id: 'RSP-KWS', name: 'KWS problem-animal unit (external)', kind: 'Wildlife', size: null, external: true },
  ],

  // Response targets for acknowledgement, by severity.
  slaMins: { Critical: 30, High: 240, Medium: 2880 },

  incidents: [
    { id: 'INC-SWM-0907-01', type: 'Fire', location: 'Kiptunga north edge · KIP-03/04', severity: 'Critical', reported: '06:41 today', reports: 3, source: 'USSD · 3 independent workers', status: 'Escalated', assigned: null, note: 'KFS notified 06:58 · awaiting ranger acknowledgement' },
    { id: 'INC-SWM-0907-02', type: 'Lorry breakdown', location: 'KCD 118M · Kaptagich junction', severity: 'High', reported: '08:55 today', reports: 1, source: 'Driver call-in', status: 'Open', assigned: null, note: '410 kg Sururu leaf on board; Tinet run not collected' },
    { id: 'INC-SWM-0906-03', type: 'Illegal logging', location: 'Tinet buffer edge · TIN-04', severity: 'High', reported: 'Sun 16:20', reports: 2, source: 'USSD · 2 reports', status: 'Open', assigned: null, note: 'Satellite shows 0.4 ha canopy loss on the same plot' },
    { id: 'INC-SWM-0905-04', type: 'Pest · Helopeltis', location: 'Tinet · TIN-02', severity: 'Medium', reported: 'Sat 10:05', reports: 1, source: 'Supervisor app', status: 'In progress', assigned: 'RSP-AGRO', note: 'Scouting done; spray plan due Tuesday' },
    { id: 'INC-SWM-0904-05', type: 'Scale fault', location: 'Nessuit centre weighbridge', severity: 'Medium', reported: 'Fri 14:30', reports: 1, source: 'Supervisor app', status: 'Open', assigned: null, note: 'Reads +3–4% against the check weight; calibration overdue since 12 Aug. May bear on the NES-10 over-ceiling investigation.' },
    { id: 'INC-SWM-0907-06', type: 'Injury', location: 'Kiptunga · KIP-07 pruning', severity: 'High', reported: '07:50 today', reports: 1, source: 'Supervisor app', status: 'In progress', assigned: 'RSP-FIRSTAID', note: 'RVT-1188 · deep cut to left hand from pruning knife. First aid on site, referred to Olenguruone sub-county hospital.', statutory: { label: 'Work-injury (WIBA) accident report', filed: false } },
    { id: 'INC-SWM-0906-07', type: 'Wildlife · buffalo', location: 'Sururu · SUR-04 buffer edge', severity: 'Medium', reported: 'Sun 05:30', reports: 2, source: 'USSD · 2 reports', status: 'Open', assigned: null, note: 'Small herd trampling tea rows at dawn, third night this week. Workers told not to pluck the edge rows before 08:00.' },
    { id: 'INC-SWM-0905-08', type: 'Grievance · late pay', location: 'Tinet block', severity: 'Medium', reported: 'Sat 16:00', reports: 14, source: 'USSD grievance line · 14 workers', status: 'Open', assigned: null, note: 'Workers report last week’s pay landed 11 days after the week closed. Same block with this week’s payroll unapproved and turnout under 75%.' },
    { id: 'INC-SWM-0830-09', type: 'Encroachment · grazing', location: 'Sururu · SUR-02', severity: 'Medium', reported: '30 Aug', reports: 1, source: 'USSD', status: 'Resolved', assigned: 'RSP-SCOUT-TIN', note: 'Cattle removed; owner cautioned by chief' },
  ],

  // Weekly worker payroll. Each block supervisor approves their own block
  // (maker); the ops desk checks and releases the zone batch to M-Pesa
  // (checker). A block that isn't approved can't be released.
  payroll: {
    ref: 'PAY-SWM-2026-W36',
    week: 'Week 36 · 31 Aug – 6 Sep 2026',
    payDate: 'Tue 8 Sep',
    rail: 'M-Pesa B2C',
    blocks: [
      { block: 'KIP', name: 'Kiptunga', supervisor: 'J. Chirchir', workers: 87, tickets: 1036, grossKes: 431200, approved: 'Sun 18:20' },
      { block: 'NES', name: 'Nessuit', supervisor: 'B. Mutai', workers: 142, tickets: 1702, grossKes: 702900, approved: 'Sun 17:05' },
      { block: 'MAR', name: 'Marioshoni', supervisor: 'S. Njeri', workers: 96, tickets: 1150, grossKes: 468300, approved: 'Sun 19:40' },
      { block: 'TIN', name: 'Tinet', supervisor: 'A. Kones', workers: 88, tickets: 1010, grossKes: 402600, approved: null, note: '2 disputed tickets awaiting supervisor review' },
      { block: 'KIL', name: 'Kilimo', supervisor: 'E. Barasa', workers: 104, tickets: 1240, grossKes: 515800, approved: 'Mon 07:15' },
      { block: 'SUR', name: 'Sururu', supervisor: 'D. Kemboi', workers: 98, tickets: 1170, grossKes: 479500, approved: 'Sat 20:10', note: 'Approved before Saturday’s tickets synced' },
    ],
    // Individual lines held out of the batch — held, never cancelled.
    held: [
      { id: 'WT-2026-003871', worker: 'RVT-0887', block: 'TIN', amountKes: 466, reason: 'Disputed kilos — worker reports 52 kg, ticket records 41 kg' },
      { id: 'PM-2026-W36-1502', worker: 'RVT-1502', block: 'NES', amountKes: 5120, reason: 'M-Pesa number failed validation — SIM re-registration pending' },
    ],
  },

  // Plucking rounds — how long since each block's plucking round last went
  // through. Stretching a round past its interval means bigger shoots, coarse
  // leaf and rejections at the centre (Tinet's 6.2% rejection rate on the
  // Block Operations screens is mostly coarse pluck). `fineLeafPct` is the
  // centre's fine-leaf count (two leaves and a bud); the factory wants ≥ 70%.
  plucking: {
    intervalDays: 10,
    fineLeafTargetPct: 70,
    blocks: [
      { block: 'KIP', lastRound: 'Mon 31 Aug', daysSince: 7, fineLeafPct: 76 },
      { block: 'NES', lastRound: 'Wed 2 Sep', daysSince: 5, fineLeafPct: 74 },
      { block: 'MAR', lastRound: 'Sat 29 Aug', daysSince: 9, fineLeafPct: 71 },
      { block: 'TIN', lastRound: 'Sat 22 Aug', daysSince: 16, fineLeafPct: 58 },
      { block: 'KIL', lastRound: 'Wed 26 Aug', daysSince: 12, fineLeafPct: 67 },
      { block: 'SUR', lastRound: 'Tue 1 Sep', daysSince: 6, fineLeafPct: 73 },
    ],
  },

  // What keeps the fleet legal and the scales honest. A weighbridge without a
  // current Weights & Measures certificate can't be trusted for pay or for
  // the traceability chain.
  assets: {
    fleet: [
      { id: 'KDA 227P', serviceDue: 'in 1,200 km', serviceOk: true, inspection: 'Mar 2027', inspectionOk: true, fuelL100km: 24 },
      { id: 'KCB 512K', serviceDue: 'overdue by 300 km', serviceOk: false, inspection: 'Jan 2027', inspectionOk: true, fuelL100km: 29 },
      { id: 'KCD 118M', serviceDue: 'gearbox repair', serviceOk: false, inspection: 'Nov 2026', inspectionOk: true, fuelL100km: 31 },
      { id: 'KDE 044R', serviceDue: 'in 3,400 km', serviceOk: true, inspection: 'Jun 2027', inspectionOk: true, fuelL100km: 23 },
      { id: 'KBU 903L', serviceDue: 'in 2,100 km', serviceOk: true, inspection: 'expires 20 Sep', inspectionOk: false, fuelL100km: 25 },
    ],
    scales: [
      { id: 'SC-KIP', centre: 'Kiptunga', certificate: 'Valid to Mar 2027', ok: true },
      { id: 'SC-NES', centre: 'Nessuit', certificate: 'Expired 12 Aug', ok: false },
      { id: 'SC-MAR', centre: 'Marioshoni', certificate: 'Valid to Feb 2027', ok: true },
      { id: 'SC-TIN', centre: 'Tinet', certificate: 'Expires 30 Sep', ok: false },
      { id: 'SC-KIL', centre: 'Kilimo', certificate: 'Valid to Dec 2026', ok: true },
      { id: 'SC-SUR', centre: 'Sururu', certificate: 'Valid to Apr 2027', ok: true },
    ],
  },

  // The buffer's ground work — what the Zone Manager's satellite Buffer Map
  // can only see after the fact. Fire readiness, patrols, the nursery and
  // planting programme, whether planted trees actually survive, and the
  // boundary beacons that the registry's plot geometry depends on.
  conservation: {
    fireDanger: { rating: 'High', dryDays: 18, source: 'KMD 5-day outlook', note: 'Unusually dry September — 18 days without meaningful rain. Short rains not expected before mid-October.' },
    firebreaks: [
      { block: 'KIP', requiredKm: 4.2, clearedKm: 2.1, lastCleared: 'Jun' },
      { block: 'NES', requiredKm: 3.0, clearedKm: 3.0, lastCleared: 'Aug' },
      { block: 'MAR', requiredKm: 2.6, clearedKm: 2.2, lastCleared: 'Jul' },
      { block: 'TIN', requiredKm: 3.4, clearedKm: 1.5, lastCleared: 'May' },
      { block: 'KIL', requiredKm: 2.0, clearedKm: 2.0, lastCleared: 'Aug' },
      { block: 'SUR', requiredKm: 2.2, clearedKm: 1.8, lastCleared: 'Jul' },
    ],
    // Patrols along each block's forest edge, this week (Mon–Sun).
    patrolsPerWeek: 3,
    patrols: [
      { block: 'KIP', done: 2, scheduled: [] },
      { block: 'NES', done: 3, scheduled: [] },
      { block: 'MAR', done: 2, scheduled: [] },
      { block: 'TIN', done: 1, scheduled: [] },
      { block: 'KIL', done: 2, scheduled: [] },
      { block: 'SUR', done: 1, scheduled: [] },
    ],
    // Zone nursery at Sururu. `ready` = hardened off and plantable.
    season: 'Short rains 2026 · window opens mid-October',
    nursery: [
      { species: 'Prunus africana (Red stinkwood)', ready: 1240, hardening: 600 },
      { species: 'Juniperus procera (African pencil cedar)', ready: 410, hardening: 900 },
      { species: 'Podocarpus latifolius (Podo)', ready: 520, hardening: 300 },
      { species: 'Olea africana (African olive)', ready: 680, hardening: 250 },
      { species: 'Dombeya torrida', ready: 630, hardening: 0 },
      { species: 'Tea clones TRFK 6/8 · infilling', ready: 3200, hardening: 1800 },
    ],
    // Short-rains planting targets per block — indigenous trees for the
    // buffer edge, tea clones for infilling gaps in the rows.
    planting: [
      { block: 'KIP', treeTarget: 600, pitsDug: 420, allocated: 0 },
      { block: 'NES', treeTarget: 350, pitsDug: 350, allocated: 0 },
      { block: 'MAR', treeTarget: 400, pitsDug: 150, allocated: 0 },
      { block: 'TIN', treeTarget: 800, pitsDug: 90, allocated: 0 },
      { block: 'KIL', treeTarget: 300, pitsDug: 300, allocated: 0 },
      { block: 'SUR', treeTarget: 250, pitsDug: 200, allocated: 0 },
    ],
    // A tree counts when it survives, not when it goes in. Checks at 3, 6
    // and 12 months; under 80% survival, the gaps are replanted ("beating up").
    survivalTargetPct: 80,
    cohorts: [
      { id: 'COH-KIP-09-2604', plot: 'KIP-09', season: 'Long rains Apr 2026', planted: 520, lastCheck: '3-month', survivalPct: 91, nextCheck: '6-month', nextDue: 'Thu 10 Sep', status: 'Due' },
      { id: 'COH-TIN-03-2604', plot: 'TIN-03', season: 'Long rains Apr 2026', planted: 300, lastCheck: '3-month', survivalPct: 68, nextCheck: '6-month', nextDue: 'Oct', status: 'Below target' },
      { id: 'COH-KIP-12-2511', plot: 'KIP-12', season: 'Short rains Nov 2025', planted: 400, lastCheck: '6-month', survivalPct: 86, nextCheck: '12-month', nextDue: 'Nov', status: 'On track' },
      { id: 'COH-MAR-05-2511', plot: 'MAR-05', season: 'Short rains Nov 2025', planted: 350, lastCheck: '6-month', survivalPct: 88, nextCheck: '12-month', nextDue: 'Nov', status: 'On track' },
      { id: 'COH-SUR-02-2504', plot: 'SUR-02', season: 'Long rains Apr 2025', planted: 280, lastCheck: '12-month', survivalPct: 79, nextCheck: 'Done', nextDue: '—', status: 'Below target' },
    ],
    beacons: { total: 214, inspectedThisQuarter: 162, missing: 3, damaged: 5, where: 'TIN-04 (2 missing), SUR-04 (1 missing), damaged along the Nessuit–Marioshoni edge' },
  },

  // What's coming at the ops desk over the next weeks.
  calendar: [
    { when: 'Tue 8 Sep', what: 'Week 36 pay date', detail: 'M-Pesa B2C batch must be released by 10:00 to land same day', to: 'payroll' },
    { when: 'Thu 10 Sep', what: 'KIP-09 six-month survival check', detail: '520 trees planted in the April long rains', to: 'conservation' },
    { when: 'Fri 11 Sep', what: 'Certification internal inspection', detail: 'Rainforest Alliance checklist · Kiptunga and Nessuit — PPE, chemical store, grievance log, buffer records', to: 'incidents' },
    { when: 'Mon 14 Sep', what: 'Community Forest Association meeting', detail: 'Kiptunga CFA, with KFS — patrol roster and the TIN-04 logging', to: 'conservation' },
    { when: 'Wed 30 Sep', what: 'Tinet weighbridge certificate expires', detail: 'Weights & Measures re-verification must be booked before then', to: 'logistics' },
    { when: 'Mid-Oct', what: 'Short-rains planting window opens', detail: 'Seedlings allocated and pits dug in every block before the first rains', to: 'conservation' },
  ],
}

export const blockName = (id) => OPERATIONS.muster.find((m) => m.block === id)?.name ?? id
export const centreName = (id) => OPERATIONS.centres.find((c) => c.id === id)?.name ?? id
export const responderName = (id) => OPERATIONS.responders.find((r) => r.id === id)?.name ?? '—'
