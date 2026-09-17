import { ModuleHeader, Panel, StatTile, BarMeter, DataTable } from '../../DashboardKit'
import { NTZDC_MANAGEMENT, managementRollup } from '../../../../lib/dashboard/ntzdcManagement'

const ZONE_COLUMNS = [
  { key: 'name', label: 'Zone', sortAccessor: (r) => r.name },
  { key: 'blocks', label: 'Blocks', align: 'right', mono: true, sortAccessor: (r) => r.blocks },
  { key: 'farmers', label: 'Farmers / workers', align: 'right', mono: true, sortAccessor: (r) => r.farmers },
  { key: 'intakeSeasonT', label: 'Intake (t)', align: 'right', mono: true, sortAccessor: (r) => r.intakeSeasonT },
  { key: 'rejectionRatePct', label: 'Reject rate', align: 'right', mono: true, sortAccessor: (r) => r.rejectionRatePct },
]

export default function LandscapeOverviewModule() {
  const { zones, season, priorSeason } = NTZDC_MANAGEMENT
  const r = managementRollup()
  const maxIntake = Math.max(...zones.map((z) => z.intakeSeasonT))
  const intakeUp = r.intakeChangePct >= 0

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Landscape Overview"
        sub={`All zones · ${season} season · ${r.zoneCount} zones · ${r.blocks} blocks · ${r.farmers.toLocaleString()} farmers & workers`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Operating zones" value={r.zoneCount} unit="water-tower landscapes" />
        <StatTile label="Blocks" value={r.blocks} unit="across all zones" />
        <StatTile label="Farmers & workers" value={r.farmers.toLocaleString()} unit="registered" />
        <StatTile
          label={`Intake · ${season}`}
          value={`${r.intakeSeasonT.toLocaleString()} t`}
          unit={`vs ${r.intakePriorT.toLocaleString()} t in ${priorSeason}`}
          tone="positive"
          delta={{ label: `${intakeUp ? '+' : ''}${r.intakeChangePct.toFixed(1)}% vs last season`, dir: intakeUp ? 'up' : 'down' }}
        />
        <StatTile
          label="Aggregate reject rate"
          value={`${r.rejectionRatePct.toFixed(1)}%`}
          unit="intake-weighted across zones"
          tone={r.rejectionRatePct >= 5 ? 'warn' : 'positive'}
        />
        <StatTile
          label="Buffer maintained"
          value={`${r.bufferHa.toLocaleString()} ha`}
          unit="under active maintenance"
          tone="positive"
        />
      </div>

      <Panel title="Season intake by zone" lede={`Green-leaf tonnage received this season against last. Zone totals sum to ${r.intakeSeasonT.toLocaleString()} t.`}>
        <div className="space-y-3">
          {[...zones]
            .sort((a, b) => b.intakeSeasonT - a.intakeSeasonT)
            .map((z) => (
              <BarMeter
                key={z.id}
                label={z.name}
                value={z.intakeSeasonT}
                max={maxIntake}
                display={`${z.intakeSeasonT.toLocaleString()} t`}
                tone={z.intakeSeasonT >= z.intakePriorT ? 'emerald' : 'amber'}
              />
            ))}
        </div>
      </Panel>

      <Panel title="Zones at a glance" lede="Every operating zone, its footprint, and its gate-quality reject rate. Sort by any column.">
        <DataTable
          columns={ZONE_COLUMNS}
          rows={zones}
          sortable
          csvName="ForestOS-ntzdc-zones"
          renderCell={(key, row) => {
            if (key === 'farmers') return row.farmers.toLocaleString()
            if (key === 'intakeSeasonT') return `${row.intakeSeasonT.toLocaleString()} t`
            if (key === 'rejectionRatePct') return `${row.rejectionRatePct.toFixed(1)}%`
            return row[key]
          }}
        />
      </Panel>
    </div>
  )
}
