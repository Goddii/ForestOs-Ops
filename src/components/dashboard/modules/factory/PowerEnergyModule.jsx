import { AlertCard, BarMeter, ModuleHeader, Panel, Sparkline, StatTile, StatusPill } from '../../DashboardKit'
import { FACTORY } from '../../../../lib/dashboard/factoryManager'

const MONTHS = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']

export default function PowerEnergyModule() {
  const { energy, kpis, month } = FACTORY
  const { solar } = energy

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
      </Panel>

      <Panel title="Energy cost trend" lede="KES per kg made tea, monthly mean.">
        <Sparkline values={energy.costPerKgTrendKes} />
        <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
          {MONTHS.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Solar generation" lede={`${solar.installCapacityKw} kW installed · trailing ${MONTHS.length} months`}>
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
              label="Vs. weather-expected"
              value={solar.expectedVsActualPct}
              max={100}
              display={`${solar.expectedVsActualPct}%`}
              tone={solar.expectedVsActualPct < 80 ? 'amber' : 'emerald'}
            />
          </div>
          <AlertCard
            className="mt-3"
            tone="positive"
            title="Solar output is within normal range"
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
              Panel status <StatusPill status={solar.battery.panelStatus} tone="positive" />
            </span>
            <span className="flex items-center gap-1.5">
              Battery status <StatusPill status={solar.battery.batteryStatus} tone="positive" />
            </span>
          </div>
          <p className="mt-3 text-[11px] text-ink-faint">Last reading {solar.battery.lastReadingAgo}.</p>
        </Panel>
      </div>
    </div>
  )
}
