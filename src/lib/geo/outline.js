// Geometry on a forest outline: is a point inside, how far is it from the edge,
// and where are points along the edge. Pure functions with no dependencies, so
// the same code runs in the browser, the Vite dev server and plain Node.
//
// Rings are closed arrays of [lon, lat]. The first ring is the outer edge and
// any others are holes. Distances use a flat projection centred on the outline,
// which is accurate to well under a metre per kilometre over a 25 km forest.

const EARTH_RADIUS_M = 6371008.8
const M_PER_DEG = (Math.PI / 180) * EARTH_RADIUS_M
const rad = (deg) => (deg * Math.PI) / 180
const deg = (radians) => (radians * 180) / Math.PI

export function makeOutline(rings) {
  const outer = rings[0]
  const lons = outer.map((p) => p[0])
  const lats = outer.map((p) => p[1])
  const bounds = { west: Math.min(...lons), south: Math.min(...lats), east: Math.max(...lons), north: Math.max(...lats) }
  const kx = M_PER_DEG * Math.cos(rad((bounds.south + bounds.north) / 2))
  const ky = M_PER_DEG
  const flat = rings.map((ring) => ring.map(([lon, lat]) => [lon * kx, lat * ky]))

  // Cumulative distance along the outer edge, for walking it.
  const cumulative = [0]
  for (let i = 1; i < flat[0].length; i += 1) {
    cumulative.push(cumulative[i - 1] + Math.hypot(flat[0][i][0] - flat[0][i - 1][0], flat[0][i][1] - flat[0][i - 1][1]))
  }
  const perimeterM = cumulative[cumulative.length - 1]

  const shoelace = (ring) => {
    let sum = 0
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) sum += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
    return Math.abs(sum) / 2
  }
  const areaHa = (shoelace(flat[0]) - flat.slice(1).reduce((sum, ring) => sum + shoelace(ring), 0)) / 10_000

  /** Even-odd test across every ring, so holes count as outside. */
  function contains(lon, lat) {
    let inside = false
    for (const ring of rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i]
        const [xj, yj] = ring[j]
        if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
      }
    }
    return inside
  }

  /** Metres from a point to the nearest edge, holes included. Zero on the edge. */
  function distanceM(lon, lat) {
    const px = lon * kx
    const py = lat * ky
    let best = Infinity
    for (const ring of flat) {
      for (let i = 1; i < ring.length; i += 1) {
        const [ax, ay] = ring[i - 1]
        const [bx, by] = ring[i]
        const dx = bx - ax
        const dy = by - ay
        const t = dx === 0 && dy === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
        best = Math.min(best, Math.hypot(px - (ax + t * dx), py - (ay + t * dy)))
      }
    }
    return best
  }

  const metresBetween = (a, b) => Math.hypot((a.lon - b.lon) * kx, (a.lat - b.lat) * ky)

  /** A point moved `metres` along a compass bearing (flat projection, fine at these distances). */
  function move(point, bearingDeg, metres) {
    return { lon: point.lon + (metres * Math.sin(rad(bearingDeg))) / kx, lat: point.lat + (metres * Math.cos(rad(bearingDeg))) / ky }
  }

  /** The point `arcM` metres along the outer edge, and the bearing of travel there. Wraps around. */
  function at(arcM) {
    const arc = ((arcM % perimeterM) + perimeterM) % perimeterM
    let i = 1
    while (i < cumulative.length - 1 && cumulative[i] < arc) i += 1
    const [ax, ay] = flat[0][i - 1]
    const [bx, by] = flat[0][i]
    const span = cumulative[i] - cumulative[i - 1]
    const t = span === 0 ? 0 : (arc - cumulative[i - 1]) / span
    return { arc, lon: (ax + t * (bx - ax)) / kx, lat: (ay + t * (by - ay)) / ky, bearing: (deg(Math.atan2(bx - ax, by - ay)) + 360) % 360 }
  }

  /**
   * A point about `metres` inside the forest from an edge point returned by
   * `at`, with the bearing that points inward. Works whichever way the ring
   * runs. Tries shorter steps where the edge is a narrow sliver, and returns
   * null if no point at least 20 m from every edge can be found.
   */
  function inset(edge, metres) {
    for (const step of [metres, metres / 2, 30]) {
      for (const side of [-90, 90]) {
        const inward = (edge.bearing + side + 360) % 360
        const p = move(edge, inward, step)
        if (contains(p.lon, p.lat) && distanceM(p.lon, p.lat) >= 20) return { ...p, inward }
      }
    }
    return null
  }

  /** The nearest point outside the forest to `from`, at least `minM` away, preferring `bearing`. */
  function outsideNear(from, bearing, minM) {
    for (let metres = minM; metres <= minM + 6000; metres += 300) {
      for (const turn of [0, 25, -25, 50, -50, 90, -90, 135, -135, 180]) {
        const p = move(from, bearing + turn, metres)
        if (!contains(p.lon, p.lat)) return p
      }
    }
    return move(from, bearing, minM)
  }

  /** The point inside the forest furthest from any edge: a good place for a label. */
  function labelPoint(steps = 40) {
    let best = { lon: (bounds.west + bounds.east) / 2, lat: (bounds.south + bounds.north) / 2, depthM: -1 }
    for (let r = 0; r <= steps; r += 1) {
      for (let c = 0; c <= steps; c += 1) {
        const lon = bounds.west + ((bounds.east - bounds.west) * c) / steps
        const lat = bounds.south + ((bounds.north - bounds.south) * r) / steps
        if (!contains(lon, lat)) continue
        const depthM = distanceM(lon, lat)
        if (depthM > best.depthM) best = { lon, lat, depthM }
      }
    }
    return best
  }

  return { rings, bounds, perimeterM, areaHa, contains, distanceM, metresBetween, move, at, inset, outsideNear, labelPoint }
}
