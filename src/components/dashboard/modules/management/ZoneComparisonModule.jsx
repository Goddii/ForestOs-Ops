import { ModuleHeader, Panel, DataTable } from '../../DashboardKit'
import {
  NTZDC_MANAGEMENT,
  zoneConservationPremium,
  zoneConservationVerifiedPct,
} from '../../../../lib/dashboard/ntzdcManagement'

const LEGEND = [
  { label: 'Base rate', className: 'bg-emerald-900' },
  { label: 'Quality premium', className: 'bg-emerald-600' },
  { label: 'Conservation premium — earned', className: 'bg-emerald-400' },
  { label: 'Conservation premium — held pending verification', className: 'bg-emerald-400/30' },
]

/**
 * Base + quality + conservation pay bar on one shared scale (the top payer's
 * earned total). The conservation premium is split: the solid part is earned
 * (verified), the faded part is held pending verification — an amount the zone
 * can still unlock, shown so the gap does not read as a permanent shortfall.
 */
function PayStack({ row, max }) {
  const { pay } = row
  const segs = [
    { w: pay.baseKesPerKg, className: 'bg-emerald-900' },
    { w: pay.qualityPremiumKesPerKg, className: 'bg-emerald-600' },
    { w: row.conservation.earned, className: 'bg-emerald-400' },
    { w: row.conservation.held, className: 'bg-emerald-400/30' },
  ]
  return (
    <div className="min-w-[220px]">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-line-strong"
          role="img"
          aria-label={`Base ${pay.baseKesPerKg}, quality ${pay.qualityPremiumKesPerKg}, conservation earned ${row.conservation.earned}, conservation held ${row.conservation.held} shillings per kilo`}
        >
          {segs.map((seg, i) => (
            <span key={i} className={'h-full ' + seg.className} style={{ width: `${(seg.w / max) * 100}%` }} />
          ))}
        </span>
        <span className="shrink-0 font-mono tabular-nums text-ink">{row.earnedTotal.toFixed(1)}</span>
      </div>
      <p className="mt-1 font-mono text-[10px] tabular-nums text-ink-faint">
        {pay.baseKesPerKg.toFixed(0)} base · +{pay.qualityPremiumKesPerKg.toFixed(1)} quality · +
        {row.conservation.earned.toFixed(1)} conservation
        {row.conservation.held > 0 && (
          <span className="text-amber-700"> · +{row.conservation.held.toFixed(1)} held</span>
        )}
      </p>
    </div>
  )
}

const COLUMNS = [
  { key: 'name', label: 'Zone', sortAccessor: (r) => r.name },
  { key: 'pay', label: 'Pay · KES/kg (earned)', sortAccessor: (r) => r.earnedTotal },
  { key: 'verifiedPct', label: 'Conservation verified', align: 'right', mono: true, sortAccessor: (r) => r.verifiedPct },
  { key: 'trainingCoveragePct', label: 'Training coverage', align: 'right', mono: true, sortAccessor: (r) => r.trainingCoveragePct },
  { key: 'payGap', label: 'Pay gap', align: 'right', mono: true, sortAccessor: (r) => r.payGap },
]

export default function ZoneComparisonModule() {
  const { zones, season } = NTZDC_MANAGEMENT

  const enriched = zones.map((z) => {
    const conservation = zoneConservationPremium(z)
    const earnedTotal = z.pay.baseKesPerKg + z.pay.qualityPremiumKesPerKg + conservation.earned
    return {
      ...z,
      conservation,
      earnedTotal,
      verifiedPct: zoneConservationVerifiedPct(z),
    }
  })
  const maxEarned = Math.max(...enriched.map((z) => z.earnedTotal))
  const minEarned = Math.min(...enriched.map((z) => z.earnedTotal))

  // Widest gap in what farmers actually earn, first.
  const rows = enriched
    .map((z) => ({ ...z, payGap: +(maxEarned - z.earnedTotal).toFixed(1) }))
    .sort((a, b) => b.payGap - a.payGap)

  const widest = rows[0]
  const top = rows[rows.length - 1]

  // The earned gap has two distinct drivers, and Forest Line makes both
  // trackable: a lower premium RATE (operator policy) and premium HELD because
  // conservation work is not yet verified (the zone can close this).
  const rateGap = +(
    top.pay.baseKesPerKg +
    top.pay.qualityPremiumKesPerKg +
    top.conservation.full -
    (widest.pay.baseKesPerKg + widest.pay.qualityPremiumKesPerKg + widest.conservation.full)
  ).toFixed(1)
  const verificationGap = +(widest.payGap - rateGap).toFixed(1)

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Zone Comparison"
        prototype
        sub={`All zones · ${season} · KES ${minEarned.toFixed(1)}–${maxEarned.toFixed(1)}/kg earned · widest gap KES ${widest.payGap.toFixed(1)}/kg`}
      />

      <div className="rounded-xl border border-amber-700/25 bg-amber-500/[0.07] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber-700">
          Two levers on the pay gap
        </p>
        <p className="mt-2 max-w-[78ch] text-[14px] leading-relaxed text-ink">
          {widest.name} farmers earn <span className="font-semibold">KES {widest.payGap.toFixed(1)}/kg less</span>{' '}
          than {top.name}. About <span className="font-semibold">KES {rateGap.toFixed(1)}/kg</span> is a
          lower base + premium <span className="font-semibold">rate</span> — an operator policy choice,
          editable in Price Configurator. About{' '}
          <span className="font-semibold">KES {Math.max(0, verificationGap).toFixed(1)}/kg</span> is
          conservation premium <span className="font-semibold">held pending verification</span>:{' '}
          {widest.name} has verified {widest.verifiedPct}% of its conservation work against{' '}
          {top.name}&rsquo;s {top.verifiedPct}%. One lever is commercial; the other is a verification
          gap the zone can close.
        </p>
      </div>

      <Panel
        title="What each zone earns per kilo of green leaf"
        lede="The conservation premium pays out in proportion to verified conservation work. The solid bar is earned; the faded tail is held pending field + satellite verification. Rows are ordered by the earned gap."
        actions={
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
            {LEGEND.map((seg) => (
              <li key={seg.label} className="flex items-center gap-1.5">
                <span className={'h-2 w-2 rounded-full ' + seg.className} aria-hidden="true" />
                {seg.label}
              </li>
            ))}
          </ul>
        }
      >
        <DataTable
          columns={COLUMNS}
          rows={rows}
          sortable
          csvName="ForestOS-zone-pay-comparison"
          renderCell={(key, row) => {
            if (key === 'pay') return <PayStack row={row} max={maxEarned} />
            if (key === 'verifiedPct') return `${row.verifiedPct}%`
            if (key === 'trainingCoveragePct') return `${row.trainingCoveragePct}%`
            if (key === 'payGap')
              return row.payGap > 0 ? (
                <span className="text-amber-700">−{row.payGap.toFixed(1)}</span>
              ) : (
                <span className="text-ink-faint">—</span>
              )
            return row[key]
          }}
        />
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
          Snapshot for {season}. Re-run each season to track whether the spread is closing.
        </p>
      </Panel>
    </div>
  )
}
