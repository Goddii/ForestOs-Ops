import { useEffect, useMemo, useRef } from 'react'
import '../../../lib/cesiumBootstrap'
import { Viewer, Entity, PolygonGraphics, useCesium } from 'resium'
import {
  Cartesian2,
  Cartesian3,
  Color,
  HeightReference,
  LabelStyle,
  Math as CesiumMath,
  PinBuilder,
  ScreenSpaceEventType,
  UrlTemplateImageryProvider,
  VerticalOrigin,
} from 'cesium'
import { COLLECTION_CENTRES, EUDR, NDVI_GRID, SECTOR } from '../../../lib/dashboardData'
import { BONE, STATUS_COLOR, hierarchyOf, ndviColor } from './sectorMapStyle'

const rad = (deg) => CesiumMath.toRadians(deg)
const IMAGERY_URL =
  'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

const destinationOf = (v) => Cartesian3.fromDegrees(v.lon, v.lat, v.height)
const orientationOf = (v) => ({ heading: rad(v.headingDeg ?? 0), pitch: rad(v.pitchDeg), roll: 0 })

/** Token-free Esri imagery + dark scene grade, matching the public globe. */
function ViewerSetup() {
  const { viewer } = useCesium()
  useEffect(() => {
    if (!viewer) return
    const imagery = viewer.imageryLayers
    imagery.removeAll()
    imagery.addImageryProvider(
      new UrlTemplateImageryProvider({
        url: IMAGERY_URL,
        maximumLevel: 18,
        credit: 'Imagery © Esri, Maxar, Earthstar Geographics',
      }),
    )

    /* eslint-disable react/immutability -- Cesium scene is an external mutable system */
    const { scene } = viewer
    scene.globe.baseColor = Color.fromCssColorString('#0c1f16')
    scene.backgroundColor = Color.fromCssColorString('#070a08')
    scene.skyAtmosphere.show = true
    scene.fog.enabled = true
    scene.globe.enableLighting = false
    scene.screenSpaceCameraController.minimumZoomDistance = 1400
    scene.screenSpaceCameraController.maximumZoomDistance = 90000
    viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
      ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
    )
    // Keep the WebGL canvas out of the tab order — it captures arrow keys and
    // would trap keyboard users. The plot rail below the map is the a11y path.
    viewer.canvas.setAttribute('tabindex', '-1')
    viewer.canvas.setAttribute('aria-hidden', 'true')
    /* eslint-enable react/immutability */
  }, [viewer])
  return null
}

/**
 * One camera controller. First mount flies the sector intro (high tilt →
 * resting 3/4 view); after that it tracks the selected plot, and resets to the
 * sector framing when the selection clears. Reduced motion collapses to jumps.
 */
function CameraRig({ reducedMotion, selectedPlot }) {
  const { viewer } = useCesium()
  const introDone = useRef(false)

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return undefined
    const { start, target } = SECTOR.flight
    viewer.camera.cancelFlight()

    const goto = (view, duration) => {
      if (reducedMotion || duration === 0) {
        viewer.camera.setView({ destination: destinationOf(view), orientation: orientationOf(view) })
      } else {
        viewer.camera.flyTo({
          destination: destinationOf(view),
          orientation: orientationOf(view),
          duration,
        })
      }
    }

    if (!introDone.current) {
      introDone.current = true
      goto(start, 0)
      goto(target, 2.4)
      return undefined
    }

    if (selectedPlot) {
      // Frame the plot toward the left of the viewport (the inspector covers the
      // right ~290px). At pitch -52 / h5200 the camera centres ~0.037° ahead in
      // the heading direction, so it sits that far south and a touch east.
      goto(
        { lon: selectedPlot.lon + 0.008, lat: selectedPlot.lat - 0.037, height: 5200, headingDeg: 0, pitchDeg: -52 },
        1.5,
      )
    } else {
      goto(target, 1.4)
    }

    return () => {
      if (viewer && !viewer.isDestroyed()) viewer.camera.cancelFlight()
    }
  }, [viewer, reducedMotion, selectedPlot])

  return null
}

function NdviLayer() {
  const cells = useMemo(
    () => NDVI_GRID.map((cell) => ({ ...cell, hierarchy: hierarchyOf(cell.ring) })),
    [],
  )
  return cells.map((cell) => (
    <Entity key={`ndvi:${cell.id}`}>
      <PolygonGraphics hierarchy={cell.hierarchy} material={ndviColor(cell.ndvi).withAlpha(0.46)} height={0} />
    </Entity>
  ))
}

function AuditLayer({ selectedId, onPickPlot }) {
  const plots = useMemo(
    () => EUDR.plots.map((plot) => ({ ...plot, hierarchy: hierarchyOf(plot.ring) })),
    [],
  )
  return plots.map((plot) => {
    const active = plot.id === selectedId
    const base = STATUS_COLOR[plot.status] ?? BONE
    return (
      <Entity
        key={`plot:${plot.id}`}
        name={plot.id}
        onClick={() => onPickPlot?.(plot.id)}
      >
        <PolygonGraphics
          hierarchy={plot.hierarchy}
          material={base.withAlpha(active ? 0.78 : 0.4)}
          outline
          outlineColor={(active ? BONE : base).withAlpha(active ? 1 : 0.8)}
          outlineWidth={active ? 2 : 1}
          height={0}
          extrudedHeight={active ? 360 : 120}
        />
      </Entity>
    )
  })
}

function PinLayer({ onPickCentre }) {
  const pin = useMemo(
    () => new PinBuilder().fromColor(Color.fromCssColorString('#e8a85c'), 42).toDataURL(),
    [],
  )
  return COLLECTION_CENTRES.map((centre) => (
    <Entity
      key={`cc:${centre.id}`}
      name={centre.name}
      position={Cartesian3.fromDegrees(centre.lon, centre.lat, 0)}
      onClick={() => onPickCentre?.(centre)}
      billboard={{
        image: pin,
        verticalOrigin: VerticalOrigin.BOTTOM,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      }}
      label={{
        text: centre.name.replace(' Collection Centre', '').toUpperCase(),
        font: "600 11px 'Archivo', sans-serif",
        fillColor: BONE,
        style: LabelStyle.FILL,
        showBackground: true,
        backgroundColor: Color.fromCssColorString('#0c1f16').withAlpha(0.9),
        backgroundPadding: new Cartesian2(8, 5),
        pixelOffset: new Cartesian2(0, -46),
        verticalOrigin: VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      }}
    />
  ))
}

/**
 * The Cesium viewport for the Sector Focus View. Heavy — always mounted behind
 * a React.lazy boundary so Cesium only loads when a module that uses it opens.
 */
export default function SectorFocusMap({
  layers,
  selectedPlotId = null,
  onPickPlot,
  onPickCentre,
  reducedMotion = false,
}) {
  const selectedPlot = EUDR.plots.find((plot) => plot.id === selectedPlotId) ?? null

  return (
    <Viewer
      full={false}
      className="h-full w-full"
      baseLayer={false}
      baseLayerPicker={false}
      geocoder={false}
      homeButton={false}
      sceneModePicker={false}
      navigationHelpButton={false}
      animation={false}
      timeline={false}
      fullscreenButton={false}
      infoBox={false}
      selectionIndicator={false}
    >
      <ViewerSetup />
      <CameraRig reducedMotion={reducedMotion} selectedPlot={selectedPlot} />
      {layers.ndvi && <NdviLayer />}
      {layers.audit && <AuditLayer selectedId={selectedPlotId} onPickPlot={onPickPlot} />}
      {layers.pins && <PinLayer onPickCentre={onPickCentre} />}
    </Viewer>
  )
}
