// Copies Cesium's static runtime assets into /public/cesium so they can be
// served without an Ion account or a Vite Cesium plugin. Runs automatically
// via the "predev" and "prebuild" npm scripts.
import { cp, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const CESIUM_BUILD = path.resolve('node_modules/cesium/Build/Cesium')
const DEST = path.resolve('public/cesium')
const ASSET_DIRS = ['Assets', 'Widgets', 'Workers', 'ThirdParty']

if (!existsSync(CESIUM_BUILD)) {
  console.error(`[copy-cesium] Cannot find ${CESIUM_BUILD}. Run "npm install" first.`)
  process.exit(1)
}

await mkdir(DEST, { recursive: true })
for (const dir of ASSET_DIRS) {
  const from = path.join(CESIUM_BUILD, dir)
  if (!existsSync(from)) continue
  await cp(from, path.join(DEST, dir), { recursive: true })
}

console.log('[copy-cesium] Cesium static assets -> public/cesium')
