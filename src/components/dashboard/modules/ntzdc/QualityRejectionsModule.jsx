import { ModuleHeader, Panel, StatTile, BarMeter, Sparkline } from '../../DashboardKit'
import { NTZDC } from '../../../../lib/dashboard/ntzdc'

const MONTHS = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']

export default function QualityRejectionsModule() {
  const { quality } = NTZDC
  const worst = [...quality.byCentre].sort((a, b) => b.ratePct - a.ratePct)[0]
  const maxCentre = Math.max(...quality.byCentre.map((c) => c.ratePct))

  return (
    <div className="space-y-5">
      <ModuleHeader title="Quality & Rejections" sub="Green-leaf rejections at the collection gate · rolling 8 months" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Rejection rate"
          value={`${quality.rejectionRatePct}%`}
          tone="positive"
          delta={{ label: '−1.9 pp vs Feb', dir: 'down' }}
        />
        <StatTile label="Top reason" value="Coarse pluck" unit={`${quality.byReason[0].pct}% of rejects`} />
        <StatTile label="Highest centre" value={worst.centre} unit={`${worst.ratePct}% rejected`} tone="warn" />
        <StatTile label="Target" value="< 4.0%" unit="zone standard" />
      </div>

      <Panel title="Rejection rate trend" lede="Monthly mean across all four centres.">
        <Sparkline values={quality.trendPct} />
        <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
          {MONTHS.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Rejections by reason" lede="Share of rejected deliveries.">
          <div className="space-y-3">
            {quality.byReason.map((r) => (
              <BarMeter key={r.reason} label={r.reason} value={r.pct} max={100} display={`${r.pct}%`} />
            ))}
          </div>
        </Panel>
        <Panel title="Rejection rate by centre" lede="Where retraining effort should focus.">
          <div className="space-y-3">
            {quality.byCentre.map((c) => (
              <BarMeter
                key={c.centre}
                label={c.centre}
                value={c.ratePct}
                max={maxCentre}
                display={`${c.ratePct}%`}
                tone={c.ratePct >= 5 ? 'amber' : 'emerald'}
              />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
