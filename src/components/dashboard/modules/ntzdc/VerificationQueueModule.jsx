import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { ModuleHeader, Panel, StatTile, StatusPill } from '../../DashboardKit'
import { NTZDC } from '../../../../lib/dashboard/ntzdc'
import VerificationClaimDetail from './VerificationClaimDetail'

const OPEN_STAGES = ['Reported', 'Field verified', 'Evidence attached', 'Satellite cross-check']

export default function VerificationQueueModule() {
  const { verification } = NTZDC
  const { claims } = verification
  const [activeId, setActiveId] = useState(null)

  const pending = claims.filter((c) => OPEN_STAGES.includes(c.stage))
  const flaggedRejected = claims.filter((c) => c.stage === 'Rejected' || c.flagged)

  const activeClaim = claims.find((c) => c.id === activeId)
  if (activeClaim) {
    return <VerificationClaimDetail claim={activeClaim} onBack={() => setActiveId(null)} />
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Verification Queue"
        sub={`Kiptunga Block · ${pending.length} awaiting review · ${claims.length} claims in the pipeline`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Pending review"
          value={pending.length}
          unit={`of ${claims.length} claims`}
          share={pending.length / claims.length}
        />
        <StatTile
          label="Verified this week"
          value={verification.verifiedThisWeek}
          unit="claims cleared"
          tone="positive"
        />
        <StatTile
          label="Avg time to verify"
          value={`${verification.avgHoursToVerify}h`}
          unit="reported → verified"
        />
        <StatTile
          label="Flagged / rejected"
          value={flaggedRejected.length}
          unit="need follow-up"
          tone="warn"
        />
      </div>

      <Panel
        title="Conservation claims"
        lede="Every open and recently closed claim. Select one to review the submission, evidence and satellite cross-check."
      >
        <ul className="divide-y divide-line">
          {claims.map((claim) => (
            <li key={claim.id}>
              <button
                type="button"
                onClick={() => setActiveId(claim.id)}
                className="group flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 py-3 text-left transition-colors first:pt-0 last:pb-0 hover:bg-paper-sunk/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-ink">
                    {claim.type}
                    {claim.flagged && (
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-700">
                        flagged
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                    {claim.id} · {claim.plotId} · reported {claim.reportedDate}
                  </p>
                </div>
                <StatusPill status={claim.stage} />
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-line-strong transition-colors group-hover:text-ink-muted"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
