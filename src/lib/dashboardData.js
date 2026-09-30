// Mock data for the NTZDC operations console. Illustrative only — there is
// no ForestOS backend and none of these figures are real, with one exception:
// the forest outline below is real geography (see geo/swMauOutline.js).

import { SW_MAU_OUTLINE } from './geo/swMauOutline.js'
import { makeOutline } from './geo/outline.js'
import { PLOT_ZONE } from './dashboard/ntzdcStructure.js'

// ── Sector geography — the covenant area this console operates ────────────
// The sector is the South West Mau Forest as mapped in OpenStreetMap (about a
// third of the gazetted reserve). Its outline, bounding box and centre are
// real. Everything placed inside it (plots, NDVI shading, collection-centre
// pins) is illustrative and positioned relative to that outline.
export const SECTOR_OUTLINE = makeOutline(SW_MAU_OUTLINE.rings)

const { bounds } = SECTOR_OUTLINE
const floor4 = (n) => Math.floor(n * 1e4) / 1e4
const ceil4 = (n) => Math.ceil(n * 1e4) / 1e4
const mid4 = (a, b) => Math.round(((a + b) / 2) * 1e4) / 1e4

export const SECTOR = {
  name: 'South West Mau Sector',
  code: 'SW-MAU',
  block: 'Kiptunga Block',
  center: { lon: mid4(bounds.west, bounds.east), lat: mid4(bounds.south, bounds.north) },
  // Rounded outward so the box always contains the outline.
  bbox: { west: floor4(bounds.west), south: floor4(bounds.south), east: ceil4(bounds.east), north: ceil4(bounds.north) },
  outline: {
    name: SW_MAU_OUTLINE.name,
    osm: SW_MAU_OUTLINE.osm,
    attribution: SW_MAU_OUTLINE.attribution,
    licence: SW_MAU_OUTLINE.licence,
    areaHa: Math.round(SECTOR_OUTLINE.areaHa),
  },
  // Camera framing for the tilted 3D view, relative to the centre. Cesium's 60°
  // field of view is horizontal on a wide panel and the tilt squeezes the far
  // (north) end, so the camera sits high and well south to fit the whole 24 km
  // outline: at 30 km and pitch -63° the outline reaches 93% of the frame's
  // half-height on a 1.65:1 panel (checked by projecting every outline vertex).
  flight: {
    start: { lon: mid4(bounds.west, bounds.east), lat: mid4(bounds.south, bounds.north) - 0.095, height: 60000, pitchDeg: -80, headingDeg: 0 },
    target: { lon: mid4(bounds.west, bounds.east), lat: mid4(bounds.south, bounds.north) - 0.162, height: 30000, pitchDeg: -63, headingDeg: 8 },
  },
}

// ── Module 1 — EUDR & plot compliance ──────────────────────────────────────
const SECTOR_CENTRES = [
  'Kiptunga', 'Nessuit', 'Mariashoni', 'Tinet',
  'Kilombe', 'Teret', 'Sururu', 'Likia',
]

// Deterministic 0..1 hash so the scatter is stable across reloads.
function unit(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

const PLOT_COUNT = 18
const plotIdAt = (i) => `${SECTOR_CENTRES[i % SECTOR_CENTRES.length].slice(0, 3).toUpperCase()}-${String(i + 1).padStart(2, '0')}`

// Real places that pull each Mau zone's sample plots to its own side of the
// forest, from OpenStreetMap: a zone's plots take the stretch of forest edge
// nearest its seat. For orientation only — not surveyed NTZDC locations.
const ZONE_SEAT = {
  'MAU-KUR': { lon: 35.667, lat: -0.399 }, // between Kuresoi North and Kuresoi South
  'MAU-NYA': { lon: 35.355, lat: -0.778 }, // Nyangores river, Bomet
  'MAU-KER': { lon: 35.283, lat: -0.367 }, // Kericho town
  'MAU-OLE': { lon: 35.686, lat: -0.588 }, // Olenguruone
}
const ZONE_ORDER = ['MAU-KUR', 'MAU-NYA', 'MAU-KER', 'MAU-OLE'] // smallest belts choose their edge first

// Candidate places for a plot: points every 250 m along the forest's outer
// edge, each with a step inward so a plot straddles the edge rather than
// sitting on the line. Sliver edges with no room inside are dropped.
const EDGE_CANDIDATES = (() => {
  const found = []
  for (let arc = 0; arc < SECTOR_OUTLINE.perimeterM; arc += 250) {
    const edge = SECTOR_OUTLINE.at(arc)
    const slot = SECTOR_OUTLINE.inset(edge, 90 + unit(found.length + 23) * 260)
    if (slot) found.push({ edge, arc: edge.arc, ...slot })
  }
  return found
})()

const MIN_PLOT_SPACING_M = 4000

// Plot id → edge slot. Each zone takes the candidates nearest its seat, keeping
// its plots at least MIN_PLOT_SPACING_M from every other plot so nothing piles
// up along a ragged edge. Spacing relaxes only if the edge runs out of room.
const SLOT_OF = (() => {
  const taken = []
  const slotOf = {}
  for (const zone of ZONE_ORDER) {
    const ids = Array.from({ length: PLOT_COUNT }, (_, i) => plotIdAt(i)).filter((id) => PLOT_ZONE[id] === zone)
    const ranked = [...EDGE_CANDIDATES].sort(
      (a, b) => SECTOR_OUTLINE.metresBetween(ZONE_SEAT[zone], a) - SECTOR_OUTLINE.metresBetween(ZONE_SEAT[zone], b),
    )
    let mine = []
    for (const relax of [1, 0.6, 0.3, 0]) {
      mine = []
      for (const candidate of ranked) {
        if (mine.length === ids.length) break
        if ([...taken, ...mine].every((other) => SECTOR_OUTLINE.metresBetween(candidate, other) >= MIN_PLOT_SPACING_M * relax)) mine.push(candidate)
      }
      if (mine.length === ids.length) break
    }
    mine.sort((a, b) => a.arc - b.arc)
    ids.forEach((id, n) => {
      slotOf[id] = mine[n]
    })
    taken.push(...mine)
  }
  return slotOf
})()

function makePlots() {
  return Array.from({ length: PLOT_COUNT }, (_, i) => {
    const centre = SECTOR_CENTRES[i % SECTOR_CENTRES.length]
    const id = plotIdAt(i)
    const slot = SLOT_OF[id]
    const lon = +slot.lon.toFixed(4)
    const lat = +slot.lat.toFixed(4)
    const canopy2020 = 58 + ((i * 7) % 30)
    const drift = ((i * 13) % 11) - 3
    const canopyNow = Math.min(97, canopy2020 + drift)
    const loss = Math.max(0, canopy2020 - canopyNow)
    const status = loss >= 3 ? 'flagged' : loss > 0 ? 'watch' : 'clear'
    const hectares = +(1.2 + (i % 5) * 0.6).toFixed(1)
    const half = 0.0017 + hectares * 0.0007 // ring half-edge, degrees
    const ndvi = +(0.42 + (canopyNow / 100) * 0.46).toFixed(2)
    return {
      id,
      centre,
      lat,
      lon,
      hectares,
      canopy2020,
      canopyNow,
      loss,
      status,
      ndvi,
      // Schematic quad around the centroid (flat [lon,lat,...] for Cesium).
      ring: [
        lon - half, lat - half,
        lon + half, lat - half * 0.82,
        lon + half * 0.9, lat + half,
        lon - half * 0.95, lat + half * 0.78,
      ],
    }
  })
}

const EUDR_PLOTS = makePlots()

// Collection-centre pins, on the tea side of the forest edge just outside it,
// beside the first plot that carries the centre's name. Positions are
// illustrative; the names are the console's mock place names.
const CENTRE_ROWS = [
  ['CC-KPT', 'Kiptunga', 'KIP-01', 1240],
  ['CC-NES', 'Nessuit', 'NES-02', 880],
  ['CC-MAR', 'Mariashoni', 'MAR-03', 610],
  ['CC-TIN', 'Tinet', 'TIN-04', 430],
]

export const COLLECTION_CENTRES = CENTRE_ROWS.map(([id, place, plotId, pluckers], n) => {
  const slot = SLOT_OF[plotId]
  const point = SECTOR_OUTLINE.outsideNear(slot.edge, (slot.inward + 180) % 360, 1200 + unit(n + 61) * 500)
  return { id, name: `${place} Collection Centre`, lon: +point.lon.toFixed(4), lat: +point.lat.toFixed(4), pluckers }
})

// Coarse NDVI field across the forest — thin at the edge, lush toward the
// core, so the shading follows the real outline. A cell is kept only if its
// centre and at least two corners are inside the outline, which stops the
// shading spilling far past the edge. Illustrative values, not measured.
function makeNdviGrid() {
  const cols = 30
  const rows = 30
  const { west, south, east, north } = SECTOR.bbox
  const dLon = (east - west) / cols
  const dLat = (north - south) / rows
  const cells = []
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const w = west + c * dLon
      const s = south + r * dLat
      const cx = w + dLon / 2
      const cy = s + dLat / 2
      if (!SECTOR_OUTLINE.contains(cx, cy)) continue
      const cornersIn = [[w, s], [w + dLon, s], [w + dLon, s + dLat], [w, s + dLat]].filter(([x, y]) => SECTOR_OUTLINE.contains(x, y)).length
      if (cornersIn < 2) continue
      const core = Math.min(1, SECTOR_OUTLINE.distanceM(cx, cy) / 4500)
      const jitter = (((r * 7 + c * 13) % 5) - 2) * 0.015
      const ndvi = Math.max(0.22, Math.min(0.88, +(0.3 + core * 0.55 + jitter).toFixed(2)))
      cells.push({ id: `n${r}-${c}`, ndvi, ring: [w, s, w + dLon, s, w + dLon, s + dLat, w, s + dLat] })
    }
  }
  return cells
}

export const NDVI_GRID = makeNdviGrid()

export const EUDR = {
  baselineDate: '2020-12-31',
  plots: EUDR_PLOTS,
  summary: {
    total: EUDR_PLOTS.length,
    clear: EUDR_PLOTS.filter((p) => p.status === 'clear').length,
    watch: EUDR_PLOTS.filter((p) => p.status === 'watch').length,
    flagged: EUDR_PLOTS.filter((p) => p.status === 'flagged').length,
    hectares: +EUDR_PLOTS.reduce((sum, p) => sum + p.hectares, 0).toFixed(1),
  },
}

// Simulated audit / verification feed for the sector. Not live — the Sector
// Focus View ticks through these entries to show the shape of the pipeline.
export const AUDIT_ACTIVITY = [
  { id: 'a01', kind: 'satellite', plotId: null, text: 'Sentinel-2 pass ingested · 12 tiles · 4.1% cloud' },
  { id: 'a02', kind: 'polygon', plotId: 'KIP-01', text: 'Audit polygon re-verified against Dec 2020 baseline' },
  { id: 'a03', kind: 'batch', plotId: null, text: 'Batch #802 conservation passport generated' },
  { id: 'a04', kind: 'polygon', plotId: 'NES-02', text: 'Canopy delta recomputed · −1 pp · within tolerance' },
  { id: 'a05', kind: 'alert', plotId: 'TIN-04', text: 'Edge-clearing signal flagged · 0.4 ha · ranger queued' },
  { id: 'a06', kind: 'cert', plotId: 'MAR-03', text: 'EUDR audit certificate issued · rev C' },
  { id: 'a07', kind: 'satellite', plotId: null, text: 'NDVI composite refreshed · sector mean 0.71' },
  { id: 'a08', kind: 'polygon', plotId: 'KIL-05', text: 'Plot geometry snapped to updated survey trace' },
  { id: 'a09', kind: 'batch', plotId: null, text: 'Weekly plucker settlement file sealed · 1,240 payees' },
  { id: 'a10', kind: 'polygon', plotId: 'KIP-09', text: 'Canopy density current 71% · cleared' },
  { id: 'a11', kind: 'satellite', plotId: null, text: 'Planet SkySat tasking confirmed for flagged plots' },
  { id: 'a12', kind: 'cert', plotId: 'NES-02', text: 'Audit certificate counter-signed by verifier node' },
  { id: 'a13', kind: 'alert', plotId: 'TIN-04', text: 'Ground team ack · site visit scheduled 2026-09-09' },
  { id: 'a14', kind: 'polygon', plotId: 'SUR-07', text: 'Baseline vs current recomputed · +4 pp recovery' },
]

// ── Environmental satellite analytics ──────────────────────────────────────
export const SATELLITE = {
  ndvi: {
    current: 0.71,
    baseline: 0.58,
    series: [0.55, 0.57, 0.56, 0.6, 0.63, 0.62, 0.66, 0.69, 0.71],
    quarters: ['Q1·24', 'Q2·24', 'Q3·24', 'Q4·24', 'Q1·25', 'Q2·25', 'Q3·25', 'Q4·25', 'Q1·26'],
  },
  carbon: {
    sinkTonnesCo2: 486000,
    perHectareTonnes: 34.1,
    note: 'Above-ground biomass, allometric estimate across the belt covenant area.',
  },
  water: {
    catchmentYieldMcm: 1240,
    changePct: 7.4,
    note: 'Modelled annual yield across the five tower catchments vs. the 2018 baseline.',
  },
  encroachmentAlerts: [
    { id: 'ALERT-2291', block: 'Mau — Tinet edge', distanceM: 320, detected: '2026-09-06 04:12 EAT', areaHa: 0.4, status: 'Ranger dispatched' },
    { id: 'ALERT-2288', block: 'Aberdare — Wanjohi spur', distanceM: 460, detected: '2026-09-04 22:41 EAT', areaHa: 0.2, status: 'Under review' },
    { id: 'ALERT-2280', block: 'Cherangany — Kapsara', distanceM: 190, detected: '2026-08-30 11:07 EAT', areaHa: 0.7, status: 'Resolved — replanted' },
  ],
}

