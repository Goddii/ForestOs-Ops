import { AlertCard, DataTable, ModuleHeader, Panel, StatusPill } from '../../DashboardKit'
import { ADMIN } from '../../../../lib/dashboard/systemAdmin'

const COLUMNS = [
  { key: 'id', label: 'Plot' },
  { key: 'ha', label: 'Hectares', align: 'right' },
  { key: 'centroid', label: 'Centroid' },
  { key: 'canopy2020', label: 'Canopy 2020', align: 'right' },
  { key: 'canopyNow', label: 'Now', align: 'right' },
  { key: 'eudr', label: 'EUDR', align: 'right' },
]

export default function RegistryModule() {
  const { registry } = ADMIN
  return (
    <div className="space-y-5">
      <ModuleHeader title="Registry" sub="Forest → zone → block → plot · the geometry satellites verify against" prototype />

      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-3">
          <Panel title="Hierarchy">
            <div className="space-y-1 font-mono text-[12px] leading-[1.9] text-ink">
              {registry.hierarchy.map((row, i) => (
                <div
                  key={i}
                  style={{ paddingLeft: row.depth * 14 }}
                  className={row.accent ? 'font-bold text-emerald-700' : row.faint ? 'text-ink-faint' : ''}
                >
                  {row.label}
                  {row.meta && (
                    <span
                      className={
                        'ml-2 text-[10.5px] ' + (row.metaTone === 'warn' ? 'text-amber-700' : 'text-ink-faint')
                      }
                    >
                      · {row.meta}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Panel>
          <AlertCard
            tone="positive"
            title="Designed to extend beyond tea."
            detail='A "zone" is any managed buffer around any ecological asset — the hierarchy does not assume the crop.'
          />
        </div>

        <div className="space-y-3">
          <Panel title="Plots in Kiptunga · KIP">
            <DataTable
              columns={COLUMNS}
              rows={registry.plotsInKiptunga}
              renderCell={(key, row) => {
                if (key === 'ha') return row.ha
                if (key === 'canopy2020' || key === 'canopyNow') return `${row[key]}%`
                if (key === 'eudr') return <StatusPill status={row.eudr} />
                return row[key]
              }}
            />
          </Panel>
          <AlertCard
            tone="warn"
            title="Why hectares are not an administrative detail."
            detail="The agronomic ceiling that catches in-bought leaf is computed per hectare. An understated plot area produces false anomalies; an overstated one hides real fraud. Every change to plot geometry is an audit event requiring a survey reference."
          />
        </div>
      </div>
    </div>
  )
}
