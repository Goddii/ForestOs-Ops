// Mock data for the NTZDC operations console. Illustrative only — there is
// no ForestOS backend and none of these figures are real.

// ── Sector geography — the covenant area this console operates ────────────
// Everything the Sector Focus View renders is scoped to this one block of the
// South West Mau, framed for a tilted 3D Cesium camera.
export const SECTOR = {
  name: 'South West Mau Sector',
  code: 'SW-MAU',
  block: 'Kiptunga Block',
  center: { lon: 35.642, lat: -0.472 },
  bbox: { west: 35.508, south: -0.606, east: 35.776, north: -0.338 },
  flight: {
    start: { lon: 35.642, lat: -0.56, height: 52000, pitchDeg: -80, headingDeg: 0 },
    target: { lon: 35.642, lat: -0.516, height: 16500, pitchDeg: -63, headingDeg: 8 },
  },
}

// Collection-centre pins inside the sector.
export const COLLECTION_CENTRES = [
  { id: 'CC-KPT', name: 'Kiptunga Collection Centre', lon: 35.618, lat: -0.415, pluckers: 1240 },
  { id: 'CC-NES', name: 'Nessuit Collection Centre', lon: 35.702, lat: -0.523, pluckers: 880 },
  { id: 'CC-MAR', name: 'Mariashoni Collection Centre', lon: 35.548, lat: -0.552, pluckers: 610 },
  { id: 'CC-TIN', name: 'Tinet Collection Centre', lon: 35.741, lat: -0.436, pluckers: 430 },
]

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

function makePlots() {
  const { west, south, east, north } = SECTOR.bbox
  const spanLon = east - west
  const spanLat = north - south
  const cols = 5
  const rows = 4
  const pad = 0.13
  return Array.from({ length: 18 }, (_, i) => {
    const centre = SECTOR_CENTRES[i % SECTOR_CENTRES.length]
    const gx = i % cols
    const gy = Math.floor(i / cols)
    const jx = (unit(i + 1) - 0.5) * 0.72
    const jy = (unit(i + 41) - 0.5) * 0.72
    const fx = pad + ((gx + 0.5 + jx) / cols) * (1 - 2 * pad)
    const fy = pad + ((gy + 0.5 + jy) / rows) * (1 - 2 * pad)
    const lon = +(west + fx * spanLon).toFixed(4)
    const lat = +(south + fy * spanLat).toFixed(4)
    const canopy2020 = 58 + ((i * 7) % 30)
    const drift = ((i * 13) % 11) - 3
    const canopyNow = Math.min(97, canopy2020 + drift)
    const loss = Math.max(0, canopy2020 - canopyNow)
    const status = loss >= 3 ? 'flagged' : loss > 0 ? 'watch' : 'clear'
    const hectares = +(1.2 + (i % 5) * 0.6).toFixed(1)
    const half = 0.0017 + hectares * 0.0007 // ring half-edge, degrees
    const ndvi = +(0.42 + (canopyNow / 100) * 0.46).toFixed(2)
    return {
      id: `${centre.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(2, '0')}`,
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

// Coarse NDVI field across the sector bbox — greener toward the forest core,
// thinner at the settled edges. Rendered as translucent graded cells.
function makeNdviGrid() {
  const cols = 9
  const rows = 6
  const { west, south, east, north } = SECTOR.bbox
  const dLon = (east - west) / cols
  const dLat = (north - south) / rows
  const cells = []
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const w = west + c * dLon
      const s = south + r * dLat
      const cx = (c + 0.5) / cols - 0.5
      const cy = (r + 0.5) / rows - 0.42
      const core = 1 - Math.min(1, Math.hypot(cx, cy) * 1.55)
      const jitter = (((r * 7 + c * 13) % 5) - 2) * 0.015
      const ndvi = Math.max(0.22, Math.min(0.88, +(0.34 + core * 0.5 + jitter).toFixed(2)))
      cells.push({ id: `n${r}${c}`, ndvi, ring: [w, s, w + dLon, s, w + dLon, s + dLat, w, s + dLat] })
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

