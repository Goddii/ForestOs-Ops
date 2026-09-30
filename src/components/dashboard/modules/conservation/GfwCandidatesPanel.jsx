import { useEffect, useState } from 'react'
import { Panel, StatusPill } from '../../DashboardKit'
import { fetchCandidates } from '../../../../lib/conservation/gfw'
import { formatCoord, formatDay, formatHa } from '../../../../lib/conservation/labels'
import SatelliteEvidence from './SatelliteEvidence'
import { CAPTION } from './ui'

const CONFIDENCE_TONE = { highest: 'critical', high: 'warn' }

/**
 * Deforestation alerts from Global Forest Watch across the sector, newest
 * first. These are candidates from an outside source, not the officer's own
 * alert queue: nothing here changes an alert or raises an incident.
 */
export default function GfwCandidatesPanel() {
  const [state, setState] = useState({ status: 'loading', alerts: [], total: 0, from: null })
  const [openKey, setOpenKey] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchCandidates(controller.signal)
      .then((body) => setState({ status: 'ready', alerts: body.alerts, total: body.total ?? body.alerts.length, from: body.from }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ status: error.code ?? 'unavailable', alerts: [], total: 0, from: null })
      })
    return () => controller.abort()
  }, [])

  const lede =
    state.status === 'ready'
      ? `${state.total > state.alerts.length ? `Newest ${state.alerts.length} of ${state.total} clusters` : `${state.total} ${state.total === 1 ? 'cluster' : 'clusters'}`} since ${formatDay(state.from, true)} inside the mapped forest or within 1 km of its edge, from Global Forest Watch integrated alerts (GLAD-L, GLAD-S2, RADD). Outside candidates: they do not change your alert queue.`
      : 'Deforestation alerts from Global Forest Watch across the sector, shown as candidates for review.'

  return (
    <Panel title="Forest Watch candidates" lede={lede}>
      {state.status === 'loading' && <p className="text-[13px] text-ink-muted" aria-live="polite">Loading alerts…</p>}
      {state.status === 'not_configured' && (
        <p className="text-[13px] text-ink-muted">
          Not connected. Add a free Global Forest Watch key as <span className="font-mono text-[12px]">GFW_API_KEY</span> in{' '}
          <span className="font-mono text-[12px]">.env.local</span> (or the host’s environment) and restart.
        </p>
      )}
      {state.status === 'unavailable' && (
        <p role="alert" className="text-[13px] text-ink-muted">Global Forest Watch could not be reached. The alerts above are unaffected.</p>
      )}
      {state.status === 'ready' && state.alerts.length === 0 && (
        <p className="text-[13px] text-ink-muted">No new deforestation alerts in the sector for this period.</p>
      )}
      {state.status === 'ready' && state.alerts.length > 0 && (
        <ul className="divide-y divide-line">
          {state.alerts.map((a) => {
            const key = `${a.lat},${a.lon}`
            const open = key === openKey
            return (
              <li key={key} className="py-2.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="font-mono text-[12px] text-ink">{formatCoord(a.lat)}, {formatCoord(a.lon)}</p>
                    <p className={CAPTION + ' mt-0.5'}>{formatDay(a.date, true)} · {formatHa(a.areaHa)} ha</p>
                    <p className="mt-0.5 text-[12px] text-ink-muted">
                      {a.inside ? `Inside the forest, ${a.edgeM} m from its edge` : `${a.edgeM} m outside the forest edge`}
                    </p>
                  </div>
                  <StatusPill status={a.confidence} tone={CONFIDENCE_TONE[a.confidence] ?? 'neutral'} />
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenKey(open ? null : key)}
                    className="inline-flex min-h-11 items-center rounded-md border border-line px-3 font-mono text-[11px] text-ink-muted hover:border-line-strong hover:text-ink"
                  >
                    {open ? 'Hide imagery' : 'Show imagery'}
                  </button>
                </div>
                {open && <SatelliteEvidence key={key} alert={{ lat: a.lat, lon: a.lon, passDate: a.date }} />}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
