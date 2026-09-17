import { useId } from 'react'

function Gauge({ pct, colour }) {
  const gid = useId()
  const r = 26
  const circ = Math.PI * r // half circle
  const clamped = Math.max(0, Math.min(1, pct))
  return (
    <svg viewBox="0 0 64 40" className="h-10 w-16" aria-hidden="true">
      <defs>
        <clipPath id={gid}>
          <rect x="0" y="0" width="64" height="36" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${gid})`}>
        <path d={`M 6 34 A ${r} ${r} 0 0 1 58 34`} fill="none" stroke="#d1cab8" strokeWidth="6" strokeLinecap="round" />
        <path
          d={`M 6 34 A ${r} ${r} 0 0 1 58 34`}
          fill="none"
          stroke={colour}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${clamped * circ} ${circ}`}
        />
      </g>
    </svg>
  )
}

/**
 * Centre board — the NTZDC view's hero. One tile per collection centre: today's
 * intake as a gauge against target, moisture reading against the accepted band,
 * and last-intake time. A board, not a table.
 */
export default function NtzdcCentreBoard({ centres, band }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {centres.map((c) => {
        const pending = c.status === 'pending'
        const ratio = c.targetKg ? c.todayKg / c.targetKg : 0
        const inBand = c.moisturePct >= band.low && c.moisturePct <= band.high
        const gaugeColour = pending ? '#8a948a' : ratio >= 0.9 ? '#059669' : '#065f46'
        return (
          <div
            key={c.id}
            className={
              'rounded-lg border bg-card p-3.5 shadow-card ' +
              (pending ? 'border-amber-700/25' : 'border-emerald-900/10')
            }
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-medium text-ink">{c.name}</p>
                <p className="font-mono text-[10px] tracking-[0.06em] text-ink-faint">{c.id}</p>
              </div>
              <Gauge pct={ratio} colour={gaugeColour} />
            </div>

            <p className="mt-1 font-display text-2xl leading-none tabular-nums text-ink">
              {pending ? '—' : `${c.todayKg.toLocaleString()}`}
              {!pending && <span className="ml-1 font-sans text-[11px] text-ink-muted">kg</span>}
            </p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
              {pending ? 'awaiting first pickup' : `${Math.round(ratio * 100)}% of ${c.targetKg.toLocaleString()} kg target`}
            </p>

            <div className="mt-3 flex items-center justify-between border-t border-line pt-2 font-mono text-[10px] uppercase tracking-[0.08em]">
              <span className={inBand || pending ? 'text-ink-muted' : 'text-amber-700'}>
                {pending ? 'moisture —' : `moisture ${c.moisturePct}%${inBand ? '' : ' · out of band'}`}
              </span>
              <span className="text-ink-faint">{c.lastIntake}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
