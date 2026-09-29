import { POLICY } from '../../../../lib/conservation/policy'
import { formatPct } from '../../../../lib/conservation/labels'

const FILL = { pass: 'bg-emerald-600', borderline: 'bg-ink-faint/60', fail: 'bg-amber-500' }

const at = (fraction) => `${Math.max(0, Math.min(1, fraction)) * 100}%`

/**
 * The 95% range of a survival count on a 0 to 100% track: the coloured segment
 * is the range, the dot is the count, and the tick is the threshold. It always
 * carries its numbers as text: "68%, range 54–79%".
 */
export default function IntervalBar({ p, lower, upper, verdict, className = '' }) {
  const label = `${formatPct(p)}, range ${Math.round(lower * 100)}–${formatPct(upper)}`
  return (
    <span
      role="img"
      aria-label={label}
      title={`${label}. The tick marks the ${formatPct(POLICY.survival.threshold)} threshold.`}
      className={'relative inline-block h-2 w-36 rounded-full bg-line-strong align-middle ' + className}
    >
      <span className={'absolute top-0 h-2 rounded-full ' + FILL[verdict]} style={{ left: at(lower), width: at(upper - lower) }} />
      <span className="absolute -top-1 h-4 w-0.5 rounded-full bg-ink" style={{ left: at(POLICY.survival.threshold) }} />
      <span
        className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink"
        style={{ left: at(p) }}
      />
    </span>
  )
}
