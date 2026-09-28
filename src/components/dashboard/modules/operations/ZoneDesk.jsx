import { NavLink } from 'react-router-dom'
import { Panel, StatusPill } from '../../DashboardKit'
import { NATIONAL, ZONE_STATUS } from '../../../../lib/dashboard/operationsNational'
import { allZones, setDeskZone, useOperations } from '../../../../lib/dashboard/operationsStore'
import { SelectField } from './controls'

const TABS = [
  { to: '', label: 'Desk overview', end: true },
  { to: 'logistics', label: 'Leaf Logistics' },
  { to: 'teams', label: 'Field Teams' },
  { to: 'conservation', label: 'Buffer & Conservation' },
  { to: 'work', label: 'Work Orders & Stores' },
  { to: 'incidents', label: 'Incidents' },
  { to: 'payroll', label: 'Payroll Run' },
]

const STATUS_TONE = { clear: 'positive', flagged: 'warn', below: 'critical' }

/** One zone's snapshot, for zones whose full desk isn't wired into the prototype. */
function ZoneSnapshot({ z }) {
  const rows = [
    ['Zone lead', z.lead],
    ['Factory', z.factory],
    ['Green leaf today', `${(z.leafKg / 1000).toFixed(1)} of ${(z.planKg / 1000).toFixed(1)} t plan`],
    ['Workers mustered', `${z.present} of ${z.rostered}`],
    ['Fleet', `${z.fleet.moving} of ${z.fleet.total} moving${z.fleet.down ? ` · ${z.fleet.down} down` : ''}`],
    ['Week 36 payroll', z.payroll.status],
    ['Incidents open', `${z.incidentsOpen}${z.incidentsCritical ? ` · ${z.incidentsCritical} critical` : ''}`],
    ['Fire', `${z.fire.danger} danger · firebreaks ${z.fire.firebreakPct}% · ${z.fire.watch ? 'watch on' : 'no watch'}`],
    ['Tree survival', `${z.survivalPct}%`],
  ]
  return (
    <Panel title={`${z.name} · Zone Desk`} lede={z.headline} actions={<StatusPill status={ZONE_STATUS[z.status]} tone={STATUS_TONE[z.status]} />}>
      <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 border-b border-line py-1.5 text-[12.5px]">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="text-right font-mono tabular-nums text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 rounded-lg border border-line bg-paper-sunk/60 p-3 text-[12px] leading-relaxed text-ink-muted">
        This prototype wires the full block-level desk (lorries, muster, work orders, stores, incidents, payroll run) for South
        West Mau only. In the real system each zone&rsquo;s desk feeds its own. For {z.name}, act from the national screens
        (Tea, Conservation, People &amp; Payroll, Incidents, Approvals), which already cover it.
      </p>
    </Panel>
  )
}

/**
 * The Operations Manager stepping into one zone's operations desk. Wraps
 * each desk screen with a zone picker and the desk's own tab row.
 */
export default function ZoneDesk({ children }) {
  const s = useOperations()
  const zones = allZones(s)
  const zone = zones.find((z) => z.id === s.deskZone) ?? zones[0]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-emerald-900/10 bg-card p-3 shadow-card">
        <SelectField
          id="desk-zone"
          label="Zone desk"
          value={zone.id}
          onChange={setDeskZone}
          options={zones.map((z) => ({ value: z.id, label: `${z.name}${z.desk ? '' : ' · summary only'}` }))}
          className="w-64"
        />
        <p className="max-w-[46ch] text-[11.5px] leading-relaxed text-ink-muted">
          Stepping into a zone&rsquo;s own desk. Anything you do here rolls up to the national screens. {NATIONAL.today}.
        </p>
      </div>

      {zone.desk ? (
        <>
          <nav aria-label="Zone desk" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to ? `/app/operations/desk/${t.to}` : '/app/operations/desk'}
                end={t.end}
                className={({ isActive }) =>
                  'shrink-0 rounded-full border px-3 py-1.5 text-[12px] transition-colors ' +
                  (isActive ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-line bg-card text-ink-muted hover:border-line-strong hover:text-ink')
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
          {children}
        </>
      ) : (
        <ZoneSnapshot z={zone} />
      )}
    </div>
  )
}
