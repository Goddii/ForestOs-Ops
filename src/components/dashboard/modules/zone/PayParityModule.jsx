import { AlertCard, BarMeter, DataTable, ModuleHeader, Panel, StatTile } from '../../DashboardKit'
import { ZONE } from '../../../../lib/dashboard/zoneManager'

const COLUMNS = [
  { key: 'block', label: 'Block' },
  { key: 'basePerKg', label: 'Base /kg', align: 'right' },
  { key: 'premiumPerKg', label: 'Premium', align: 'right' },
  { key: 'settleDays', label: 'Settle', align: 'right' },
  { key: 'vsZonePct', label: 'vs zone', align: 'right' },
]

export default function PayParityModule() {
  const { pay } = ZONE
  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Pay & parity"
        sub={`Built from ${pay.recordCount.toLocaleString()} individual payment records · ${ZONE.month}`}
        prototype
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Median weekly pay" value={pay.medianWeeklyPay.toLocaleString()} unit="KES" note={`+${pay.medianWeeklyPayDeltaPct}% vs Aug`} />
        <StatTile label="Conservation premium" value={pay.conservationPremiumPerKg} unit="/kg" note={`of KES ${pay.totalPerKg} total`} />
        <StatTile label="Settled ≤ 7 days" value={`${pay.settledWithin7dPct}%`} />
        <StatTile label="Women" value={`${pay.womenPct}%`} tone="warn" note={`${pay.womenPayGapPct}% pay gap`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <Panel title="Belt comparison · the documented gap">
            <div className="space-y-4">
              {pay.beltComparison.map((belt) => (
                <BarMeter
                  key={belt.belt}
                  label={`${belt.belt} · ${belt.subtitle}`}
                  value={belt.widthPct}
                  max={100}
                  display={`KES ${belt.ratePerKg.toFixed(2)} /kg`}
                  tone={belt.tone === 'warn' ? 'amber' : 'emerald'}
                />
              ))}
              {pay.beltComparison.map((belt) => (
                <p key={belt.belt + '-note'} className="text-[10.5px] text-ink-faint">
                  {belt.belt}: {belt.note}
                </p>
              ))}
            </div>
          </Panel>
          <AlertCard
            tone="positive"
            title="What changed."
            detail="The belt gap was previously an anecdote — as much as half, for the same crop, with no data to interrogate. These bars are built from individual payment records, so the gap can now be decomposed by block, task, settlement lag and gender, and attributed to something other than “geography”."
          />
        </div>

        <div className="space-y-3">
          <Panel title="Rate by block · same task, same crop">
            <DataTable
              columns={COLUMNS}
              rows={pay.rateByBlock}
              renderCell={(key, row) => {
                if (key === 'basePerKg' || key === 'premiumPerKg') return row[key].toFixed(2)
                if (key === 'settleDays') return `${row.settleDays} d`
                if (key === 'vsZonePct') return `${row.vsZonePct > 0 ? '+' : ''}${row.vsZonePct.toFixed(1)}%`
                return row[key]
              }}
            />
          </Panel>
          <AlertCard
            tone="critical"
            title="Tinet is the outlier."
            detail="Lower base rate, lower premium and an 11-day settlement lag. None of that is geography — it is three decisions, each of which now has a name and a date attached."
          />
        </div>
      </div>
    </div>
  )
}
