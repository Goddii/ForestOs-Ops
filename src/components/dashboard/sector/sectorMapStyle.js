// Shared colour language for the Sector Focus map layers. Kept out of the
// Cesium component so both the map and its legend/toggle read from one source.
import { Cartesian3, Color, PolygonHierarchy } from 'cesium'

export const BONE = Color.fromCssColorString('#f3eee3')

export const STATUS_COLOR = {
  clear: Color.fromCssColorString('#41b257'),
  watch: Color.fromCssColorString('#f0a94e'),
  flagged: Color.fromCssColorString('#e8451a'),
}

// CSS mirrors of STATUS_COLOR for the HTML chrome (toggle, legend, inspector).
export const STATUS_CSS = {
  clear: '#12674b',
  watch: '#a9761f',
  flagged: '#b8461c',
}

export const STATUS_LABEL = {
  clear: 'CLEARED',
  watch: 'WATCH',
  flagged: 'FLAGGED',
}

// NDVI ramp: bare / settled ground → stressed vegetation → healthy canopy.
const NDVI_STOPS = [
  [0.2, Color.fromCssColorString('#a9641d')],
  [0.5, Color.fromCssColorString('#c9a24a')],
  [0.72, Color.fromCssColorString('#4a9e3f')],
  [0.9, Color.fromCssColorString('#1f7d38')],
]

export function ndviColor(v) {
  let lo = NDVI_STOPS[0]
  let hi = NDVI_STOPS[NDVI_STOPS.length - 1]
  for (let i = 0; i < NDVI_STOPS.length - 1; i += 1) {
    if (v >= NDVI_STOPS[i][0] && v <= NDVI_STOPS[i + 1][0]) {
      lo = NDVI_STOPS[i]
      hi = NDVI_STOPS[i + 1]
      break
    }
  }
  const t = Math.max(0, Math.min(1, (v - lo[0]) / (hi[0] - lo[0] || 1)))
  return Color.lerp(lo[1], hi[1], t, new Color())
}

export function hierarchyOf(ring) {
  return new PolygonHierarchy(Cartesian3.fromDegreesArray(ring))
}
