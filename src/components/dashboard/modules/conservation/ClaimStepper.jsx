import { Check, X } from 'lucide-react'
import { CLAIM_STAGE_STEPS } from '../../../../lib/conservation/labels'
import { POLICY } from '../../../../lib/conservation/policy'

/**
 * The claim's pipeline as a horizontal stepper. Types the satellite cannot see
 * skip the satellite step. A rejected claim reads as a stopped track; an
 * approval waiting for its second signature stops short of Verified.
 */
export default function ClaimStepper({ claim, status }) {
  const steps = CLAIM_STAGE_STEPS.filter(
    (step) => step.stage !== 'satellite_checked' || POLICY.claims.satelliteApplies.includes(claim.type),
  )
  const last = steps.length - 1
  const rejected = status === 'rejected'
  // Index of the step the claim is on; every step before it is done.
  let current
  if (status === 'verified') current = last + 1
  else if (status === 'awaiting_countersign') current = last
  else current = Math.max(0, steps.findIndex((step) => step.stage === claim.stage))

  return (
    <ol
      aria-label="Claim pipeline"
      className="flex flex-wrap items-center gap-y-2 font-mono text-[10px] uppercase tracking-[0.1em]"
    >
      {steps.map((step, i) => {
        const done = !rejected && i < current
        const here = !rejected && i === current
        const hint =
          here && step.stage === 'verified' && status === 'awaiting_countersign'
            ? ' · awaiting countersign'
            : here && status === 'evidence_requested'
              ? ' · evidence requested'
              : ''
        return (
          <li key={step.stage} className="flex items-center">
            <span
              className={
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ' +
                (done
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : here
                    ? 'border-emerald-600 bg-emerald-600/[0.12] text-emerald-700'
                    : 'border-line-strong bg-paper-sunk text-ink-faint')
              }
              aria-hidden="true"
            >
              {done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className={'ml-1.5 ' + (done || here ? 'text-ink-muted' : 'text-ink-faint')} aria-current={here ? 'step' : undefined}>
              {step.label}
              {hint}
              <span className="sr-only">{done ? ' (done)' : here ? ' (current)' : ' (not reached)'}</span>
            </span>
            {i < last && <span className="mx-2 h-px w-6 shrink-0 bg-line-strong" aria-hidden="true" />}
          </li>
        )
      })}
      {rejected && (
        <li className="ml-2 flex items-center gap-1.5 text-amber-700">
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-amber-700/50 bg-amber-500/[0.12]" aria-hidden="true">
            <X className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
          Rejected
        </li>
      )}
    </ol>
  )
}
