import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Banknote, Send, Sprout, Users } from 'lucide-react'
import { DataTable, ModuleHeader, Panel, StatTile, StatusPill } from '../../DashboardKit'
import { NATIONAL, ZONE_STATUS } from '../../../../lib/dashboard/operationsNational'
import { mdReportLines, nationalKpis, nationalQueue, resetOperationsDemo, sendMdReport, useOperations } from '../../../../lib/dashboard/operationsStore'
import { DoneNote, PrimaryButton } from './controls'

const CARD_TONE = {
  default: 'border-emerald-900/10 bg-card',
  warn: 'border-amber-700/25 bg-[#fdf4e7]',
  critical: 'border-critical/25 bg-critical-soft',
}
const STATUS_TONE = { clear: 'positive', flagged: 'warn', below: 'critical' }

/** A "needs attention" row plus a link into the screen that acts on it. */
export function ActionCard({ item }) {
  return (
    <div className={'rounded-xl border p-3.5 ' + CARD_TONE[item.tone]}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={item.tag} tone={item.tone === 'default' ? 'neutral' : item.tone} />
            <p className="text-[12.5px] font-semibold leading-snug text-ink">{item.title}</p>
          </div>
          {item.detail && <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{item.detail}</p>}
        </div>
        <Link
          to={item.to}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-700 px-3 py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-emerald-800"
        >
          {item.cta}
          <ArrowRight className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

/** Session action log — links are absolute so it reads the same from any screen. */
export function ActionLog({ log }) {
  if (!log.length)
    return (
      <p className="text-[12.5px] leading-relaxed text-ink-muted">
        No actions yet. Every decision, dispatch, approval and release you make anywhere in the operations console is listed
        here, newest first. Session only: nothing is written anywhere, and a reload clears it.
      </p>
    )
  return (
    <ol className="max-h-80 divide-y divide-line overflow-y-auto">
      {log.map((entry) => (
        <li key={entry.id} className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-faint">{entry.at}</span>
          <Link to={`/app/operations${entry.to ? '/' + entry.to : ''}`} className="text-[12.5px] leading-snug text-ink hover:text-emerald-700">
            {entry.text}
          </Link>
        </li>
      ))}
    </ol>
  )
}

const ZONE_COLUMNS = [
  { key: 'name', label: 'Zone' },
  { key: 'leaf', label: 'Leaf today', align: 'right', sortAccessor: (z) => z.leafKg / z.planKg },
  { key: 'turnout', label: 'Turnout', align: 'right', sortAccessor: (z) => z.present / z.rostered },
  { key: 'fleet', label: 'Fleet' },
  { key: 'incidents', label: 'Incidents', align: 'right', sortAccessor: (z) => z.incidentsCritical * 10 + z.incidentsOpen },
  { key: 'payroll', label: 'Payroll' },
  { key: 'fire', label: 'Fire' },
  { key: 'status', label: 'Status', sortAccessor: (z) => ['below', 'flagged', 'clear'].indexOf(z.status) },
]

export default function NationalOverviewModule() {
  const s = useOperations()
  const k = nationalKpis(s)
  const queue = nationalQueue(s)

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="National Operations"
        sub={`NTZDC head office · ${NATIONAL.today} · ${k.zones.length} zones · tea, conservation, partnerships, people`}
        prototype
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Green leaf · today" value={(k.leafKg / 1000).toFixed(1)} unit={`t of ${(k.planKg / 1000).toFixed(1)} t plan, all zones`} share={k.leafKg / k.planKg} icon={Sprout} to="tea" />
        <StatTile label="Workers mustered" value={`${Math.round((k.present / k.rostered) * 100)}%`} unit={`${k.present.toLocaleString()} of ${k.rostered.toLocaleString()}`} share={k.present / k.rostered} icon={Users} to="people" />
        <StatTile label="Payroll released" value={`${k.payrollReleased} / ${k.zones.length}`} unit="zones · pay date Tue" tone={k.payrollReleased < k.zones.length ? 'warn' : 'positive'} share={k.payrollReleased / k.zones.length} icon={Banknote} to="people" />
        <StatTile label="Open incidents" value={k.incidentsOpen} tone={k.incidentsCritical ? 'critical' : 'default'} note={`${k.incidentsCritical} critical across zones`} icon={AlertTriangle} to="incidents" />
      </div>

      <Panel title="Zones at a glance" lede="Every zone's operation today. South West Mau is live from its desk; open it to act at block level.">
        <DataTable
          columns={ZONE_COLUMNS}
          rows={k.zones}
          sortable
          csvName="ForestOS-national-operations"
          renderCell={(key, z) => {
            if (key === 'name')
              return (
                <span>
                  <span className="font-semibold">{z.name}</span>
                  {z.desk && (
                    <Link to="desk" className="ml-2 font-mono text-[10px] uppercase tracking-[0.1em] text-emerald-700 hover:text-emerald-800">
                      desk →
                    </Link>
                  )}
                  <span className="block max-w-[26ch] text-[11px] leading-snug text-ink-muted">{z.headline}</span>
                </span>
              )
            if (key === 'leaf') {
              const pct = Math.round((z.leafKg / z.planKg) * 100)
              return (
                <span className={'font-mono tabular-nums ' + (pct < 85 ? 'text-amber-700' : 'text-ink')}>
                  {(z.leafKg / 1000).toFixed(1)} t<span className="block text-[10.5px] text-ink-faint">{pct}% · oldest {z.maxLeafAgeHrs} h</span>
                </span>
              )
            }
            if (key === 'turnout') {
              const pct = Math.round((z.present / z.rostered) * 100)
              return <span className={'font-mono tabular-nums ' + (pct < 80 ? 'text-amber-700' : 'text-ink')}>{pct}%</span>
            }
            if (key === 'fleet')
              return (
                <span className="font-mono text-[12px] tabular-nums">
                  {z.fleet.moving}/{z.fleet.total}
                  {z.fleet.down > 0 && <span className="block text-[10.5px] text-amber-700">{z.fleet.down} down</span>}
                </span>
              )
            if (key === 'incidents')
              return (
                <span className="font-mono tabular-nums">
                  {z.incidentsOpen}
                  {z.incidentsCritical > 0 && <span className="block text-[10.5px] text-critical">{z.incidentsCritical} critical</span>}
                </span>
              )
            if (key === 'payroll') return <StatusPill status={z.payroll.status} tone={z.payroll.status === 'Released' ? 'positive' : 'warn'} />
            if (key === 'fire')
              return (
                <span className="text-[12px]">
                  {z.fire.danger}
                  <span className={'block text-[10.5px] ' + (z.fire.danger === 'High' && !z.fire.watch ? 'text-amber-700' : 'text-ink-faint')}>{z.fire.watch ? 'watch on' : 'no watch'}</span>
                </span>
              )
            if (key === 'status') return <StatusPill status={ZONE_STATUS[z.status]} tone={STATUS_TONE[z.status]} />
            return null
          }}
        />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Panel title="Needs your decision" lede="Only what needs head office. Block-level work stays on each zone's desk.">
          {queue.length ? (
            <div className="space-y-2.5">
              {queue.map((item) => (
                <ActionCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-ink-muted">Nothing waiting on head office.</p>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel
            title="Report to the Managing Director"
            lede="Composed from the figures as they stand now, including your decisions."
            actions={
              s.national.mdReportSentAt ? (
                <DoneNote>Sent {s.national.mdReportSentAt}</DoneNote>
              ) : (
                <PrimaryButton onClick={sendMdReport}>
                  <Send className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                  Send
                </PrimaryButton>
              )
            }
          >
            <ul className="space-y-1.5 rounded-lg border border-line bg-paper/60 p-3.5">
              {mdReportLines(s).map((line) => (
                <li key={line} className="text-[12.5px] leading-relaxed text-ink">
                  {line}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Coming up" lede="National dates the operation has to be ready for.">
          <ol className="divide-y divide-line">
            {NATIONAL.calendar.map((c) => (
              <li key={c.what} className="grid grid-cols-[5.5rem_1fr] gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-faint">{c.when}</span>
                <Link to={c.to} className="group min-w-0">
                  <span className="block text-[12.5px] font-semibold text-ink group-hover:text-emerald-700">{c.what}</span>
                  <span className="block text-[11px] leading-relaxed text-ink-muted">{c.detail}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel
          title="Your decisions this session"
          lede="The record a real backend would append to the audit log."
          actions={
            s.log.length > 0 && (
              <button
                type="button"
                onClick={resetOperationsDemo}
                className="rounded-md border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
              >
                Reset demo
              </button>
            )
          }
        >
          <ActionLog log={s.log} />
        </Panel>
      </div>
    </div>
  )
}
