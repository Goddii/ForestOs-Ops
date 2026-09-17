// Cesium bootstrap — the base URL must be set before any Resium/Cesium
// component mounts, so it stays here in the eager entry (main.jsx). It's a
// single string assignment with zero import cost.
//
// The `Ion` import and Cesium's Widgets CSS live in ./cesiumBootstrap instead
// (imported from GlobeSection.jsx) — those pull real weight from the `cesium`
// package and shouldn't ship on every route just to set this one global.
//
// Static assets (Workers/Assets/Widgets/ThirdParty) are copied to /public/cesium
// by scripts/copy-cesium.mjs and served from the site root.
window.CESIUM_BASE_URL = '/cesium/'
