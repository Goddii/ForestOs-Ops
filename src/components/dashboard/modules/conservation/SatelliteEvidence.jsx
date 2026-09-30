import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { chipUrl, findScenes } from '../../../../lib/conservation/sentinel'
import { formatDay } from '../../../../lib/conservation/labels'
import { CAPTION } from './ui'

const ALERT_HALF_M = 400

function Chip({ title, scenes, point }) {
  const [index, setIndex] = useState(0)
  const scene = scenes[index]
  const step = (by) => setIndex((index + by + scenes.length) % scenes.length)
  return (
    <figure className="min-w-0">
      <figcaption className={CAPTION + ' flex items-center justify-between gap-2'}>
        {title}
        {scenes.length > 1 && (
          <span className="flex items-center gap-1 normal-case tracking-normal">
            <button type="button" onClick={() => step(-1)} aria-label={`${title}: previous scene`} className="grid h-8 w-8 place-items-center rounded-md border border-line hover:border-line-strong">
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span aria-live="polite">{index + 1} of {scenes.length}</span>
            <button type="button" onClick={() => step(1)} aria-label={`${title}: next scene`} className="grid h-8 w-8 place-items-center rounded-md border border-line hover:border-line-strong">
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </span>
        )}
      </figcaption>
      {scene ? (
        <>
          <div className="relative mt-1.5 aspect-square overflow-hidden rounded-lg border border-line bg-forest-900">
            <img
              src={chipUrl(scene, point, ALERT_HALF_M)}
              alt={`Sentinel-2 true-colour view, ${ALERT_HALF_M * 2} m across, centred on the alert, taken ${formatDay(scene.datetime.slice(0, 10), true)}`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <span
              className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 shadow"
              aria-hidden="true"
            />
          </div>
          <p className="mt-1.5 font-mono text-[11px] leading-snug text-ink-muted">
            {formatDay(scene.datetime.slice(0, 10), true)} · {(scene.cloud * 100).toFixed(0)}% cloud over the scene
          </p>
          <a
            href={scene.itemUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 break-all font-mono text-[10.5px] text-emerald-700 underline decoration-emerald-700/30 underline-offset-2 hover:text-emerald-800"
          >
            {scene.id}
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
          </a>
        </>
      ) : (
        <p className="mt-1.5 rounded-lg border border-dashed border-line p-4 text-[12px] text-ink-muted">
          No scene under 40% cloud in this window.
        </p>
      )}
    </figure>
  )
}

/**
 * Real Sentinel-2 imagery for one alert: a scene near the pass date beside a
 * clearer one from the weeks before, each tied to its public scene id so the
 * finding can be traced. Fetched live; if the services are unreachable the
 * rest of the alert still works.
 */
export default function SatelliteEvidence({ alert }) {
  const { lat, lon, passDate } = alert
  const [state, setState] = useState({ key: null, scenes: null, failed: false })
  const key = `${lat},${lon},${passDate}`

  useEffect(() => {
    const controller = new AbortController()
    findScenes({ lat, lon, passDate }, controller.signal)
      .then((scenes) => setState({ key, scenes, failed: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ key, scenes: null, failed: true })
      })
    return () => controller.abort()
  }, [key, lat, lon, passDate])

  const ready = state.key === key
  const point = { lat, lon }

  return (
    <section aria-label="Satellite imagery" className="mt-4 rounded-xl border border-line p-4">
      <h4 className="text-[14px] font-semibold text-ink">Satellite imagery</h4>
      <p className="mt-1 max-w-[62ch] text-[12px] leading-relaxed text-ink-muted">
        Live Sentinel-2 scenes (10 m per pixel, {ALERT_HALF_M * 2} m across) centred on the alert. The ring marks its position. The scene
        near the pass date may be a different day from the alert’s own pass if cloud hid it.
      </p>
      {!ready && <p className="mt-3 text-[12.5px] text-ink-muted" aria-live="polite">Looking for scenes…</p>}
      {ready && state.failed && (
        <p role="alert" className="mt-3 text-[12.5px] text-ink-muted">
          The imagery services could not be reached, so no scenes are shown. The alert’s recorded figures above are unaffected.
        </p>
      )}
      {ready && state.scenes && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Chip key={`b-${key}`} title="Before" scenes={state.scenes.earlier} point={point} />
          <Chip key={`c-${key}`} title="Around the pass" scenes={state.scenes.current} point={point} />
        </div>
      )}
    </section>
  )
}
