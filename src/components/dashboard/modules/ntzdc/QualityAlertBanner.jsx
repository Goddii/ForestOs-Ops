import { AlertTriangle, Minus, Plus } from 'lucide-react'

/**
 * Quality & Training Alerts — a top banner that surfaces any farmer or
 * collection centre whose rejection rate is over the configurable threshold.
 * Reusable across the Collection Feeds and Quality modules.
 */
export default function QualityAlertBanner({ records, threshold, onThreshold }) {
  const withRate = records.map((r) => ({
    ...r,
    rejectedKg: r.totalKg - r.acceptedKg,
    ratePct: r.totalKg ? Math.round(((r.totalKg - r.acceptedKg) / r.totalKg) * 100) : 0,
  }))

  const flaggedFarmers = withRate.filter((r) => r.ratePct >= threshold)

  const byCentre = {}
  for (const r of withRate) {
    const c = (byCentre[r.centre] ??= { centre: r.centre, total: 0, rejected: 0 })
    c.total += r.totalKg
    c.rejected += r.rejectedKg
  }
  const flaggedCentres = Object.values(byCentre)
    .map((c) => ({ ...c, ratePct: Math.round((c.rejected / c.total) * 100) }))
    .filter((c) => c.ratePct >= threshold)

  const nudge = (d) => onThreshold(Math.max(5, Math.min(50, threshold + d)))
  const clean = flaggedFarmers.length === 0 && flaggedCentres.length === 0

  return (
    <section
      className={
        'rounded-xl border p-4 shadow-card sm:p-5 ' +
        (clean ? 'border-emerald-900/10 bg-card' : 'border-amber-700/30 bg-amber-500/[0.06]')
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle
            className={'mt-0.5 h-4 w-4 shrink-0 ' + (clean ? 'text-emerald-700' : 'text-amber-700')}
            strokeWidth={2.25}
            aria-hidden="true"
          />
          <div>
            <h3 className="font-display text-lg leading-tight text-ink">Quality &amp; Training Alerts</h3>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              {clean
                ? `No farmer or centre is over the ${threshold}% rejection threshold today.`
                : `${flaggedFarmers.length} farmer${flaggedFarmers.length === 1 ? '' : 's'} and ${flaggedCentres.length} centre${flaggedCentres.length === 1 ? '' : 's'} over the ${threshold}% threshold — flag for retraining.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">Threshold</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => nudge(-5)}
              aria-label="Lower threshold"
              className="grid h-6 w-6 place-items-center rounded border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
            >
              <Minus className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
            </button>
            <span className="w-10 text-center font-mono text-[13px] tabular-nums text-ink">{threshold}%</span>
            <button
              type="button"
              onClick={() => nudge(5)}
              aria-label="Raise threshold"
              className="grid h-6 w-6 place-items-center rounded border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
            >
              <Plus className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {!clean && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {flaggedCentres.map((c) => (
            <li
              key={`c-${c.centre}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-700/40 bg-amber-500/[0.12] px-2.5 py-1 font-mono text-[11px] text-amber-700"
            >
              <span className="font-semibold uppercase tracking-[0.06em]">Centre</span> {c.centre} · {c.ratePct}%
            </li>
          ))}
          {flaggedFarmers.map((f) => (
            <li
              key={`f-${f.farmerId}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-700/30 bg-amber-500/[0.08] px-2.5 py-1 font-mono text-[11px] text-amber-700"
            >
              {f.farmerId} · {f.centre} · {f.ratePct}%
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
