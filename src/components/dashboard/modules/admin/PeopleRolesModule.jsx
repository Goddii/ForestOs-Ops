import { Check } from 'lucide-react'
import { AlertCard, ModuleHeader, Panel, StatusPill } from '../../DashboardKit'
import { ADMIN } from '../../../../lib/dashboard/systemAdmin'

const COLS = ['worker', 'supervisor', 'zone', 'admin']
const COL_LABEL = { worker: 'Wkr', supervisor: 'Sup', zone: 'Zone', admin: 'Admin' }

export default function PeopleRolesModule() {
  const { counts, onboardingQueue, permissions } = ADMIN.people
  return (
    <div className="space-y-5">
      <ModuleHeader
        title="People & roles"
        sub={`${counts.workers.toLocaleString()} workers · ${counts.supervisors} supervisors · ${counts.zoneManagers} zone managers · ${counts.admins} admins`}
        prototype
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          <Panel title={`Onboarding queue · ${onboardingQueue.length} pending`}>
            <ul className="divide-y divide-line">
              {onboardingQueue.map((p) => (
                <li key={p.name} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">{p.name}</p>
                    <p className="text-[11px] text-ink-muted">{p.detail}</p>
                  </div>
                  <StatusPill status={p.tag} tone={p.tagTone} />
                </li>
              ))}
            </ul>
          </Panel>
          <AlertCard
            tone="critical"
            title="Shared handset flagged."
            detail="This number is already registered to RVT-0841. A worker must be reachable on a number they control, or the SMS confirmation that protects their pay protects someone else instead."
          />
        </div>

        <div className="space-y-3">
          <Panel title="Role permissions">
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[420px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className="py-2 pr-4 text-left font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">
                      Capability
                    </th>
                    {COLS.map((c) => (
                      <th
                        key={c}
                        className="py-2 pr-2 text-right font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint"
                      >
                        {COL_LABEL[c]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((row) => (
                    <tr key={row.capability} className="border-b border-line last:border-0">
                      <td className={'py-2.5 pr-4 ' + (row.note ? 'font-semibold text-ink' : 'text-ink')}>
                        {row.capability}
                      </td>
                      {COLS.map((c) => (
                        <td key={c} className="py-2.5 pr-2 text-right">
                          {row[c] ? (
                            <Check className="ml-auto h-3.5 w-3.5 text-emerald-600" strokeWidth={2.5} aria-hidden="true" />
                          ) : (
                            <span className="text-line-strong">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <AlertCard
            tone="positive"
            title="Nobody can move money."
            detail="Payroll is approved and signed off by people, but disbursement is executed by the system straight to each worker's registered number. The cash that used to pass through a supervisor's hands is the leak this closes."
          />
        </div>
      </div>
    </div>
  )
}
