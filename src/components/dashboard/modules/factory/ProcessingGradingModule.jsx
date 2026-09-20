import { BulletBar, DataTable, ModuleHeader, Panel, StatusPill } from '../../DashboardKit'
import { FACTORY } from '../../../../lib/dashboard/factoryManager'

const LINE_COLUMNS = [
  { key: 'stage', label: 'Stage' },
  { key: 'throughputKgHr', label: 'Throughput', align: 'right' },
  { key: 'note', label: 'Note' },
  { key: 'status', label: 'Status', align: 'right' },
]

const GRADE_COLUMNS = [
  { key: 'grade', label: 'Grade' },
  { key: 'kg', label: 'Output', align: 'right' },
  { key: 'pct', label: 'Share', align: 'right' },
]

const LINE_STATUS_LABEL = { running: 'Running', flagged: 'Flagged', below: 'Idle' }
const LINE_STATUS_TONE = { running: 'positive', flagged: 'warn', below: 'critical' }

export default function ProcessingGradingModule() {
  const { processing, kpis, month } = FACTORY
  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Processing & Grading"
        sub={`${month} · withering through sorting, and what it came out as`}
        prototype
      />

      <Panel title="Recovery ratio" lede="Made tea as a share of green leaf processed — the single number that summarises the whole line.">
        <BulletBar
          label="Recovery ratio"
          value={kpis.recoveryRatioPct}
          target={kpis.recoveryTargetPct}
          max={30}
          display={`${kpis.recoveryRatioPct}%`}
          targetLabel={`Target ${kpis.recoveryTargetPct}%`}
        />
      </Panel>

      <Panel title="Line status">
        <DataTable
          columns={LINE_COLUMNS}
          rows={processing.lines}
          csvName="ForestOS-factory-lines"
          renderCell={(key, row) => {
            if (key === 'throughputKgHr') return `${row.throughputKgHr.toLocaleString()} kg/h`
            if (key === 'status')
              return <StatusPill status={LINE_STATUS_LABEL[row.status]} tone={LINE_STATUS_TONE[row.status]} />
            return row[key]
          }}
        />
      </Panel>

      <Panel title="Grade output" lede="Today's made tea, split by grade.">
        <DataTable
          columns={GRADE_COLUMNS}
          rows={processing.gradeOutput}
          csvName="ForestOS-factory-grades"
          renderCell={(key, row) => {
            if (key === 'kg') return `${row.kg.toLocaleString()} kg`
            if (key === 'pct') return `${row.pct}%`
            return row[key]
          }}
        />
      </Panel>
    </div>
  )
}
