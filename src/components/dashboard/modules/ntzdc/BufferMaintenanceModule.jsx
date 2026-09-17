import { ModuleHeader, Panel, StatTile, BarMeter } from '../../DashboardKit'
import { NTZDC } from '../../../../lib/dashboard/ntzdc'

const TYPE_TONE = {
  Patrol: 'text-ink-muted',
  Planting: 'text-emerald-700',
  Fence: 'text-ink-muted',
}

export default function BufferMaintenanceModule() {
  const { buffer } = NTZDC

  return (
    <div className="space-y-5">
      <ModuleHeader title="Buffer Maintenance" sub="Boundary patrols, replanting and fence upkeep · Kiptunga Block" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Patrols this week" value={buffer.patrolsThisWeek} tone="positive" />
        <StatTile label="Seedlings planted" value={`${(buffer.seedlingsPlanted / 1000).toFixed(1)}k`} unit="this month" tone="positive" />
        <StatTile
          label="Boundary integrity"
          value={`${buffer.boundaryIntegrityPct}%`}
          tone="positive"
          delta={{ label: '+2 pp vs Aug', dir: 'up' }}
        />
        <StatTile label="Open issues" value={buffer.openIssues} tone="warn" />
      </div>

      <Panel title="Boundary integrity by segment" lede="Fence, canopy and signage condition along the covenant line.">
        <div className="space-y-3">
          {[
            { seg: 'Kiptunga NW', pct: 97 },
            { seg: 'Nessuit spur', pct: 91 },
            { seg: 'Tinet edge', pct: 84 },
            { seg: 'Mariashoni S', pct: 96 },
          ].map((s) => (
            <BarMeter
              key={s.seg}
              label={s.seg}
              value={s.pct}
              max={100}
              display={`${s.pct}%`}
              tone={s.pct < 88 ? 'amber' : 'emerald'}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Maintenance log" lede="Field actions on the buffer this fortnight.">
        <ul className="divide-y divide-line">
          {buffer.log.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span className={'mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ' + (TYPE_TONE[entry.type] ?? 'text-ink-muted')}>
                {entry.type}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-ink">{entry.note}</p>
                <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                  {entry.id} · {entry.date}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
