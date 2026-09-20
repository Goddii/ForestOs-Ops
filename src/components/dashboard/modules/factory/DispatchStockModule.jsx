import { DataTable, ModuleHeader, Panel, StatTile, StatusPill } from '../../DashboardKit'
import { FACTORY } from '../../../../lib/dashboard/factoryManager'

const STOCK_COLUMNS = [
  { key: 'grade', label: 'Grade' },
  { key: 'kg', label: 'Warehouse stock', align: 'right' },
]

const LOAD_COLUMNS = [
  { key: 'destination', label: 'Destination' },
  { key: 'grade', label: 'Grade' },
  { key: 'kg', label: 'Quantity', align: 'right' },
  { key: 'status', label: 'Status', align: 'right' },
]

export default function DispatchStockModule() {
  const { dispatch, month } = FACTORY
  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Dispatch & Stock"
        sub={`${month} · warehouse holding and outbound loads`}
        prototype
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Warehouse stock on hand" value={(dispatch.warehouseStockKg / 1000).toFixed(1)} unit="t" />
        <StatTile label="Loads pending" value={dispatch.pendingLoads.length} />
      </div>

      {/* Stacked full-width, not side-by-side — "Pending loads" has a long
          destination column that a half-width panel would clip (see
          BlockPerformanceModule/IntakeWeighbridgeModule for the same
          full-width-table convention elsewhere in this console). */}
      <Panel title="Stock by grade">
        <DataTable
          columns={STOCK_COLUMNS}
          rows={dispatch.stockByGrade}
          csvName="ForestOS-factory-stock"
          renderCell={(key, row) => (key === 'kg' ? `${row.kg.toLocaleString()} kg` : row[key])}
        />
      </Panel>

      <Panel title="Pending loads">
        <DataTable
          columns={LOAD_COLUMNS}
          rows={dispatch.pendingLoads}
          csvName="ForestOS-factory-dispatch"
          renderCell={(key, row) => {
            if (key === 'kg') return `${row.kg.toLocaleString()} kg`
            if (key === 'status') return <StatusPill status={row.status} tone={row.status === 'Loading' ? 'positive' : 'neutral'} />
            return row[key]
          }}
        />
      </Panel>
    </div>
  )
}
