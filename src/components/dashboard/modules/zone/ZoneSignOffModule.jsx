import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { ModuleHeader, Panel, StatusPill } from '../../DashboardKit'
import { ZONE } from '../../../../lib/dashboard/zoneManager'

const ROWS = (s) => [
  { label: 'Work tickets', note: `across ${s.blocks} blocks · ${s.workers.toLocaleString()} workers`, value: s.tickets.toLocaleString() },
  { label: 'Day lots reconciled', note: 'all within ±0.5% tolerance', value: s.dayLotsReconciled, ok: true },
  { label: 'Conservation claims verified', note: 'field + satellite cross-check', value: s.claimsVerified, ok: true },
  { label: 'Payments settled', note: 'direct to worker M-Pesa', value: s.paymentsSettled.toLocaleString(), ok: true },
]

export default function ZoneSignOffModule() {
  const { signoff } = ZONE
  const [signed, setSigned] = useState(false)

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Period sign-off"
        sub={`${signoff.ref} · ${signoff.period}`}
        actions={<StatusPill status={signed ? 'Signed' : signoff.status} tone={signed ? 'positive' : undefined} />}
        prototype
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <Panel title="What you are attesting to">
            <ul className="divide-y divide-line">
              {ROWS(signoff).map((row) => (
                <li key={row.label} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{row.label}</p>
                    <p className="text-[11px] text-ink-muted">{row.note}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-[13px] font-semibold tabular-nums text-ink">{row.value}</span>
                    {row.ok && <CheckCircle2 className="h-4 w-4 text-emerald-600" strokeWidth={2} aria-hidden="true" />}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Open exceptions · must be resolved or noted" className="border-amber-700/25">
            <div className="space-y-2.5">
              {signoff.openExceptions.map((line, i) => (
                <p key={i} className="text-[11.5px] leading-relaxed text-ink">
                  {line}
                </p>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-emerald-950 p-[18px] shadow-card">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-400/80">Attestation</p>
            <p className="mt-2.5 font-display text-[17px] leading-[1.4] text-bone">
              &ldquo;{signoff.attestation}&rdquo;
            </p>
            <dl className="mt-3.5 space-y-1.5 border-t border-emerald-900 pt-3 text-[11.5px] text-emerald-100/80">
              <div className="flex justify-between">
                <dt>Signed by</dt>
                <dd className="font-mono text-bone">
                  {signoff.signer.name} · {signoff.signer.id}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Role</dt>
                <dd className="font-mono text-bone">{signoff.signer.role}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Record hash</dt>
                <dd className="font-mono text-bone">{signoff.signer.recordHash}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setSigned(true)}
              disabled={signed}
              className="mt-4 w-full rounded-[10px] bg-amber-400 py-3 text-[13px] font-semibold text-forest-950 transition-colors hover:bg-amber-500 disabled:cursor-default disabled:opacity-60"
            >
              {signed ? 'Period signed & released' : 'Sign & release period'}
            </button>
          </div>

          <div className="rounded-xl border border-[#c3dcda] bg-[#dfeceb] p-4">
            <p className="text-[11.5px] leading-relaxed text-[#3d6b67]">
              <b>Why a human signs at all.</b> Automated data alone is what carbon-credit projects got
              caught with. Every assurance regime that holds up rests on a named person who can be
              held responsible. Nothing leaves this system as “verified” without this signature and the
              exceptions above travelling with it.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
