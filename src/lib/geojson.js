// Turns the mock EUDR plot list into a real GeoJSON FeatureCollection and
// hands it to the browser as a download. Stands in for a backend audit export.

const HALF_EDGE_DEG = 0.011 // ~1.2 km square around each plot centroid (fallback)

// Turn a flat [lon,lat,lon,lat,...] ring into a closed GeoJSON linear ring.
function ringToCoords(ring) {
  const pairs = []
  for (let i = 0; i < ring.length; i += 2) pairs.push([ring[i], ring[i + 1]])
  if (pairs.length) pairs.push([...pairs[0]])
  return pairs
}

function plotGeometry(plot) {
  if (Array.isArray(plot.ring) && plot.ring.length >= 6) {
    return { type: 'Polygon', coordinates: [ringToCoords(plot.ring)] }
  }
  return {
    type: 'Polygon',
    coordinates: [
      [
        [plot.lon - HALF_EDGE_DEG, plot.lat - HALF_EDGE_DEG],
        [plot.lon + HALF_EDGE_DEG, plot.lat - HALF_EDGE_DEG],
        [plot.lon + HALF_EDGE_DEG, plot.lat + HALF_EDGE_DEG],
        [plot.lon - HALF_EDGE_DEG, plot.lat + HALF_EDGE_DEG],
        [plot.lon - HALF_EDGE_DEG, plot.lat - HALF_EDGE_DEG],
      ],
    ],
  }
}

export function plotsToGeoJSON(plots, { baselineDate }) {
  return {
    type: 'FeatureCollection',
    metadata: {
      generator: 'ForestOS EUDR plot-compliance audit (prototype export)',
      eudrBaselineDate: baselineDate,
      exportedAt: new Date().toISOString(),
      note: 'Illustrative mock data — polygons are schematic squares, not surveyed boundaries.',
    },
    features: plots.map((plot) => ({
      type: 'Feature',
      properties: {
        plotId: plot.id,
        collectionCentre: plot.centre,
        areaHectares: plot.hectares,
        canopyBaseline2020Pct: plot.canopy2020,
        canopyCurrentPct: plot.canopyNow,
        canopyLossPct: plot.loss,
        eudrStatus: plot.status,
      },
      geometry: plotGeometry(plot),
    })),
  }
}

/**
 * Single-plot EUDR audit certificate — a schematic stand-in for a signed PDF.
 * Downloads a readable JSON document scoped to one plot.
 */
export function plotToAuditCert(plot, { sector, baselineDate }) {
  return {
    document: 'ForestOS EUDR Plot Audit Certificate (prototype)',
    issuedAt: new Date().toISOString(),
    sector: sector?.name ?? null,
    sectorCode: sector?.code ?? null,
    block: sector?.block ?? null,
    plot: {
      id: plot.id,
      collectionCentre: plot.centre,
      centroid: { lat: plot.lat, lon: plot.lon },
      areaHectares: plot.hectares,
    },
    audit: {
      eudrBaselineDate: baselineDate,
      canopyDensityBaselinePct: plot.canopy2020,
      canopyDensityCurrentPct: plot.canopyNow,
      canopyLossPct: plot.loss,
      ndvi: plot.ndvi ?? null,
      status: plot.status,
      statusLabel: { clear: 'CLEARED', watch: 'WATCH', flagged: 'FLAGGED' }[plot.status] ?? plot.status,
    },
    note: 'Illustrative mock data. No ForestOS backend; not a legally valid certificate.',
  }
}

export function downloadCert(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/geo+json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
