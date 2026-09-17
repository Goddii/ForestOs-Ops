// Cesium/Ion setup that must run before any Resium/Cesium component mounts —
// split out of lib/cesium.js so it loads only alongside the lazy globe chunk
// (imported from GlobeSection.jsx), not on every route. `Ion` and the widgets
// CSS pull real weight from the `cesium` package; a visitor who never scrolls
// to the globe should never pay for either.
import { Ion } from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'

// This prototype runs token-free: OpenStreetMap raster imagery + the WGS84
// ellipsoid for terrain. No Cesium Ion account or access token is required.
Ion.defaultAccessToken = ''
