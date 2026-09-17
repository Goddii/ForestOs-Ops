import { Link } from 'react-router-dom'
import { ClipboardCheck, Coins, ShieldCheck, Sprout } from 'lucide-react'
import { AlertCard, ModuleHeader, Panel, StatTile, StatusPill } from '../../DashboardKit'
import { ZONE } from '../../../../lib/dashboard/zoneManager'

export default function ZoneOverviewModule() {
  const { name, code, month, workers, blocks, exceptions, kpis } = ZONE
  return (
    <div className="space-y-5">
      <ModuleHeader
        title={name}
        sub={`${code} · ${month} · ${blocks.length} blocks · ${workers.toLocaleString()} workers`}
        prototype
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Green leaf · month"
          value={kpis.greenLeafT}
          unit="t"
          note={`${kpis.greenLeafTargetPct}% of target`}
          icon={Sprout}
        />
        <StatTile
          label="Labour cost / kg"
          value={kpis.laborCostPerKg}
          unit="KES"
          tone="warn"
          note={`+${kpis.laborCostDeltaPct}% vs Aug`}
          icon={Coins}
        />
        <StatTile
          label="Buffer verified"
          value={`${kpis.bufferVerifiedPct}%`}
          note={`${kpis.plotsOnWatch} plots on watch`}
          icon={ShieldCheck}
          share={kpis.bufferVerifiedPct / 100}
        />
        <StatTile
          label="Settled on time"
          value={`${kpis.settledOnTimePct}%`}
          tone="positive"
          note={`${kpis.settledOnTimeCount.toLocaleString()} of ${kpis.settledTotalCount.toLocaleString()}`}
          icon={ClipboardCheck}
          share={kpis.settledOnTimePct / 100}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Panel title="Needs you today" lede="The zone's own exceptions — see Exceptions for the full list.">
          <div className="space-y-2.5">
            {exceptions.map((item) => (
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

        <Panel title={`Blocks in ${name}`}>
          <ul className="divide-y divide-line">
            {blocks.map((block) => (
              <li key={block.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-ink">
                    {block.name} · {block.id}
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    {block.supervisor} · {block.workers} workers
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  <span className="font-mono text-[13px] font-semibold tabular-nums text-ink">
                    {(block.greenLeafKg / 1000).toFixed(1)} t
                  </span>
                  <StatusPill status={block.status === 'below' ? 'Below' : block.status === 'flagged' ? 'Flagged' : 'On target'} />
                </div>
              </li>
            ))}
          </ul>
          <Link
            to="blocks"
            className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.12em] text-emerald-700 hover:text-emerald-800"
          >
            Compare every block →
          </Link>
        </Panel>
      </div>
    </div>
  )
}
