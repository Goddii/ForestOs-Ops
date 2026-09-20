import { DataTable, ModuleHeader, StatTile, StatusPill } from '../../DashboardKit'
import { FACTORY } from '../../../../lib/dashboard/factoryManager'

const COLUMNS = [
  { key: 'route', label: 'Route' },
  { key: 'block', label: 'Block' },
  { key: 'tickets', label: 'Tickets', align: 'right' },
  { key: 'kg', label: 'Green leaf', align: 'right' },
  { key: 'avgMoisturePct', label: 'Avg moisture', align: 'right' },
  { key: 'status', label: 'Status', align: 'right' },
]

const STATUS_LABEL = { clear: 'Clear', flagged: 'Flagged' }

export default function IntakeWeighbridgeModule() {
  const { intake, month } = FACTORY
  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Intake & Weighbridge"
        sub={`${month} · green leaf received today, by collection route`}
        prototype
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Green leaf received · today" value={(intake.todayTotalKg / 1000).toFixed(1)} unit="t" />
        <StatTile label="Weighbridge tickets" value={intake.ticketCount} />
        <StatTile label="Average moisture" value={`${intake.avgMoisturePct}%`} />
      </div>

      <DataTable
        columns={COLUMNS}
        rows={intake.routes}
        sortable
        csvName="ForestOS-factory-intake"
        renderCell={(key, row) => {
          if (key === 'kg') return `${row.kg.toLocaleString()} kg`
          if (key === 'avgMoisturePct') return `${row.avgMoisturePct}%`
          if (key === 'status') return <StatusPill status={STATUS_LABEL[row.status]} />
          return row[key]
        }}
      />
    </div>
  )
}
