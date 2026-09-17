import { ModuleHeader, Panel, StatTile, BarMeter, Sparkline } from '../../DashboardKit'
import { NTZDC_MANAGEMENT, managementRollup } from '../../../../lib/dashboard/ntzdcManagement'

const INTEGRITY_FLOOR = 88

export default function BufferConservationRollupModule() {
  const { zones, ndviQuarters } = NTZDC_MANAGEMENT
  const r = managementRollup()

  const ndviNow = r.ndviTrend[r.ndviTrend.length - 1]
  const ndviStart = r.ndviTrend[0]
  const ndviDelta = (ndviNow - ndviStart).toFixed(2)
  const maxPatrols = Math.max(...zones.map((z) => z.patrolsThisWeek))

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Buffer & Conservation Rollup"
        sub={`All zones · ${r.bufferHa.toLocaleString()} ha maintained · ${r.patrolsThisWeek} patrols this week · ${zones.length} zones`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Boundary integrity"
          value={`${r.boundaryIntegrityPct.toFixed(0)}%`}
          unit="intake-weighted across zones"
          tone={r.boundaryIntegrityPct >= INTEGRITY_FLOOR ? 'positive' : 'warn'}
        />
        <StatTile label="Patrols this week" value={r.patrolsThisWeek} unit="all zones combined" tone="positive" />
        <StatTile label="Buffer maintained" value={`${(r.bufferHa / 1000).toFixed(1)}k ha`} unit={`${r.bufferHa.toLocaleString()} ha total`} tone="positive" />
        <StatTile
          label="NDVI health index"
          value={ndviNow.toFixed(2)}
          unit="zone mean, this quarter"
          tone="positive"
          delta={{ label: `+${ndviDelta} since ${ndviQuarters[0]}`, dir: 'up' }}
          trend={r.ndviTrend}
        />
      </div>

      <Panel title="Boundary integrity by zone" lede="Fence, canopy and signage condition along each zone’s covenant line.">
        <div className="space-y-3">
          {[...zones]
            .sort((a, b) => a.boundaryIntegrityPct - b.boundaryIntegrityPct)
            .map((z) => (
              <BarMeter
                key={z.id}
                label={z.name}
                value={z.boundaryIntegrityPct}
                max={100}
                display={`${z.boundaryIntegrityPct}%`}
                tone={z.boundaryIntegrityPct < INTEGRITY_FLOOR ? 'amber' : 'emerald'}
              />
            ))}
        </div>
      </Panel>

      <Panel title="Patrol activity by zone" lede="Boundary patrols logged this week. Cherangani and South West Mau carry the longest covenant lines.">
        <div className="space-y-3">
          {[...zones]
            .sort((a, b) => b.patrolsThisWeek - a.patrolsThisWeek)
            .map((z) => (
              <BarMeter
                key={z.id}
                label={z.name}
                value={z.patrolsThisWeek}
                max={maxPatrols}
                display={`${z.patrolsThisWeek}`}
              />
            ))}
        </div>
      </Panel>

      <Panel
        title="NDVI recovery trend — all zones"
        lede="Quarterly NDVI mean across every covenant area, equal-weighted by zone. Same Sentinel-2 composite the ESG Satellite Recovery module reads."
      >
        <Sparkline values={r.ndviTrend} />
        <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
          {ndviQuarters.map((q) => (
            <span key={q}>{q}</span>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-ink-muted">
          Every zone is trending up, but the spread between the strongest (Aberdare Range) and weakest
          (Cherangani Hills) covenant areas has held roughly constant — the same zones that lag on pay
          and training coverage.
        </p>
      </Panel>
    </div>
  )
}
