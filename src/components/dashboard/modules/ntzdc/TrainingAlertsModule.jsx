import { ModuleHeader, Panel, StatTile, BarMeter, DataTable, StatusPill } from '../../DashboardKit'
import { NTZDC } from '../../../../lib/dashboard/ntzdc'

const COLUMNS = [
  { key: 'topic', label: 'Session', sortAccessor: (r) => r.topic },
  { key: 'centre', label: 'Centre', sortAccessor: (r) => r.centre },
  { key: 'date', label: 'Date', mono: true, sortAccessor: (r) => r.date },
  { key: 'enrolled', label: 'Enrolled', align: 'right', mono: true, sortAccessor: (r) => r.enrolled / r.capacity },
  { key: 'status', label: '', align: 'right', sortAccessor: (r) => r.status },
]

export default function TrainingAlertsModule() {
  const { training } = NTZDC
  const upcoming = training.sessions.filter((s) => s.status === 'upcoming' || s.status === 'full')
  const avgFill = Math.round(
    (training.sessions.reduce((s, x) => s + x.enrolled / x.capacity, 0) / training.sessions.length) * 100,
  )

  return (
    <div className="space-y-5">
      <ModuleHeader title="Farmer Training Alerts" sub={`${upcoming.length} sessions scheduled · ${training.trainedYtd.toLocaleString()} farmers trained YTD`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Upcoming" value={upcoming.length} tone="positive" />
        <StatTile label="Trained YTD" value={`${(training.trainedYtd / 1000).toFixed(1)}k`} unit="farmers" />
        <StatTile label="Avg fill rate" value={`${avgFill}%`} unit="of capacity" tone="positive" />
        <StatTile label="Full / waitlisted" value={training.sessions.filter((s) => s.status === 'full').length} tone="warn" />
      </div>

      <Panel title="Schedule" lede="Upcoming and recent training sessions across the zone.">
        <DataTable
          columns={COLUMNS}
          rows={training.sessions}
          sortable
          csvName="ForestOS-training-schedule"
          renderCell={(key, row) => {
            if (key === 'topic')
              return (
                <span>
                  <span className="block font-medium text-ink">{row.topic}</span>
                  <span className="block font-mono text-[11px] text-ink-faint">{row.id}</span>
                </span>
              )
            if (key === 'enrolled') return `${row.enrolled}/${row.capacity}`
            if (key === 'status') return <StatusPill status={row.status} />
            return row[key]
          }}
        />
      </Panel>

      <Panel title="Enrolment by session" lede="Seats filled against capacity.">
        <div className="space-y-3">
          {training.sessions.map((s) => (
            <BarMeter
              key={s.id}
              label={`${s.topic} · ${s.centre}`}
              value={s.enrolled}
              max={s.capacity}
              display={`${s.enrolled}/${s.capacity}`}
              tone={s.enrolled >= s.capacity ? 'amber' : 'emerald'}
            />
          ))}
        </div>
      </Panel>
    </div>
  )
}
