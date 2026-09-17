import { ModuleHeader, Panel, StatusPill } from '../../DashboardKit'
import { ADMIN } from '../../../../lib/dashboard/systemAdmin'

// The nav promises "Integrations" as its own screen; A1's panel is the
// summary, this is the full list with room for the connection details a real
// admin would need (endpoint, last run, volume) once these are real.
export default function IntegrationsModule() {
  return (
    <div className="space-y-5">
      <ModuleHeader title="Integrations" sub="Every external system this console reads from or writes to" prototype />

      <div className="grid gap-3 sm:grid-cols-2">
        {ADMIN.integrations.map((row) => (
          <Panel key={row.id} title={row.name}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] text-ink-muted">{row.detail}</p>
              <StatusPill status={row.status} />
            </div>
          </Panel>
        ))}
      </div>
    </div>
  )
}
