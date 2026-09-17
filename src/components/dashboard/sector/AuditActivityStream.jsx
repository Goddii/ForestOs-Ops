import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { AlertTriangle, FileCheck2, Layers, Package, Radar } from 'lucide-react'
import { AUDIT_ACTIVITY, SECTOR } from '../../../lib/dashboardData'

const KIND = {
  satellite: { Icon: Radar, css: '#3f7d86', label: 'SAT' },
  polygon: { Icon: Layers, css: '#15805e', label: 'GEO' },
  batch: { Icon: Package, css: '#5c6b5f', label: 'BATCH' },
  alert: { Icon: AlertTriangle, css: '#b8461c', label: 'ALERT' },
  cert: { Icon: FileCheck2, css: '#0f5f47', label: 'CERT' },
}

const TICK_MS = 5000
const ADD_EVERY = 3 // a new entry every ~15s — a paced sample, not a live socket
const MAX_ROWS = 7

function ago(seconds) {
  if (seconds < 3) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const m = Math.floor(seconds / 60)
  return `${m}m ago`
}

/**
 * Simulated audit / verification feed for the active sector. Not a live socket —
 * it ticks through `AUDIT_ACTIVITY` to show the shape of the pipeline. Reduced
 * motion renders the whole log at once with no ticking.
 */
// Whole log at once — the reduced-motion / no-JS-ticking rendering.
const STATIC_ROWS = AUDIT_ACTIVITY.map((entry, i) => ({
  key: `${entry.id}-static`,
  entry,
  age: (i + 1) * 7,
}))

export default function AuditActivityStream({ onSelectPlot, plotIds }) {
  const reduced = useReducedMotion()
  const [feed, setFeed] = useState(() =>
    AUDIT_ACTIVITY.slice(0, 4).map((entry, i) => ({ key: `${entry.id}-0`, entry, age: (i + 1) * 7 })),
  )
  const cursor = useRef(4)
  const ticks = useRef(0)

  useEffect(() => {
    if (reduced) return undefined
    const id = setInterval(() => {
      ticks.current += 1
      setFeed((prev) => {
        const aged = prev.map((row) => ({ ...row, age: row.age + TICK_MS / 1000 }))
        if (ticks.current % ADD_EVERY !== 0) return aged
        const next = AUDIT_ACTIVITY[cursor.current % AUDIT_ACTIVITY.length]
        cursor.current += 1
        return [{ key: `${next.id}-${cursor.current}`, entry: next, age: 0 }, ...aged].slice(0, MAX_ROWS)
      })
    }, TICK_MS)
    return () => clearInterval(id)
  }, [reduced])

  const rows = reduced ? STATIC_ROWS : feed
  const known = useMemo(() => new Set(plotIds ?? []), [plotIds])

  return (
    <section className="rounded-xl border border-emerald-900/10 bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg leading-tight text-ink">Audit Activity</h3>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-paper-sunk px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" aria-hidden="true" />
          Simulated feed
        </span>
      </div>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
        Satellite verification &amp; batch generation · {SECTOR.block}
      </p>

      <ul className="mt-3 divide-y divide-line">
        {rows.map(({ key, entry, age }) => {
          const meta = KIND[entry.kind] ?? KIND.polygon
          const { Icon } = meta
          const clickable = entry.plotId && known.has(entry.plotId)
          return (
            <li key={key} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
              <span
                className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md"
                style={{ background: `${meta.css}1f`, color: meta.css }}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] leading-snug text-ink">
                  {entry.text}
                  {entry.plotId && (
                    <button
                      type="button"
                      disabled={!clickable}
                      onClick={() => clickable && onSelectPlot?.(entry.plotId)}
                      className={
                        'ml-1.5 font-mono text-[11px] ' +
                        (clickable
                          ? 'text-emerald-700 underline-offset-2 hover:underline'
                          : 'text-ink-faint')
                      }
                    >
                      {entry.plotId}
                    </button>
                  )}
                </p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                  {meta.label} · {ago(age)}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
