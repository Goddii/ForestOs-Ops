// National mock data for the Operations Manager — NTZDC head office's
// operations desk across every zone: tea (leaf, fleet, factories, offtake),
// conservation (fire, patrols, planting, survival), partnerships (KFS, KWS,
// CFAs, counties, factories, buyers, funders, certifier, payment and USSD
// rails, research institutes), people and payroll, incidents escalated to
// HQ, and spending referred up from the zones.
//
// Six zones, carried over (with their patrol counts, rejection rates and
// NDVI series) from the National Management role's data before that role
// was removed — the Operations Manager is now the console's one national
// view. South West Mau is not listed statically here: its row is computed
// from the live Zone Desk store (`operationsStore.js`), so an action taken on
// the SW Mau desk shows up on the national screens. The other five zones are
// static snapshots — in a real system each zone's desk would feed its own
// row the same way. "Today" is Mon 7 Sep 2026. Illustrative only.

export const NATIONAL = {
  today: 'Mon 7 Sep 2026',
  week: 'Week 37',
  // The Operations Manager's delegated authority per commitment; anything
  // above it goes to the Managing Director (and the Board's tender
  // committee) with his recommendation attached.
  approvalLimitKes: 2000000,
  mpesa: { floatKes: 6800000, note: 'B2C disbursement float held with Safaricom' },

  // Zone-mean NDVI, Sentinel-2 quarterly composite — the canopy outcome the
  // conservation work is judged by.
  ndviQuarters: ['Q1·24', 'Q2·24', 'Q3·24', 'Q4·24', 'Q1·25', 'Q2·25', 'Q3·25', 'Q4·25', 'Q1·26'],
  ndvi: {
    SWM: [0.55, 0.57, 0.56, 0.6, 0.63, 0.62, 0.66, 0.69, 0.71],
    EMAU: [0.52, 0.53, 0.54, 0.55, 0.57, 0.58, 0.6, 0.62, 0.64],
    CHER: [0.48, 0.47, 0.49, 0.5, 0.51, 0.52, 0.54, 0.55, 0.57],
    ABER: [0.6, 0.62, 0.63, 0.65, 0.66, 0.68, 0.7, 0.72, 0.74],
    MTK: [0.56, 0.57, 0.58, 0.6, 0.61, 0.63, 0.64, 0.66, 0.68],
    NAND: [0.5, 0.51, 0.51, 0.53, 0.54, 0.55, 0.57, 0.58, 0.6],
  },

  // Static per-zone operational snapshots for today. `desk` = whether the
  // zone's full desk is wired into this prototype (only SW Mau).
  zones: [
    {
      id: 'EMAU', name: 'Eastern Mau', lead: 'R. Chepkoech', factory: 'Mariashoni Tea Factory', county: 'Nakuru',
      leafKg: 3420, planKg: 3600, maxLeafAgeHrs: 2.4, fleet: { moving: 4, total: 4, down: 0 }, rejectionPct: 5.1, fineLeafPct: 71, pluckingOverdue: 1,
      rostered: 480, present: 437, devicesOffline: 0,
      payroll: { status: 'Released', grossKes: 1995000, workers: 480, settleDays: 6, unapproved: 0 }, disputes: 1, grievances: 0, injuriesMtd: 1,
      incidentsOpen: 2, incidentsCritical: 0,
      fire: { danger: 'High', watch: true, firebreakPct: 84 }, patrols: { done: 8, target: 12 }, planting: { allocatedPct: 62 }, survivalPct: 84, beaconsMissing: 1,
      headline: 'On plan. Pest scouting at two blocks.',
      status: 'clear',
    },
    {
      id: 'CHER', name: 'Cherangani Hills', lead: 'K. Kiplagat', factory: 'Kipchabo Tea Factory', county: 'Elgeyo-Marakwet',
      leafKg: 3950, planKg: 5200, maxLeafAgeHrs: 4.6, fleet: { moving: 3, total: 6, down: 2 }, rejectionPct: 6.8, fineLeafPct: 63, pluckingOverdue: 3,
      rostered: 760, present: 593, devicesOffline: 2,
      payroll: { status: 'Awaiting 2 blocks', grossKes: 3050000, workers: 760, settleDays: 10, unapproved: 2 }, disputes: 4, grievances: 2, injuriesMtd: 0,
      incidentsOpen: 4, incidentsCritical: 1,
      fire: { danger: 'High', watch: false, firebreakPct: 61 }, patrols: { done: 13, target: 18 }, planting: { allocatedPct: 35 }, survivalPct: 74, beaconsMissing: 6,
      headline: 'Two lorries in the garage — leaf 24% behind plan and aging. Charcoal kilns on the Kapolet edge.',
      status: 'below',
    },
    {
      id: 'ABER', name: 'Aberdare Range', lead: 'M. Wairimu', factory: 'Gatitu Tea Factory', county: 'Nyeri',
      leafKg: 2780, planKg: 2700, maxLeafAgeHrs: 2.0, fleet: { moving: 3, total: 4, down: 0 }, rejectionPct: 3.6, fineLeafPct: 77, pluckingOverdue: 0,
      rostered: 350, present: 333, devicesOffline: 0,
      payroll: { status: 'Released', grossKes: 1520000, workers: 350, settleDays: 5, unapproved: 0 }, disputes: 0, grievances: 0, injuriesMtd: 0,
      incidentsOpen: 1, incidentsCritical: 0,
      fire: { danger: 'Moderate', watch: false, firebreakPct: 100 }, patrols: { done: 6, target: 9 }, planting: { allocatedPct: 88 }, survivalPct: 90, beaconsMissing: 0,
      headline: 'Ahead of plan. One standby lorry free; nursery has surplus seedlings.',
      status: 'clear',
    },
    {
      id: 'MTK', name: 'Mount Kenya East', lead: 'J. Muriuki', factory: 'Kangaita Tea Factory', county: 'Kirinyaga',
      leafKg: 5100, planKg: 4600, maxLeafAgeHrs: 3.1, fleet: { moving: 5, total: 5, down: 0 }, rejectionPct: 4.4, fineLeafPct: 72, pluckingOverdue: 1,
      rostered: 690, present: 614, devicesOffline: 1,
      payroll: { status: 'Released', grossKes: 2860000, workers: 690, settleDays: 7, unapproved: 0 }, disputes: 1, grievances: 0, injuriesMtd: 1,
      incidentsOpen: 2, incidentsCritical: 0,
      fire: { danger: 'Moderate', watch: false, firebreakPct: 90 }, patrols: { done: 10, target: 15 }, planting: { allocatedPct: 70 }, survivalPct: 86, beaconsMissing: 2,
      headline: 'Peak flush — 111% of plan, and Kangaita factory is over capacity.',
      status: 'flagged',
    },
    {
      id: 'NAND', name: 'Nandi Hills', lead: 'P. Sang', factory: 'Kipchabo Tea Factory', county: 'Nandi',
      leafKg: 3300, planKg: 3900, maxLeafAgeHrs: 3.8, fleet: { moving: 3, total: 4, down: 1 }, rejectionPct: 5.9, fineLeafPct: 66, pluckingOverdue: 2,
      rostered: 540, present: 454, devicesOffline: 1,
      payroll: { status: 'Awaiting 1 block', grossKes: 2210000, workers: 540, settleDays: 9, unapproved: 1 }, disputes: 2, grievances: 1, injuriesMtd: 0,
      incidentsOpen: 3, incidentsCritical: 0,
      fire: { danger: 'High', watch: true, firebreakPct: 72 }, patrols: { done: 7, target: 12 }, planting: { allocatedPct: 48 }, survivalPct: 81, beaconsMissing: 3,
      headline: 'Feeder roads washed out on two routes — leaf behind plan. Lookout tower repair referred.',
      status: 'flagged',
    },
  ],

  // Green-leaf capacity per factory (t/day) against today's intake.
  factories: [
    { id: 'KPT', name: 'Kiptunga Tea Factory', zones: ['SWM'], capacityT: 9.0, intakeT: null, note: 'Intake = SW Mau leaf collected (live from the desk)' },
    { id: 'MSH', name: 'Mariashoni Tea Factory', zones: ['EMAU'], capacityT: 5.0, intakeT: 3.42, note: 'Running normally' },
    { id: 'KPC', name: 'Kipchabo Tea Factory', zones: ['CHER', 'NAND'], capacityT: 10.0, intakeT: 7.25, note: 'Waiting on late Cherangani loads' },
    { id: 'GTU', name: 'Gatitu Tea Factory', zones: ['ABER'], capacityT: 12.0, intakeT: 11.2, note: 'Includes outgrower leaf · solar array underperforming (Factory Manager)' },
    { id: 'KNG', name: 'Kangaita Tea Factory', zones: ['MTK'], capacityT: 4.9, intakeT: 5.1, note: 'Over capacity in the flush — withering troughs full by 14:00' },
  ],

  // Fleet a zone can lend for the week.
  spareLorries: [{ id: 'KCR 771B', zone: 'ABER', capacityKg: 3000, note: 'Standby at Gatitu depot' }],

  // Seedlings a zone's nursery holds beyond its own short-rains target, and
  // zones short of theirs.
  seedlings: {
    surplus: [
      { zone: 'ABER', qty: 1800, species: 'Mixed indigenous (Podo, cedar, olive)' },
      { zone: 'MTK', qty: 600, species: 'Prunus africana' },
    ],
    deficit: [
      { zone: 'CHER', qty: 2100 },
      { zone: 'NAND', qty: 900 },
    ],
  },

  // Incidents escalated to HQ from the static zones (SW Mau's come from the
  // desk store). `hqAction` is what HQ can bring that a zone can't.
  escalations: [
    { id: 'INC-CHER-0906-02', zone: 'CHER', type: 'Illegal charcoal kilns', location: 'Kapolet buffer edge · CHER-11', severity: 'Critical', reported: 'Sun 11:40', note: 'Four active kilns inside the buffer, 0.6 ha cleared. Zone scouts outnumbered; joint operation with KFS requested.', status: 'Escalated to HQ' },
    { id: 'INC-CHER-0905-04', zone: 'CHER', type: 'Grievance · late pay', location: 'Cherangani · 2 blocks', severity: 'High', reported: 'Sat 09:15', note: '38 workers via the USSD grievance line — pay taking 10 days to land. Same zone with two blocks unapproved this week.', status: 'Escalated to HQ' },
    { id: 'INC-MTK-0907-01', zone: 'MTK', type: 'Injury', location: 'Kangaita · weighbridge yard', severity: 'High', reported: '06:55 today', note: 'Worker struck by a reversing leaf lorry — fractured foot, taken to Kerugoya hospital. Statutory report filed by the zone.', status: 'Open' },
    { id: 'INC-ABER-0904-03', zone: 'ABER', type: 'Wildlife · elephants', location: 'Aberdare · ABER-02 fence line', severity: 'Medium', reported: 'Fri 22:10', note: 'Fence breached, 0.2 ha of tea trampled. KWS repaired the fence Saturday; compensation claim for the rows lost.', status: 'Open' },
    { id: 'INC-NAND-0903-02', zone: 'NAND', type: 'Road washout', location: 'Nandi · Kapsimotwa feeder road', severity: 'Medium', reported: 'Thu 16:30', note: 'Two leaf routes cut after the storm. Lorries detouring 38 km. Grading needs the county.', status: 'Open' },
  ],
  hqSupport: [
    { id: 'HQ-SEC', name: 'HQ security liaison with KFS & police' },
    { id: 'HQ-HR', name: 'HQ HR & employee relations' },
    { id: 'HQ-HS', name: 'HQ health & safety officer' },
    { id: 'HQ-LEGAL', name: 'HQ legal & compliance' },
    { id: 'HQ-COMMS', name: 'HQ communications' },
    { id: 'HQ-ENG', name: 'HQ engineering & fleet' },
  ],

  // Spending referred up from zones — above their ops limits.
  referrals: [
    { id: 'REF-CHER-012', zone: 'CHER', item: 'Replace 2 leaf lorries (12 years old, repeated gearbox failures)', valueKes: 14800000, line: 'Capital · fleet', requestedBy: 'K. Kiplagat', status: 'Pending' },
    { id: 'REF-CHER-011', zone: 'CHER', item: 'Hire 2 leaf lorries for 3 months while the fleet is repaired', valueKes: 1260000, line: 'Transport', requestedBy: 'K. Kiplagat', status: 'Pending' },
    { id: 'REF-MTK-007', zone: 'MTK', item: '40 casual pluckers for the 3-week flush', valueKes: 720000, line: 'Labour', requestedBy: 'J. Muriuki', status: 'Pending' },
    { id: 'REF-EMAU-004', zone: 'EMAU', item: 'Replace Sachangwan weighbridge (fails re-verification)', valueKes: 950000, line: 'Maintenance', requestedBy: 'R. Chepkoech', status: 'Pending' },
    { id: 'REF-ABER-006', zone: 'ABER', item: 'Nursery shade-net expansion — +20,000 seedling capacity', valueKes: 380000, line: 'Nursery', requestedBy: 'M. Wairimu', status: 'Pending' },
    { id: 'REF-NAND-009', zone: 'NAND', item: 'Repair Kapsimotwa fire lookout tower', valueKes: 240000, line: 'Fire & patrol', requestedBy: 'P. Sang', status: 'Pending' },
  ],

  // September field opex by zone (KES) — the zones' own lines rolled up.
  budgetByZone: [
    { zone: 'SWM', budgetKes: 2380000, spentKes: 1466000 },
    { zone: 'EMAU', budgetKes: 1900000, spentKes: 1210000 },
    { zone: 'CHER', budgetKes: 2600000, spentKes: 2390000 },
    { zone: 'ABER', budgetKes: 1500000, spentKes: 840000 },
    { zone: 'MTK', budgetKes: 2300000, spentKes: 1720000 },
    { zone: 'NAND', budgetKes: 2000000, spentKes: 1590000 },
  ],

  // Every external relationship the operation depends on. `obligation` is
  // the next thing owed either way; `action` is what the ops desk does next.
  partners: [
    { id: 'P-KFS', partner: 'Kenya Forest Service', kind: 'Government · forest authority', zones: 'All zones', agreement: 'Buffer-zone management MoU', obligation: 'Q3 joint patrol & encroachment report', due: '30 Sep', state: 'Due soon', action: 'Submit Q3 report' },
    { id: 'P-KWS', partner: 'Kenya Wildlife Service', kind: 'Government · wildlife', zones: 'ABER, MTK, SWM', agreement: 'Problem-animal response arrangement', obligation: 'Joint fence-line inspection · Aberdare', due: '18 Sep', state: 'On track', action: 'Confirm inspection team' },
    { id: 'P-CFA', partner: 'Community Forest Associations (6)', kind: 'Community', zones: 'One per zone', agreement: 'Participatory forest management plans', obligation: 'Cherangani CFA quarterly meeting — last held June', due: 'Overdue', state: 'Overdue', action: 'Schedule Cherangani meeting' },
    { id: 'P-COUNTY', partner: 'Nandi & Elgeyo-Marakwet county governments', kind: 'Government · county', zones: 'NAND, CHER', agreement: 'Feeder-road maintenance requests', obligation: 'Kapsimotwa road grading — no reply since 12 Aug', due: 'Overdue', state: 'Overdue', action: 'Send follow-up to county roads' },
    { id: 'P-FACT', partner: 'Kangaita Tea Factory', kind: 'Processing', zones: 'MTK', agreement: 'Green-leaf supply agreement', obligation: 'Flush capacity plan — factory over capacity', due: 'This week', state: 'At risk', action: 'Agree diversion plan' },
    { id: 'P-BUYER', partner: 'Highland Leaf Collective (direct buyer)', kind: 'Offtaker', zones: 'Via Gatitu & Kiptunga', agreement: 'Direct-sale contract · 12 t made tea / month', obligation: '7.4 t delivered of 12 t for September', due: '30 Sep', state: 'On track', action: 'Confirm October allocation' },
    { id: 'P-AUCTION', partner: 'Mombasa auction broker (EATTA member)', kind: 'Offtaker', zones: 'All factories', agreement: 'Brokerage for auction-channel tea', obligation: 'Sale 37 catalogue closes', due: 'Thu 10 Sep', state: 'Due soon', action: 'Confirm lots for Sale 37' },
    { id: 'P-ESG', partner: 'Corporate ESG partner', kind: 'Conservation funder', zones: 'All zones', agreement: 'Conservation fund · KES 4.2M / quarter', obligation: 'Q3 verified evidence pack — tranche 2 depends on survival data', due: '15 Oct', state: 'On track', action: 'Start Q3 evidence pack' },
    { id: 'P-RA', partner: 'Rainforest Alliance (certification)', kind: 'Certifier', zones: 'All zones', agreement: 'Certification · external audit November', obligation: 'Open non-conformity: PPE records at Tinet (SW Mau)', due: 'Before 11 Sep', state: 'At risk', action: 'Assign corrective action' },
    { id: 'P-MPESA', partner: 'Safaricom M-Pesa (Daraja B2C)', kind: 'Payment rail', zones: 'All zones', agreement: 'Bulk B2C disbursement', obligation: 'Float must cover Tuesday’s zone payrolls', due: 'Tue 8 Sep', state: 'At risk', action: 'Check float on People & Payroll' },
    { id: 'P-AT', partner: "Africa's Talking", kind: 'USSD & SMS', zones: 'All zones', agreement: 'USSD code *384*7# and SMS receipts', obligation: 'Shortcode renewal', due: '30 Sep', state: 'Due soon', action: 'Approve renewal' },
    { id: 'P-RES', partner: 'KALRO-TRI & KEFRI', kind: 'Research & seed supply', zones: 'All nurseries', agreement: 'Tea clones and indigenous seed supply', obligation: 'Long-rains 2027 seed order', due: '31 Oct', state: 'On track', action: 'Place seed order' },
  ],

  calendar: [
    { when: 'Tue 8 Sep', what: 'Zone payrolls land on M-Pesa', detail: 'SW Mau, Cherangani and Nandi batches still to release; float must cover them', to: 'people' },
    { when: 'Thu 10 Sep', what: 'Mombasa Sale 37 catalogue closes', detail: 'Confirm auction lots with the factories', to: 'partnerships' },
    { when: 'Fri 11 Sep', what: 'Certification internal inspection', detail: 'Kiptunga & Nessuit — PPE, chemical store, grievance log, buffer records', to: 'partnerships' },
    { when: 'Fri 18 Sep', what: 'KWS joint fence inspection · Aberdare', detail: 'After the ABER-02 elephant breach', to: 'partnerships' },
    { when: 'Wed 30 Sep', what: 'KFS Q3 joint patrol report due', detail: 'Patrol and encroachment figures from all six zones', to: 'partnerships' },
    { when: 'Mid-Oct', what: 'Short-rains planting window opens', detail: 'Seedlings in place in every zone before the first rains', to: 'conservation' },
    { when: 'Thu 15 Oct', what: 'Q3 evidence pack to the ESG partner', detail: 'Survival-adjusted tree counts unlock tranche 2', to: 'partnerships' },
  ],
}

/** Plan-weighted status tone for a zone row. */
export const ZONE_STATUS = { clear: 'On plan', flagged: 'Watch', below: 'Behind' }
