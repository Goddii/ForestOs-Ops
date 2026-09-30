// Live Sentinel-2 scene lookup for satellite alerts. Keyless: the Earth Search
// STAC API lists real Copernicus scenes, and the public titiler.xyz service
// crops a small true-colour chip from a scene's cloud-optimised GeoTIFF.
// Both are best-effort; callers must cope with a rejected promise.

const STAC = 'https://earth-search.aws.element84.com/v1'
const CROP = 'https://titiler.xyz/cog/bbox'
const DAY = 86_400_000
const MAX_CLOUD = 40

const shift = (iso, days) => new Date(new Date(iso).getTime() + days * DAY).toISOString()

async function search({ lat, lon, from, to }, signal) {
  const response = await fetch(`${STAC}/search`, {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      collections: ['sentinel-2-l2a'],
      intersects: { type: 'Point', coordinates: [lon, lat] },
      datetime: `${from}/${to}`,
      query: { 'eo:cloud_cover': { lt: MAX_CLOUD } },
      sortby: [{ field: 'properties.eo:cloud_cover', direction: 'asc' }],
      limit: 6,
    }),
  })
  if (!response.ok) throw new Error(`Scene search failed (${response.status})`)
  const features = (await response.json()).features ?? []
  return features.map((feature) => ({
    id: feature.id,
    datetime: feature.properties.datetime,
    cloud: feature.properties['eo:cloud_cover'] / 100,
    visualHref: feature.assets.visual.href,
    itemUrl: `${STAC}/collections/sentinel-2-l2a/items/${feature.id}`,
  }))
}

/**
 * Candidate scenes around the alert's pass date, and from the weeks before it,
 * clearest first. Cloud cover is per scene, not per spot, so the caller lets
 * the officer step through the candidates. Either list may be empty.
 */
export async function findScenes({ lat, lon, passDate }, signal) {
  const at = `${passDate}T00:00:00Z`
  const [current, earlier] = await Promise.all([
    search({ lat, lon, from: shift(at, -6), to: shift(at, 6) }, signal),
    search({ lat, lon, from: shift(at, -75), to: shift(at, -20) }, signal),
  ])
  return { current, earlier }
}

/** A square true-colour chip, `halfM` metres either side of the alert. */
export function chipUrl(scene, { lat, lon }, halfM = 400, px = 384) {
  const dLat = halfM / 111_320
  const dLon = halfM / (111_320 * Math.cos((lat * Math.PI) / 180))
  const bbox = [lon - dLon, lat - dLat, lon + dLon, lat + dLat].map((n) => n.toFixed(5)).join(',')
  return `${CROP}/${bbox}/${px}x${px}.png?url=${encodeURIComponent(scene.visualHref)}`
}
