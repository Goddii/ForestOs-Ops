import { useMemo, useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { Panel, StatTile, StatusPill } from '../../DashboardKit'
import { useConservation } from '../../../../lib/conservation/context'
import { INCIDENT_TYPES } from '../../../../lib/conservation/policy'
import {
  INCIDENT_STATUS_LABEL,
  INCIDENT_STATUS_TONE,
  INCIDENT_TYPE_LABEL,
  SEVERITY_LABEL,
  SEVERITY_TONE,
  formatCount,
  formatDuration,
  formatEat,
} from '../../../../lib/conservation/labels'
import { incidentKpis, incidentRows, segmentsInScope } from '../../../../lib/conservation/selectors'
import AgreementPill from './AgreementPill'
import ConservationIncidentDetail from './ConservationIncidentDetail'
import Confirmation from './Confirmation'
import DeadlineChip from './DeadlineChip'
import LogIncidentForm from './LogIncidentForm'
import ScreenHeader from './ScreenHeader'
import Segmented from './Segmented'
import { useActionRunner, useSelectedParam } from './hooks'
import { INCIDENT_ICON } from './incidentIcons'
import { BTN_SECONDARY } from './ui'

export default function ConservationIncidentsModule() {
  const ctx = useConservation()
  const [incidentId, openIncident, closeIncident] = useSelectedParam('incident')
  const [show, setShow] = useState('open')
  const [type, setType] = useState('all')
  const [logging, setLogging] = useState(false)
  const runner = useActionRunner(ctx.act)

  const rows = useMemo(() => incidentRows(ctx), [ctx])
  const kpis = useMemo(() => incidentKpis(ctx), [ctx])
  const segments = useMemo(() => segmentsInScope(ctx), [ctx])
  const zoneName = (zoneId) => ctx.ref.zones.find((z) => z.zoneId === zoneId)?.name ?? zoneId

  const visible = useMemo(
    () =>
      rows.filter(
        (r) => (show === 'all' || (show === 'open' ? r.open : !r.open)) && (type === 'all' || r.incident.type === type),
      ),
    [rows, show, type],
  )

  if (incidentId) return <ConservationIncidentDetail key={incidentId} incidentId={incidentId} onBack={closeIncident} />

  return (
    <div className="space-y-5">
      <ScreenHeader title="Incidents & KFS Liaison" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Open" value={kpis.open} unit="Not yet closed" />
        <StatTile
          label="Awaiting KFS acknowledgement"
          value={kpis.awaitingAck}
          tone={kpis.awaitingAck > 0 ? 'warn' : 'default'}
          note={kpis.oldestWaitMin === null ? 'None waiting' : `Oldest wait ${formatDuration(kpis.oldestWaitMin)}`}
        />
        <StatTile
          label="Escalation overdue"
          value={kpis.escalationOverdue}
          tone={kpis.escalationOverdue > 0 ? 'critical' : 'default'}
          unit="First message or reply past target"
        />
        <StatTile
          label="Median minutes to first KFS message"
          value={kpis.medianFirstMessageMin === null ? '—' : formatCount(kpis.medianFirstMessageMin)}
          unit={`Last 30 days, ${kpis.firstMessageSample} incidents`}
        />
        <StatTile label="Closed this month" value={kpis.closedThisMonth} tone="positive" unit="Resolved or false alarm" />
      </div>

      <Panel
        title="Incidents"
        lede="Fire, illegal logging, charcoal, grazing, encroachment and beacon or fence damage. Several reports of one event merge into one incident."
        actions={
          <button type="button" className={BTN_SECONDARY} aria-expanded={logging} onClick={() => setLogging((on) => !on)}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
            Log incident
          </button>
        }
      >
        {logging && (
          <LogIncidentForm segments={segments} zoneName={zoneName} runner={runner} onClose={() => setLogging(false)} />
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Segmented
            label="Show"
            value={show}
            onChange={setShow}
            options={[
              { value: 'open', label: 'Open', count: rows.filter((r) => r.open).length },
              { value: 'closed', label: 'Closed', count: rows.filter((r) => !r.open).length },
              { value: 'all', label: 'All', count: rows.length },
            ]}
          />
          <Segmented
            label="Type"
            value={type}
            onChange={setType}
            options={[{ value: 'all', label: 'All' }, ...INCIDENT_TYPES.map((t) => ({ value: t, label: INCIDENT_TYPE_LABEL[t] }))]}
          />
        </div>
        <Confirmation message={runner.notice} className="mt-3" />

        {visible.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-muted">No incidents match these filters.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {visible.map((row) => {
              const { incident } = row
              const Icon = INCIDENT_ICON[incident.type]
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => openIncident(row.id)}
                    className="group flex w-full flex-wrap items-center gap-x-4 gap-y-2 py-3 text-left transition-colors hover:bg-paper-sunk/50"
                  >
                    <div className="min-w-0 flex-1 basis-64">
                      <p className="flex items-center gap-2 text-[13px] text-ink">
                        <Icon className="h-4 w-4 shrink-0 text-ink-muted" strokeWidth={2} aria-hidden="true" />
                        {INCIDENT_TYPE_LABEL[incident.type]}
                        <span className="font-mono text-[11px] text-ink-faint">{row.id}</span>
                      </p>
                      <p className="mt-0.5 text-[12px] text-ink-muted">
                        {row.segmentName} · {row.zoneName}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                        First reported {formatEat(incident.firstReportedAt, 'datetime')} EAT · {incident.reports.length}{' '}
                        {incident.reports.length === 1 ? 'report' : 'reports'} merged
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <DeadlineChip deadline={row.deadline} />
                      <AgreementPill value={row.satellite} />
                      <StatusPill status={SEVERITY_LABEL[row.severity]} tone={SEVERITY_TONE[row.severity]} />
                      <StatusPill status={INCIDENT_STATUS_LABEL[incident.status]} tone={INCIDENT_STATUS_TONE[incident.status]} />
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-line-strong transition-colors group-hover:text-ink-muted"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </div>
  )
}
