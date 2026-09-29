import { BarMeter } from '../../DashboardKit'
import { formatPct } from '../../../../lib/conservation/labels'

/**
 * A boundary-integrity bar. `BarMeter` covers the green and amber bands; it has
 * no red tone, so the critical band is drawn here on the same track markup.
 * The percentage is always printed beside it.
 */
export default function IntegrityBar({ label, value, band, className = '' }) {
  if (band === 'critical') {
    return (
      <div className={className}>
        <div className="flex items-baseline justify-between gap-3 text-[13px]">
          <span className="text-ink-muted">{label}</span>
          <span className="font-mono tabular-nums text-critical">{formatPct(value)}</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line-strong">
          <div className="h-full rounded-full bg-critical" style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
        </div>
      </div>
    )
  }
  return (
    <div className={className}>
      <BarMeter label={label} value={value} max={1} display={formatPct(value)} tone={band === 'amber' ? 'amber' : 'emerald'} />
    </div>
  )
}
