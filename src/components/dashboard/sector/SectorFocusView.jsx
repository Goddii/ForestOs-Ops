import { Suspense, lazy, useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import ErrorBoundary from '../../ErrorBoundary'
import SectorLayerToggle from './SectorLayerToggle'
import PlotInspector from './PlotInspector'
import AuditActivityStream from './AuditActivityStream'
import { STATUS_CSS, STATUS_LABEL } from './sectorMapStyle'
import { EUDR, SECTOR } from '../../../lib/dashboardData'
import { plotsToGeoJSON, plotToAuditCert, downloadJSON, downloadCert } from '../../../lib/geojson'

const SectorFocusMap = lazy(() => import('./SectorFocusMap'))

const DEFAULT_LAYERS = {
  eudr: { audit: true, ndvi: false, pins: true },
  ndvi: { audit: false, ndvi: true, pins: true },
}

const mapFallback = (
  <div className="grid h-full place-items-center bg-forest-900 p-8 text-center">
    <p className="max-w-sm text-sm text-bone-300">
      The 3D sector map could not start in this browser. The plot audit table and
      activity log below still work.
    </p>
  </div>
)

const mapLoading = (
  <div className="grid h-full place-items-center bg-forest-900">
    <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-sage-500">
      Loading sector…
    </span>
  </div>
)

const GLASS = 'rounded-lg border border-bone/15 bg-[#0c1710]/85 backdrop-blur-md'

/** Small dark-glass legend over the map viewport. */
function StatusLegend() {
  return (
    <div className={'pointer-events-none flex flex-wrap gap-x-3 gap-y-1 px-2.5 py-1.5 ' + GLASS}>
      {Object.entries(STATUS_LABEL).map(([key, label]) => (
        <span key={key} className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-bone/70">
          <span className="h-2 w-2 rounded-[2px]" style={{ background: STATUS_CSS[key] }} aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  )
}

function NdviLegend() {
  return (
    <div className={'pointer-events-none px-2.5 py-1.5 ' + GLASS}>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-bone/70">NDVI</p>
      <div
        className="mt-1 h-1.5 w-32 rounded-full"
        style={{ background: 'linear-gradient(90deg,#a9641d,#c9a24a,#4a9e3f,#1f7d38)' }}
        aria-hidden="true"
      />
      <div className="mt-0.5 flex justify-between font-mono text-[10px] tracking-[0.1em] text-bone/45">
        <span>0.2 bare</span>
        <span>0.9 canopy</span>
      </div>
    </div>
  )
}

export default function SectorFocusView({ variant = 'eudr' }) {
  const reduced = useReducedMotion()
  const navigate = useNavigate()
  const [layers, setLayers] = useState(DEFAULT_LAYERS[variant] ?? DEFAULT_LAYERS.eudr)
  const [selectedPlotId, setSelectedPlotId] = useState(null)

  const openBatch = useCallback(
    (batchId) => navigate(`/app/buyer/batches?batch=${encodeURIComponent(batchId)}`),
    [navigate],
  )

  const plotIds = useMemo(() => EUDR.plots.map((plot) => plot.id), [])
  const selectedPlot = EUDR.plots.find((plot) => plot.id === selectedPlotId) ?? null

  const toggleLayer = useCallback((key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const handlePickCentre = useCallback(() => setSelectedPlotId(null), [])

  const downloadOneGeoJSON = useCallback((plot) => {
    downloadJSON(
      plotsToGeoJSON([plot], { baselineDate: EUDR.baselineDate }),
      `ForestOS-${plot.id}-plot.geojson`,
    )
  }, [])

  const downloadOneCert = useCallback((plot) => {
    downloadCert(
      plotToAuditCert(plot, { sector: SECTOR, baselineDate: EUDR.baselineDate }),
      `ForestOS-${plot.id}-audit-cert.json`,
    )
  }, [])

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-emerald-900/10 bg-card shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h3 className="font-display text-lg leading-tight text-ink">
              Sector Focus · {SECTOR.name}
            </h3>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              {SECTOR.code} · {SECTOR.block} · {SECTOR.center.lat.toFixed(3)}° S,{' '}
              {SECTOR.center.lon.toFixed(3)}° E
            </p>
          </div>
          {selectedPlot && (
            <button
              type="button"
              onClick={() => setSelectedPlotId(null)}
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint transition-colors hover:text-ink"
            >
              Clear selection
            </button>
          )}
        </div>

        <div className="relative h-[58svh] min-h-[380px] w-full bg-forest-900">
          <ErrorBoundary fallback={mapFallback}>
            <Suspense fallback={mapLoading}>
              <SectorFocusMap
                layers={layers}
                selectedPlotId={selectedPlotId}
                onPickPlot={setSelectedPlotId}
                onPickCentre={handlePickCentre}
                reducedMotion={Boolean(reduced)}
              />
            </Suspense>
          </ErrorBoundary>

          <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4">
            <div className="flex flex-col gap-2">
              {layers.audit && <StatusLegend />}
              {layers.ndvi && <NdviLegend />}
            </div>
            <SectorLayerToggle layers={layers} onToggle={toggleLayer} />
          </div>

          <PlotInspector
            plot={selectedPlot}
            onClose={() => setSelectedPlotId(null)}
            onDownloadGeoJSON={downloadOneGeoJSON}
            onDownloadCert={downloadOneCert}
            onOpenBatch={openBatch}
          />
        </div>

        {/* Keyboard / screen-reader path to every plot — the map canvas is not
            a reliable target for either. */}
        <div className="border-t border-line px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
            {EUDR.plots.length} audit plots · select one to inspect
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Sector audit plots">
            {EUDR.plots.map((plot) => {
              const active = plot.id === selectedPlotId
              return (
                <li key={plot.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedPlotId(active ? null : plot.id)}
                    aria-pressed={active}
                    className={
                      'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-mono text-[11px] transition-colors ' +
                      (active
                        ? 'border-emerald-700 bg-emerald-700 text-white'
                        : 'border-line bg-card text-ink-muted hover:border-line-strong hover:text-ink')
                    }
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: STATUS_CSS[plot.status] }}
                      aria-hidden="true"
                    />
                    {plot.id}
                    <span className="sr-only"> — {STATUS_LABEL[plot.status]}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <p className="border-t border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          Prototype · schematic plot polygons on Esri World Imagery
        </p>
      </div>

      <AuditActivityStream onSelectPlot={setSelectedPlotId} plotIds={plotIds} />
    </div>
  )
}
