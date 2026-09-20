import { Link } from 'react-router-dom'
import { AlertCard, BarMeter, ModuleHeader, Panel, Sparkline, StatTile, StatusPill } from '../../DashboardKit'
import { FACTORY } from '../../../../lib/dashboard/factoryManager'

const MONTHS = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']

const STATUS_TONE = { Normal: 'positive', Underperforming: 'warn', Degraded: 'warn', Fault: 'critical' }

const COMPARISON_LABEL = { weather_adjusted: 'Vs. weather-expected', trailing_average: 'Vs. trailing average' }

// A bare Sparkline (see DashboardKit.jsx) is a shape only — no axis, no
// values — which is fine as a decoration next to a StatTile that already
// states the current figure (how every other page uses it), but not enough
// on a panel whose whole job is to show the trend. This reads the real
// start/end values and delta back out of the same series so the chart
// stops being a shape with no numbers attached to it.
function trendSummary(values) {
  const start = values[0]
  const end = values[values.length - 1]
  const deltaPct = ((end - start) / start) * 100
  return { start, end, deltaPct }
}

export default function PowerEnergyModule() {
  const { energy, kpis, month } = FACTORY
  const { solar } = energy
  const comparisonUnderperforming = solar.comparison.pct < 80
  const costTrend = trendSummary(energy.costPerKgTrendKes)
  const genTrend = trendSummary(solar.generationTrailingKwh)

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Power & Energy"
        sub={`${month} · grid, diesel, fuelwood and solar behind the factory's energy cost`}
        prototype
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Grid electricity" value={energy.mix.gridKwh.toLocaleString()} unit="kWh" />
        <StatTile label="Diesel" value={energy.mix.dieselLitres.toLocaleString()} unit="litres" />
        <StatTile
          label="Solar generation"
          value={energy.mix.solarGenerationKwh.toLocaleString()}
          unit="kWh"
          note={`${solar.installCapacityKw} kW installed`}
        />
        <StatTile
          label="Energy cost / kg made tea"
          value={kpis.energyCostPerKg}
          unit="KES"
          tone="warn"
          note={`+${kpis.energyCostDeltaPct}% vs Aug`}
        />
      </div>

      <Panel title="Energy mix" lede="Share of total energy behind the line, by source.">
        <div className="space-y-3">
          {energy.mixShare.map((row) => (
            <BarMeter
              key={row.source}
              label={row.source}
              value={row.pct}
              max={100}
              display={`${row.pct}%`}
              tone={row.source.startsWith('Solar') ? 'emerald' : 'muted'}
            />
          ))}
        </div>
        <Link
          to="ledger"
          className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.12em] text-emerald-700 hover:text-emerald-800"
        >
          See every metered reading behind these figures →
        </Link>
      </Panel>

      <Panel title="Energy cost trend" lede="KES per kg made tea, monthly mean.">
        <div className="flex items-baseline justify-between text-[12px]">
          <span className="font-mono text-ink-muted">
            {MONTHS[0]} · KES {costTrend.start.toFixed(1)}
          </span>
          <span className={`font-mono font-semibold ${costTrend.deltaPct > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {MONTHS.at(-1)} · KES {costTrend.end.toFixed(1)} ({costTrend.deltaPct >= 0 ? '+' : ''}
            {costTrend.deltaPct.toFixed(1)}%)
          </span>
        </div>
        <Sparkline values={energy.costPerKgTrendKes} />
        <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
          {MONTHS.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Solar generation" lede={`${solar.installCapacityKw} kW installed · trailing ${MONTHS.length} months`}>
          <div className="flex items-baseline justify-between text-[12px]">
            <span className="font-mono text-ink-muted">
              {MONTHS[0]} · {genTrend.start.toLocaleString()} kWh
            </span>
            <span className={`font-mono font-semibold ${genTrend.deltaPct < 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {MONTHS.at(-1)} · {genTrend.end.toLocaleString()} kWh ({genTrend.deltaPct >= 0 ? '+' : ''}
              {genTrend.deltaPct.toFixed(1)}%)
            </span>
          </div>
          <Sparkline values={solar.generationTrailingKwh} />
          <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
            {MONTHS.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <BarMeter
              label="Self-consumption"
              value={solar.selfConsumptionPct}
              max={100}
              display={`${solar.selfConsumptionPct}%`}
            />
            <BarMeter
              label={COMPARISON_LABEL[solar.comparison.method]}
              value={solar.comparison.pct}
              max={100}
              display={`${solar.comparison.pct}%`}
              tone={comparisonUnderperforming ? 'amber' : 'emerald'}
            />
          </div>
          <AlertCard
            className="mt-3"
            tone={comparisonUnderperforming ? 'warn' : 'positive'}
            title={comparisonUnderperforming ? 'Solar output is underperforming' : 'Solar output is within normal range'}
            detail={solar.insight}
          />
        </Panel>

        <Panel title="Battery & panel health">
          <div className="space-y-3">
            <BarMeter label="State of charge" value={solar.battery.socPct} max={100} display={`${solar.battery.socPct}%`} />
            <BarMeter
              label="State of health"
              value={solar.battery.sohPct}
              max={100}
              display={`${solar.battery.sohPct}%`}
              tone={solar.battery.sohPct < 85 ? 'amber' : 'emerald'}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-muted">
            <span className="flex items-center gap-1.5">
              Panel status <StatusPill status={solar.battery.panelStatus} tone={STATUS_TONE[solar.battery.panelStatus]} />
            </span>
            <span className="flex items-center gap-1.5">
              Battery status <StatusPill status={solar.battery.batteryStatus} tone={STATUS_TONE[solar.battery.batteryStatus]} />
            </span>
          </div>
          <p className="mt-3 text-[11px] text-ink-faint">Last reading {solar.battery.lastReadingAgo}.</p>
        </Panel>
      </div>
    </div>
  )
}
