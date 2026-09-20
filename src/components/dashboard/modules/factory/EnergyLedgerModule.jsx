import { DataTable, ModuleHeader, Panel } from '../../DashboardKit'
import { FACTORY } from '../../../../lib/dashboard/factoryManager'

const COLUMNS = [
  { key: 'periodStart', label: 'Period' },
  { key: 'readingType', label: 'Reading type' },
  { key: 'quantity', label: 'Quantity', align: 'right' },
  { key: 'costKes', label: 'Cost', align: 'right' },
  { key: 'sourceChannel', label: 'Source' },
]

function formatPeriod(isoDate) {
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

// Every metered reading behind the Power & Energy screen's mix and cost
// figures — the same reading-type vocabulary as SolGrid's energy ledger
// (grid_electricity | diesel | fuelwood | solar_generation, plus the
// matched production record) with a per-row source channel, so a total on
// the dashboard can be traced back to what was actually recorded, when, and
// how it reached the system.
export default function EnergyLedgerModule() {
  const { ledger, month } = FACTORY
  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Energy Ledger"
        sub={`${month} and prior · every metered reading behind the energy figures, for audit`}
        prototype
      />

      <Panel
        title="Readings on file"
        lede="One row per metered period and source — grid, diesel, fuelwood, solar generation, and the matched production record."
      >
        <DataTable
          columns={COLUMNS}
          rows={ledger.entries}
          sortable
          csvName="ForestOS-factory-energy-ledger"
          renderCell={(key, row) => {
            if (key === 'periodStart') return formatPeriod(row.periodStart)
            if (key === 'quantity') return `${row.quantity.toLocaleString()} ${row.unit}`
            if (key === 'costKes') return row.costKes !== null ? `KES ${row.costKes.toLocaleString()}` : '—'
            return row[key]
          }}
        />
      </Panel>
    </div>
  )
}
