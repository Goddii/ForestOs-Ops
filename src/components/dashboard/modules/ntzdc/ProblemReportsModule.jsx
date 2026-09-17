import { ModuleHeader, Panel, StatTile, DataTable, StatusPill } from '../../DashboardKit'
import { NTZDC } from '../../../../lib/dashboard/ntzdc'

const SEVERITY_RANK = { Low: 1, Medium: 2, High: 3, Critical: 4 }

const COLUMNS = [
  { key: 'farmerId', label: 'Farmer ID', mono: true, sortAccessor: (r) => r.farmerId },
  { key: 'centre', label: 'Centre', sortAccessor: (r) => r.centre },
  { key: 'type', label: 'Problem Type', sortAccessor: (r) => r.type },
  { key: 'severity', label: 'Severity', sortAccessor: (r) => SEVERITY_RANK[r.severity] ?? 0 },
  { key: 'status', label: 'Status', sortAccessor: (r) => NTZDC.problems.pipeline.indexOf(r.status) },
  { key: 'officer', label: 'Assigned Officer', sortAccessor: (r) => r.officer ?? '' },
]

export default function ProblemReportsModule() {
  const { problems } = NTZDC
  const { reports } = problems

  const open = reports.filter((r) => r.status !== 'Outcome recorded')
  const overdue = reports.filter((r) => r.overdue)

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Problem Reports"
        sub={`Kiptunga Block · ${open.length} open · ${overdue.length} overdue · ${reports.length} logged`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Open reports"
          value={open.length}
          unit={`of ${reports.length} logged`}
          share={open.length / reports.length}
        />
        <StatTile
          label="Avg response time"
          value={`${problems.avgResponseHours}h`}
          unit="report → officer notified"
        />
        <StatTile
          label="Resolved this month"
          value={problems.resolvedThisMonth}
          unit="outcomes recorded"
          tone="positive"
        />
        <StatTile
          label="Overdue"
          value={overdue.length}
          unit="past response window"
          tone="warn"
        />
      </div>

      <Panel
        title="Reported problems"
        lede="Every farmer-raised field problem and where it sits in the response pipeline. Sort by any column."
      >
        <DataTable
          columns={COLUMNS}
          rows={reports}
          sortable
          csvName="ForestOS-problem-reports"
          renderCell={(key, row) => {
            if (key === 'severity') {
              const warn = row.severity === 'High' || row.severity === 'Critical'
              return <StatusPill status={row.severity} tone={warn ? 'warn' : 'neutral'} />
            }
            if (key === 'status') {
              return (
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <StatusPill status={row.status} />
                  {row.overdue && row.status !== 'Outcome recorded' && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-amber-700">
                      overdue
                    </span>
                  )}
                </span>
              )
            }
            if (key === 'officer') return row.officer ?? <span className="text-ink-faint">Unassigned</span>
            return row[key]
          }}
        />
      </Panel>
    </div>
  )
}
