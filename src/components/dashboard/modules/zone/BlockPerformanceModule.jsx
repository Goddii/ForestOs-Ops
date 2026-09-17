import { AlertCard, DataTable, ModuleHeader, StatusPill } from '../../DashboardKit'
import { ZONE } from '../../../../lib/dashboard/zoneManager'

const COLUMNS = [
  { key: 'name', label: 'Block' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'workers', label: 'Workers', align: 'right' },
  { key: 'greenLeafKg', label: 'Green leaf', align: 'right' },
  { key: 'yieldPerHa', label: 'Yield / ha', align: 'right' },
  { key: 'costPerKg', label: 'Cost / kg', align: 'right' },
  { key: 'ticketLotPct', label: 'Ticket ↔ lot', align: 'right' },
  { key: 'claimsVerifiedPct', label: 'Claims verified', align: 'right' },
  { key: 'status', label: 'Status', align: 'right' },
]

const STATUS_LABEL = { clear: 'Clear', flagged: 'Flagged', below: 'Below' }

const flagged = ZONE.blocks.find((b) => b.status === 'flagged')

export default function BlockPerformanceModule() {
  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Block performance"
        sub={`${ZONE.month} · compared on what the records actually support`}
        prototype
      />

      <DataTable
        columns={COLUMNS}
        rows={ZONE.blocks}
        sortable
        csvName="ForestOS-block-performance"
        renderCell={(key, row) => {
          if (key === 'workers') return row.workers
          if (key === 'greenLeafKg') return `${row.greenLeafKg.toLocaleString()} kg`
          if (key === 'yieldPerHa') return row.yieldPerHa.toLocaleString()
          if (key === 'costPerKg') return row.costPerKg.toFixed(1)
          if (key === 'ticketLotPct') return `${row.ticketLotPct}%`
          if (key === 'claimsVerifiedPct') return `${row.claimsVerifiedPct}%`
          if (key === 'status') return <StatusPill status={STATUS_LABEL[row.status]} />
          return row[key]
        }}
      />

      {flagged && (
        <AlertCard
          tone="warn"
          title={`Why ${flagged.name} is flagged.`}
          detail={`Yield per hectare is 59% above the zone mean and the ticket-to-lot reconciliation has drifted to ${flagged.ticketLotPct}%. Either the plot register understates its area, or leaf from outside the buffer is entering through this block. Both are traceability failures and both must be closed before the zone can be signed off.`}
        />
      )}
    </div>
  )
}
