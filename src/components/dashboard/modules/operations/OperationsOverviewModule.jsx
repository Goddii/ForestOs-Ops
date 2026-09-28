import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Clock, Send, Sprout, Users } from 'lucide-react'
import { DataTable, ModuleHeader, Panel, StatTile, StatusPill } from '../../DashboardKit'
import { OPERATIONS } from '../../../../lib/dashboard/operationsManager'
import { dailyReportLines, needsAction, opsKpis, resetOperationsDemo, sendDailyReport, useOperations } from '../../../../lib/dashboard/operationsStore'
import { DoneNote, PrimaryButton } from './controls'
import { ActionLog } from './NationalOverviewModule'

const CARD_TONE = {
  default: 'border-emerald-900/10 bg-card',
  warn: 'border-amber-700/25 bg-[#fdf4e7]',
  critical: 'border-critical/25 bg-critical-soft',
}

/** AlertCard's "needs attention" row, plus a link into the screen that acts on it. */
function ActionCard({ item }) {
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

const BOARD_COLUMNS = [
  { key: 'name', label: 'Block' },
  { key: 'muster', label: 'Muster', align: 'right' },
  { key: 'leaf', label: 'Leaf today', align: 'right' },
  { key: 'pickup', label: 'Pickup' },
  { key: 'payroll', label: 'Week 36 pay' },
]

function boardRows(s) {
  return s.muster.map((m) => {
    const centre = s.centres.find((c) => c.block === m.block)
    const pay = s.payrollBlocks.find((b) => b.block === m.block)
    return { id: m.block, m, centre, pay }
  })
}

export default function OperationsOverviewModule() {
  const s = useOperations()
  const kpis = opsKpis(s)
  const queue = needsAction(s)
  const { leafAge } = OPERATIONS
  const ageTone = kpis.maxLeafAgeHrs >= leafAge.warnHrs ? 'critical' : kpis.maxLeafAgeHrs >= leafAge.warnHrs - 1 ? 'warn' : 'default'

  return (
    <div className="space-y-5">
      <ModuleHeader
        title={`${OPERATIONS.name} · Zone Desk`}
        sub={`${OPERATIONS.code} · ${OPERATIONS.today} · ${s.muster.length} blocks · leaf to ${OPERATIONS.factory}`}
        prototype
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Leaf collected · today"
          value={(kpis.collectedKg / 1000).toFixed(2)}
          unit={`t of ${(kpis.planKg / 1000).toFixed(1)} t plan`}
          share={kpis.collectedKg / kpis.planKg}
          icon={Sprout}
          to="logistics"
        />
        <StatTile
          label="Oldest leaf not at factory"
          value={`${kpis.maxLeafAgeHrs} h`}
          tone={ageTone}
          note={`${(leafAge.limitHrs - kpis.maxLeafAgeHrs).toFixed(1)} h to the ${leafAge.limitHrs} h limit`}
          icon={Clock}
          to="logistics"
        />
        <StatTile
          label="Muster turnout"
          value={`${kpis.turnoutPct}%`}
          unit={`${kpis.present.toLocaleString()} of ${kpis.rostered.toLocaleString()} rostered`}
          share={kpis.present / kpis.rostered}
          icon={Users}
          to="teams"
        />
        <StatTile
          label="Open incidents"
          value={kpis.openIncidents}
          tone={kpis.criticalIncidents ? 'critical' : 'default'}
          note={kpis.criticalIncidents ? `${kpis.criticalIncidents} critical` : 'none critical'}
          icon={AlertTriangle}
          to="incidents"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Panel
          title="Needs action"
          lede="Worst first. Each item opens the screen where you act on it — acting there clears it here."
        >
          {queue.length ? (
            <div className="space-y-2.5">
              {queue.map((item) => (
                <ActionCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-ink-muted">Nothing waiting on you. Everything open is assigned.</p>
          )}
        </Panel>

        <Panel
          title="Your actions this session"
          lede="Everything done from the operations console this session, national and desk — the record a real backend would append to the audit log."
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

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Panel
          title="Daily report to the Zone Manager"
          lede="Composed from today's figures as they stand now, including whatever you've acted on. Send it at close of day."
          actions={
            s.reportSentAt ? (
              <DoneNote>Sent {s.reportSentAt} · David Kemei</DoneNote>
            ) : (
              <PrimaryButton onClick={sendDailyReport}>
                <Send className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                Send report
              </PrimaryButton>
            )
          }
        >
          <ul className="space-y-1.5 rounded-lg border border-line bg-paper/60 p-3.5">
            {dailyReportLines(s).map((line) => (
              <li key={line} className="text-[12.5px] leading-relaxed text-ink">
                {line}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Coming up" lede="Dates the ops desk has to be ready for.">
          <ol className="divide-y divide-line">
            {OPERATIONS.calendar.map((c) => (
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
      </div>

      <Panel title="Block readiness" lede="One row per block, covering everything today's run depends on.">
        <DataTable
          columns={BOARD_COLUMNS}
          rows={boardRows(s)}
          renderCell={(key, { m, centre, pay }) => {
            if (key === 'name')
              return (
                <span>
                  <span className="font-semibold">{m.name}</span>
                  <span className="block text-[11px] text-ink-muted">{m.supervisor}</span>
                </span>
              )
            if (key === 'muster') {
              const pct = Math.round((m.present / m.rostered) * 100)
              return (
                <span className={'font-mono tabular-nums ' + (pct < 75 ? 'text-amber-700' : 'text-ink')}>
                  {m.musterClosed ? `${pct}%` : 'open'}
                  {m.borrowed ? <span className="block text-[10.5px] text-ink-muted">incl. {m.borrowed} borrowed</span> : null}
                  {m.lent ? <span className="block text-[10.5px] text-ink-muted">{m.lent} lent out</span> : null}
                  {!m.syncOk && <span className="block text-[10.5px] text-amber-700">device offline</span>}
                </span>
              )
            }
            if (key === 'leaf')
              return (
                <span className="font-mono tabular-nums">
                  {centre.collectedKg.toLocaleString()}
                  <span className="text-ink-faint"> / {centre.planKg.toLocaleString()} kg</span>
                </span>
              )
            if (key === 'pickup') {
              if (centre.awaitingKg > 0 && !centre.assignedLorry) return <StatusPill status="Leaf waiting" tone="warn" />
              if (centre.assignedLorry) return <StatusPill status={`${centre.assignedLorry} en route`} tone="neutral" />
              if (centre.collectedKg === 0) return <StatusPill status="Not started" tone="neutral" />
              return <StatusPill status="Collected" tone="positive" />
            }
            if (key === 'payroll') {
              if (pay.releasedAt) return <StatusPill status="Released" tone="positive" />
              return pay.approved ? <StatusPill status="Approved" tone="positive" /> : <StatusPill status="Not approved" tone="warn" />
            }
            return null
          }}
        />
      </Panel>
    </div>
  )
}
