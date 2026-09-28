import { Check, ClipboardCheck, Landmark, Wallet, X } from 'lucide-react'
import { BulletBar, ModuleHeader, Panel, StatTile, StatusPill } from '../../DashboardKit'
import { NATIONAL } from '../../../../lib/dashboard/operationsNational'
import { allReferrals, decideReferral, useOperations, zoneName } from '../../../../lib/dashboard/operationsStore'
import { PrimaryButton, SecondaryButton } from './controls'

const kes = (n) => `KES ${n.toLocaleString()}`
const DECISION_TONE = { Pending: 'warn', Approved: 'positive', Declined: 'neutral', 'Sent to MD': 'neutral' }

export default function ApprovalsBudgetModule() {
  const s = useOperations()
  const refs = allReferrals(s)
  const pending = refs.filter((r) => r.status === 'Pending')
  const limit = NATIONAL.approvalLimitKes
  const budget = NATIONAL.budgetByZone
  const spent = budget.reduce((sum, z) => sum + z.spentKes, 0)
  const total = budget.reduce((sum, z) => sum + z.budgetKes, 0)
  const tight = budget.filter((z) => z.spentKes > z.budgetKes * 0.85)

  return (
    <div className="space-y-5">
      <ModuleHeader title="Approvals & Budget" sub={`Spending referred up from the zones · your limit ${kes(limit)} per commitment · above it goes to the Managing Director`} prototype />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Awaiting you" value={pending.length} unit={`KES ${(pending.reduce((sum, r) => sum + r.valueKes, 0) / 1e6).toFixed(2)}M`} tone={pending.length ? 'warn' : 'default'} icon={ClipboardCheck} />
        <StatTile label="Above your limit" value={pending.filter((r) => r.valueKes > limit).length} unit="need the MD" icon={Landmark} />
        <StatTile label="Field opex · September" value={`${Math.round((spent / total) * 100)}%`} unit={`KES ${(spent / 1e6).toFixed(1)}M of ${(total / 1e6).toFixed(1)}M`} share={spent / total} icon={Wallet} />
        <StatTile label="Zones past 85% of budget" value={tight.length} tone={tight.length ? 'warn' : 'default'} note={tight.map((z) => zoneName(z.zone)).join(', ') || undefined} icon={Wallet} />
      </div>

      <Panel title="Referrals from zones" lede="Each zone's ops desk approves up to its own limit and refers anything larger here. Approve within your authority; send the rest to the MD with your recommendation.">
        <ul className="divide-y divide-line">
          {refs.map((r) => {
            const overLimit = r.valueKes > limit
            return (
              <li key={r.id} className="grid gap-2 py-3.5 first:pt-0 last:pb-0 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-ink">{r.item}</p>
                    <StatusPill status={r.status} tone={DECISION_TONE[r.status]} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    <span className="font-mono">{r.id}</span> · {zoneName(r.zone)} · {r.line} · {r.requestedBy}
                    {r.fromDesk && ' · referred from the SW Mau desk'}
                  </p>
                  <p className={'mt-0.5 font-mono text-[12.5px] tabular-nums ' + (overLimit ? 'text-amber-700' : 'text-ink')}>
                    {kes(r.valueKes)}
                    {overLimit && ' — above your limit'}
                  </p>
                </div>
                {r.status === 'Pending' && (
                  <div className="flex flex-wrap gap-1.5 md:justify-end">
                    {overLimit ? (
                      <PrimaryButton onClick={() => decideReferral(r.id, 'Sent to MD')}>
                        <Landmark className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                        Recommend to MD
                      </PrimaryButton>
                    ) : (
                      <PrimaryButton onClick={() => decideReferral(r.id, 'Approved')}>
                        <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                        Approve
                      </PrimaryButton>
                    )}
                    <SecondaryButton onClick={() => decideReferral(r.id, 'Declined')}>
                      <X className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                      Decline
                    </SecondaryButton>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </Panel>

      <Panel title="Field opex by zone · September" lede="Each zone's running costs (transport, inputs, nursery, fire & patrol, maintenance, PPE) against its budget. Worker pay is separate. Amber is past 85% with the month not over.">
        <div className="grid gap-x-8 gap-y-3.5 md:grid-cols-2">
          {budget.map((z) => (
            <BulletBar
              key={z.zone}
              label={zoneName(z.zone)}
              value={z.spentKes}
              target={z.budgetKes}
              max={Math.max(z.budgetKes, z.spentKes) * 1.05}
              display={`KES ${(z.spentKes / 1e6).toFixed(2)}M / ${(z.budgetKes / 1e6).toFixed(2)}M`}
              targetLabel={`Budget ${kes(z.budgetKes)}`}
              behind={z.spentKes > z.budgetKes * 0.85}
            />
          ))}
        </div>
      </Panel>
    </div>
  )
}
