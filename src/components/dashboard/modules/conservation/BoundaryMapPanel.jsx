import { Suspense, lazy, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Panel } from '../../DashboardKit'
import ErrorBoundary from '../../../ErrorBoundary'
import { STATUS_CSS, STATUS_LABEL } from '../../sector/sectorMapStyle'
import { useConservation } from '../../../../lib/conservation/context'
import { COPY, formatHa } from '../../../../lib/conservation/labels'
import { plotsInScope } from '../../../../lib/conservation/selectors'

// Cesium is heavy; it downloads only when this panel is on screen.
const SectorFocusMap = lazy(() => import('../../sector/SectorFocusMap'))

const GLASS = 'rounded-lg border border-bone/15 bg-[#0c1710]/85 backdrop-blur-md'

const mapFallback = (
  <div className="grid h-full place-items-center bg-forest-900 p-8 text-center">
    <p className="max-w-sm text-sm text-bone-300">
      The 3D map could not start in this browser. The plot list below still works.
    </p>
  </div>
)

const mapLoading = (
  <div className="grid h-full place-items-center bg-forest-900">
    <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-sage-500">Loading sector…</span>
  </div>
)

/**
 * A sample of the sector's plots on the 3D map, for orientation only: the
 * segments themselves are not mapped in this prototype. The plot chips below
 * the map are the keyboard and screen-reader path to every plot; the map
 * canvas is not focusable. The selected plot is local state, not a link.
 */
export default function BoundaryMapPanel() {
  const ctx = useConservation()
  const reduced = useReducedMotion()
  const [selectedId, setSelectedId] = useState(null)
  const plots = plotsInScope(ctx)
  const hectares = plots.reduce((sum, plot) => sum + plot.hectares, 0)
  const selected = plots.find((plot) => plot.id === selectedId) ?? null
  const zoneName = (zoneId) => ctx.ref.zones.find((z) => z.zoneId === zoneId)?.name ?? zoneId

  return (
    <Panel
      title="Sample plots on the sector map"
      lede={`Illustrative sample: ${plots.length} plots, ${formatHa(hectares)} ha. Segment geometry is not mapped in this prototype.`}
    >
      <div className="overflow-hidden rounded-xl border border-emerald-900/10">
        <div className="relative h-[58svh] min-h-[380px] w-full bg-forest-900">
          <ErrorBoundary fallback={mapFallback}>
            <Suspense fallback={mapLoading}>
              <SectorFocusMap
                layers={{ audit: true, ndvi: true, pins: false }}
                selectedPlotId={selectedId}
                onPickPlot={setSelectedId}
                reducedMotion={Boolean(reduced)}
              />
            </Suspense>
          </ErrorBoundary>

          <div className="pointer-events-none absolute left-0 top-0 z-20 flex flex-col gap-2 p-3 sm:p-4">
            <div className={'flex flex-wrap gap-x-3 gap-y-1 px-2.5 py-1.5 ' + GLASS}>
              {Object.entries(STATUS_LABEL).map(([key, label]) => (
                <span key={key} className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-bone/70">
                  <span className="h-2 w-2 rounded-[2px]" style={{ background: STATUS_CSS[key] }} aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
            <div className={'px-2.5 py-1.5 ' + GLASS}>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-bone/70">{COPY.ndviGloss}</p>
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
          </div>
        </div>

        <div className="border-t border-line bg-card px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
            {plots.length} sample plots · select one to centre the map
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Sample plots">
            {plots.map((plot) => {
              const active = plot.id === selectedId
              return (
                <li key={plot.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedId(active ? null : plot.id)}
                    className={
                      'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 font-mono text-[11px] transition-colors ' +
                      (active
                        ? 'border-emerald-700 bg-emerald-700 text-white'
                        : 'border-line bg-card text-ink-muted hover:border-line-strong hover:text-ink')
                    }
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_CSS[plot.status] }} aria-hidden="true" />
                    {plot.id}
                    <span className="sr-only"> — {STATUS_LABEL[plot.status].toLowerCase()}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 min-h-5 text-[12.5px] text-ink-muted" aria-live="polite">
            {selected
              ? `${selected.id} · ${STATUS_LABEL[selected.status].toLowerCase()} · ${formatHa(selected.hectares)} ha · ${zoneName(selected.zoneId)}`
              : 'No plot selected.'}
          </p>
        </div>
      </div>
    </Panel>
  )
}
