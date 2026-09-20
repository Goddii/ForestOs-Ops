import { Link } from 'react-router-dom'
import { Factory, Flame, Gauge, Zap } from 'lucide-react'
import { AlertCard, ModuleHeader, Panel, StatTile, StatusPill } from '../../DashboardKit'
import { FACTORY } from '../../../../lib/dashboard/factoryManager'

const LINE_STATUS_LABEL = { running: 'Running', flagged: 'Flagged', below: 'Idle' }
const LINE_STATUS_TONE = { running: 'positive', flagged: 'warn', below: 'critical' }

export default function FactoryOverviewModule() {
  const { name, code, month, workers, kpis, alerts, processing } = FACTORY
  return (
    <div className="space-y-5">
      <ModuleHeader
        title={name}
        sub={`${code} · ${month} · ${workers.toLocaleString()} floor staff`}
        prototype
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Green leaf intake · today"
          value={kpis.greenLeafIntakeT}
          unit="t"
          icon={Factory}
        />
        <StatTile
          label="Made tea output · today"
          value={kpis.madeTeaOutputT}
          unit="t"
          note={`${kpis.recoveryRatioPct}% recovery`}
          icon={Gauge}
        />
        <StatTile
          label="Machine uptime"
          value={`${kpis.machineUptimePct}%`}
          icon={Zap}
          share={kpis.machineUptimePct / 100}
        />
        <StatTile
          label="Energy cost / kg made tea"
          value={kpis.energyCostPerKg}
          unit="KES"
          tone="warn"
          note={`+${kpis.energyCostDeltaPct}% vs Aug`}
          icon={Flame}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Panel title="Needs you today" lede="Flags across intake, the processing line and quality holds.">
          <div className="space-y-2.5">
            {alerts.map((item) => (
              <AlertCard
                key={item.id}
                title={item.title}
                detail={item.detail}
                tag={item.tag}
                tagTone={item.tone === 'default' ? undefined : item.tone}
                tone={item.tone}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Processing lines">
          <ul className="divide-y divide-line">
            {processing.lines.map((line) => (
              <li key={line.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-ink">{line.stage}</p>
                  <p className="truncate text-[11px] text-ink-muted">{line.note}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  <span className="font-mono text-[13px] font-semibold tabular-nums text-ink">
                    {line.throughputKgHr.toLocaleString()} kg/h
                  </span>
                  <StatusPill status={LINE_STATUS_LABEL[line.status]} tone={LINE_STATUS_TONE[line.status]} />
                </div>
              </li>
            ))}
          </ul>
          <Link
            to="processing"
            className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.12em] text-emerald-700 hover:text-emerald-800"
          >
            Processing & grading detail →
          </Link>
        </Panel>
      </div>
    </div>
  )
}
