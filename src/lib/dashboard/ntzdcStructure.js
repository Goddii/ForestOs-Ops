// NTZDC structure: the 18 buffer zones, the belts by forest reserve, the region
// roll-ups and the assignment of the sector's sample plots to zones.
//
// Source for the zone and belt figures: NTZDC Annual Report FY2021/22, Table I
// (position at end June 2022) and its belt table. The source's own oddities are
// kept visible in `notes` and are never "fixed". The region grouping and the
// counties are ASSUMED / INFERRED (see each field); the per-zone belt lengths
// for the Mau Complex are DERIVED, not published; the plot-to-zone assignment
// is ILLUSTRATIVE. This module is pure data: it imports nothing and runs under
// plain Node as well as in the browser.

const round1 = (n) => Math.round(n * 10) / 10
const round2 = (n) => Math.round(n * 100) / 100
const sum1 = (values) => round1(values.reduce((total, v) => total + v, 0))

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const key of Object.keys(value)) deepFreeze(value[key])
  }
  return value
}

export const REGION_IDS = ['eastern', 'south_rift', 'north_rift']

/** Region labels. The grouping itself is an ASSUMPTION: Eastern = Aberdares + Mt Kenya & Nyambene; South Rift = Mau Complex; North Rift = the rest. */
export const REGION_LABEL = { eastern: 'Eastern', south_rift: 'South Rift', north_rift: 'North Rift' }

export const STRUCTURE_SOURCE = {
  report: 'NTZDC Annual Report FY2021/22, Table I (position at end June 2022)',
  zoneCountNote:
    'The website lists 22 buffer zones; this console uses the annual report’s 18 because it is the only source with hectares per zone.',
  regionNote: 'Region grouping is assumed. Counties are inferred from place names.',
}

const NO_COUNTY = 'County left blank: the zone spans counties or the place name is unclear.'

// `totalHa` is as printed in the source, never recomputed.
const ZONE_ROWS = [
  { zoneId: 'ABD-KIA', name: 'Kiambu', forestBlock: 'Aberdares', regionId: 'eastern', county: 'Kiambu', teaHa: 182.8, treesHa: 436, totalHa: 616, notes: ['Tea + trees = 618.8 ha, but the source prints a total of 616 ha.'] },
  { zoneId: 'ABD-MUR', name: "Murang'a", forestBlock: 'Aberdares', regionId: 'eastern', county: "Murang'a", teaHa: 133, treesHa: 82, totalHa: 215, notes: [] },
  { zoneId: 'ABD-NYE', name: 'Nyeri', forestBlock: 'Aberdares', regionId: 'eastern', county: 'Nyeri', teaHa: 187, treesHa: 80, totalHa: 267, notes: [] },
  { zoneId: 'MTK-MAT', name: 'Mathira', forestBlock: 'Mt Kenya & Nyambene', regionId: 'eastern', county: 'Nyeri', teaHa: 121, treesHa: 140, totalHa: 261, notes: [] },
  { zoneId: 'MTK-KIR', name: 'Kirinyaga', forestBlock: 'Mt Kenya & Nyambene', regionId: 'eastern', county: 'Kirinyaga', teaHa: 244.5, treesHa: 42, totalHa: 286.5, notes: ['The extracted text of the source was ambiguous; resolved by arithmetic (244.5 + 42 = 286.5).'] },
  { zoneId: 'MTK-EMB', name: 'Embu', forestBlock: 'Mt Kenya & Nyambene', regionId: 'eastern', county: 'Embu', teaHa: 180, treesHa: 62, totalHa: 242, notes: [] },
  { zoneId: 'MTK-MES', name: 'Meru South', forestBlock: 'Mt Kenya & Nyambene', regionId: 'eastern', county: 'Tharaka-Nithi', teaHa: 127, treesHa: 34, totalHa: 161, notes: [] },
  { zoneId: 'MTK-MEC', name: 'Meru Central', forestBlock: 'Mt Kenya & Nyambene', regionId: 'eastern', county: 'Meru', teaHa: 295, treesHa: 118, totalHa: 413, notes: [] },
  { zoneId: 'MAU-OLE', name: 'Olenguruone', forestBlock: 'Mau Complex', regionId: 'south_rift', county: 'Nakuru', teaHa: 222, treesHa: 178, totalHa: 400, notes: [] },
  { zoneId: 'MAU-NYA', name: 'Nyangores', forestBlock: 'Mau Complex', regionId: 'south_rift', county: 'Bomet', teaHa: 176, treesHa: 97, totalHa: 273, notes: [] },
  { zoneId: 'MAU-KER', name: 'Kericho', forestBlock: 'Mau Complex', regionId: 'south_rift', county: 'Kericho', teaHa: 216, treesHa: 142, totalHa: 358, notes: [] },
  { zoneId: 'MAU-KUR', name: 'Kuresoi', forestBlock: 'Mau Complex', regionId: 'south_rift', county: 'Nakuru', teaHa: 235, treesHa: 0, totalHa: 235, notes: ['No tree area recorded in the source.'] },
  { zoneId: 'KAK-KAK', name: 'Kakamega', forestBlock: 'Kakamega', regionId: 'north_rift', county: 'Kakamega', teaHa: 262, treesHa: 584, totalHa: 846, notes: [] },
  { zoneId: 'ELG-KAP', name: 'Mt Elgon (Kapsokwony/Saboti)', forestBlock: 'Mt Elgon', regionId: 'north_rift', county: null, teaHa: 242.8, treesHa: 800, totalHa: 1042.8, notes: [NO_COUNTY] },
  { zoneId: 'CHE-KAP', name: 'Cherangani (Kapcherop)', forestBlock: 'Cherangani', regionId: 'north_rift', county: null, teaHa: 143, treesHa: 370, totalHa: 513, notes: [NO_COUNTY] },
  { zoneId: 'KTG-KTK', name: 'Kaptagat (Kaptarakwa)', forestBlock: 'Kaptagat', regionId: 'north_rift', county: null, teaHa: 190, treesHa: 612, totalHa: 802, notes: [NO_COUNTY] },
  { zoneId: 'NAN-NOR', name: 'Nandi North', forestBlock: 'Nandi North', regionId: 'north_rift', county: 'Nandi', teaHa: 463, treesHa: 710, totalHa: 1173, notes: [] },
  { zoneId: 'NAN-SOU', name: 'Nandi South', forestBlock: 'Nandi South', regionId: 'north_rift', county: 'Nandi', teaHa: 428, treesHa: 748, totalHa: 1176, notes: [] },
]

/**
 * Printed totals and the sums of the rows, stored separately: the rows sum to
 * 4,048.1 ha of tea (19.6 ha short of the printed total), trees match, and the
 * printed row totals sum to 9,280.3 against a printed 9,302.7. Neither is
 * "the" figure without the note.
 */
export const ZONE_TOTALS = {
  printed: { teaHa: 4067.7, treesHa: 5235.0, totalHa: 9302.7 },
  rowSums: {
    teaHa: sum1(ZONE_ROWS.map((z) => z.teaHa)),
    treesHa: sum1(ZONE_ROWS.map((z) => z.treesHa)),
    totalHa: sum1(ZONE_ROWS.map((z) => z.totalHa)),
  },
  notes: [
    'The tea rows sum to 4,048.1 ha; the source prints 4,067.7 ha (19.6 ha higher).',
    'The tree rows sum to the printed 5,235.0 ha.',
    'The printed row totals sum to 9,280.3 ha; the source prints 9,302.7 ha, and its belt table gives 9,289 ha.',
  ],
}

/** Buffer belts by forest reserve, as printed. Length is hectares ÷ 10 (a 100 m belt has 10 ha per km); Nyambene is the one printed exception. */
export const BELTS = [
  { id: 'aberdare', reserve: 'Aberdare', regionId: 'eastern', bufferHa: 1093, lengthKm: 109.3, notes: [] },
  { id: 'mt_kenya', reserve: 'Mt Kenya', regionId: 'eastern', bufferHa: 1302, lengthKm: 130.2, notes: [] },
  { id: 'nyambene', reserve: 'Nyambene', regionId: 'eastern', bufferHa: 113, lengthKm: 11.25, notes: ['Printed as 11.25 km; hectares ÷ 10 gives 11.3 km.'] },
  { id: 'mau_complex', reserve: 'Mau Complex', regionId: 'south_rift', bufferHa: 1293, lengthKm: 129.3, notes: [] },
  { id: 'mt_elgon', reserve: 'Mt Elgon', regionId: 'north_rift', bufferHa: 1021, lengthKm: 102.1, notes: [] },
  { id: 'cherangani', reserve: 'Cherangani', regionId: 'north_rift', bufferHa: 495, lengthKm: 49.5, notes: [] },
  { id: 'kakamega', reserve: 'Kakamega', regionId: 'north_rift', bufferHa: 846, lengthKm: 84.6, notes: [] },
  { id: 'nandi_north', reserve: 'Nandi North', regionId: 'north_rift', bufferHa: 1191, lengthKm: 119.1, notes: [] },
  { id: 'nandi_south', reserve: 'Nandi South', regionId: 'north_rift', bufferHa: 1200, lengthKm: 120, notes: [] },
  { id: 'kaptagat', reserve: 'Kaptagat', regionId: 'north_rift', bufferHa: 735, lengthKm: 73.5, notes: [] },
]

/** Totals as printed in the belt table. */
export const BELT_TOTALS = { bufferHa: 9289, lengthKm: 928.85 }

/** Belt length by region, rolled up from the printed kilometres. */
export const REGION_BELT_KM = Object.fromEntries(
  REGION_IDS.map((regionId) => [
    regionId,
    round2(BELTS.filter((b) => b.regionId === regionId).reduce((total, b) => total + b.lengthKm, 0)),
  ]),
)

/**
 * Largest-remainder allocation of `totalUnits` across `weights`: integer
 * shares that sum exactly to the total. Ties go to the earlier entry.
 */
function allocateLargestRemainder(totalUnits, weights) {
  const weightSum = weights.reduce((a, b) => a + b, 0)
  const exact = weights.map((w) => (totalUnits * w) / weightSum)
  const shares = exact.map(Math.floor)
  let left = totalUnits - shares.reduce((a, b) => a + b, 0)
  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  for (let i = 0; left > 0; i += 1, left -= 1) shares[order[i].index] += 1
  return shares
}

const MAU_ZONE_IDS = ZONE_ROWS.filter((z) => z.forestBlock === 'Mau Complex').map((z) => z.zoneId)
const MAU_BELT = BELTS.find((b) => b.id === 'mau_complex')
const mauUnits = allocateLargestRemainder(
  Math.round(MAU_BELT.lengthKm * 10),
  MAU_ZONE_IDS.map((id) => ZONE_ROWS.find((z) => z.zoneId === id).totalHa),
)

/**
 * DERIVED, not published: the Mau Complex's 129.3 km allocated to its four
 * zones pro rata to zone hectares, to 0.1 km by largest remainder.
 */
export const MAU_BELT_KM = Object.fromEntries(MAU_ZONE_IDS.map((id, i) => [id, mauUnits[i] / 10]))

const mauZoneHa = MAU_ZONE_IDS.reduce((total, id) => total + ZONE_ROWS.find((z) => z.zoneId === id).totalHa, 0)

/** The zone table's Mau total differs from the belt table's; both are kept, neither is reconciled. */
export const MAU_RECONCILIATION = {
  zoneTotalHa: mauZoneHa,
  beltHa: MAU_BELT.bufferHa,
  differenceHa: MAU_BELT.bufferHa - mauZoneHa,
}

/** The 18 zones. `beltKm` is DERIVED for the Mau zones only and null elsewhere. */
export const ZONES = ZONE_ROWS.map((z) => ({
  ...z,
  beltKm: MAU_BELT_KM[z.zoneId] ?? null,
  notes: MAU_BELT_KM[z.zoneId] === undefined ? z.notes : [...z.notes, 'Belt length is derived pro rata to zone hectares, not published.'],
}))

/** ILLUSTRATIVE: the sector's 18 sample plots assigned to the four Mau zones by place name. The place names are mock, not surveyed. */
export const PLOT_ZONE = {
  'KIP-01': 'MAU-OLE',
  'NES-02': 'MAU-OLE',
  'KIP-09': 'MAU-OLE',
  'NES-10': 'MAU-OLE',
  'KIP-17': 'MAU-OLE',
  'NES-18': 'MAU-OLE',
  'MAR-03': 'MAU-NYA',
  'SUR-07': 'MAU-NYA',
  'MAR-11': 'MAU-NYA',
  'SUR-15': 'MAU-NYA',
  'TIN-04': 'MAU-KER',
  'KIL-05': 'MAU-KER',
  'TER-06': 'MAU-KER',
  'TIN-12': 'MAU-KER',
  'KIL-13': 'MAU-KER',
  'TER-14': 'MAU-KER',
  'LIK-08': 'MAU-KUR',
  'LIK-16': 'MAU-KUR',
}

/** The short code of a zone id: `MAU-OLE` → `OLE`. */
export function zoneCode(zoneId) {
  return String(zoneId).split('-')[1] ?? String(zoneId)
}

deepFreeze(ZONE_TOTALS)
deepFreeze(BELTS)
deepFreeze(BELT_TOTALS)
deepFreeze(REGION_BELT_KM)
deepFreeze(MAU_BELT_KM)
deepFreeze(MAU_RECONCILIATION)
deepFreeze(ZONES)
deepFreeze(PLOT_ZONE)
deepFreeze(REGION_LABEL)
deepFreeze(REGION_IDS)
deepFreeze(STRUCTURE_SOURCE)
