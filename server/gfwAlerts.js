// Server-side proxy for Global Forest Watch integrated deforestation alerts.
// The API key stays here (env GFW_API_KEY) and never reaches the browser.
// Shared by the Vercel function in api/ and the Vite dev server.
import { SECTOR, SECTOR_OUTLINE } from '../src/lib/dashboardData.js'

const ENDPOINT = 'https://data-api.globalforestwatch.org/dataset/gfw_integrated_alerts/latest/query/json'
const WINDOW_DAYS = 45
const PIXEL_HA = 0.01 // alerts are 10 m pixels
const CELL_DEG = 0.001 // merge pixels into ~110 m cells
const MARGIN_DEG = 0.01 // ~1.1 km of search room around the forest's bounding box
const KEEP_OUTSIDE_M = 1000 // alerts this close to the edge but outside it still count
const RANK = { nominal: 0, low: 0, high: 1, highest: 2 }

const isoDay = (offsetDays) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10)

/** The forest's bounding box plus a margin, so alerts just outside the edge are fetched too. */
function searchPolygon() {
  const west = SECTOR.bbox.west - MARGIN_DEG
  const south = SECTOR.bbox.south - MARGIN_DEG
  const east = SECTOR.bbox.east + MARGIN_DEG
  const north = SECTOR.bbox.north + MARGIN_DEG
  return { type: 'Polygon', coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] }
}

/** Where each cluster sits against the real forest outline; drops those well clear of it. */
export function locateAgainstForest(clusters, outline = SECTOR_OUTLINE) {
  return clusters
    .map((c) => ({ ...c, inside: outline.contains(c.lon, c.lat), edgeM: Math.round(outline.distanceM(c.lon, c.lat)) }))
    .filter((c) => c.inside || c.edgeM <= KEEP_OUTSIDE_M)
}

/** Merge pixel rows into cells: total area, latest date, strongest confidence. */
export function clusterPixels(rows) {
  const cells = new Map()
  for (const row of rows) {
    const key = `${Math.round(row.latitude / CELL_DEG)}:${Math.round(row.longitude / CELL_DEG)}`
    const confidence = row.gfw_integrated_alerts__confidence
    const cell = cells.get(key) ?? { lat: 0, lon: 0, pixels: 0, date: '', confidence }
    cell.lat += row.latitude
    cell.lon += row.longitude
    cell.pixels += 1
    if (row.gfw_integrated_alerts__date > cell.date) cell.date = row.gfw_integrated_alerts__date
    if ((RANK[confidence] ?? 0) > (RANK[cell.confidence] ?? 0)) cell.confidence = confidence
    cells.set(key, cell)
  }
  return [...cells.values()]
    .map((c) => ({
      lat: +(c.lat / c.pixels).toFixed(5),
      lon: +(c.lon / c.pixels).toFixed(5),
      date: c.date,
      confidence: c.confidence,
      areaHa: +(c.pixels * PIXEL_HA).toFixed(2),
    }))
    .sort((a, b) => (a.date === b.date ? b.areaHa - a.areaHa : a.date < b.date ? 1 : -1))
}

/** Returns { status, body } so any host can send it. */
export async function gfwAlerts(apiKey) {
  if (!apiKey) return { status: 503, body: { error: 'not_configured' } }
  const from = isoDay(-WINDOW_DAYS)
  const sql =
    'SELECT latitude, longitude, gfw_integrated_alerts__date, gfw_integrated_alerts__confidence ' +
    `FROM results WHERE gfw_integrated_alerts__date >= '${from}'`
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ sql, geometry: searchPolygon() }),
  })
  if (!response.ok) return { status: 502, body: { error: 'upstream', upstreamStatus: response.status } }
  const { data = [] } = await response.json()
  const located = locateAgainstForest(clusterPixels(data))
  return {
    status: 200,
    body: { from, sector: SECTOR.code, source: 'GFW integrated alerts (GLAD-L, GLAD-S2, RADD)', total: located.length, alerts: located.slice(0, 40) },
  }
}

/** Node (req, res) handler used by both hosts. */
export async function handler(req, res, apiKey = process.env.GFW_API_KEY) {
  try {
    const { status, body } = await gfwAlerts(apiKey)
    res.statusCode = status
    res.setHeader('content-type', 'application/json')
    if (status === 200) res.setHeader('cache-control', 'public, s-maxage=3600')
    res.end(JSON.stringify(body))
  } catch {
    res.statusCode = 502
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'upstream' }))
  }
}
