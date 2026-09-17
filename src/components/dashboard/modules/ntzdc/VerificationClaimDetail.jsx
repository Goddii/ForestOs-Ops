import { useState } from 'react'
import { ArrowLeft, Check, Camera, MapPin, Upload, X } from 'lucide-react'
import { Panel, StatusPill, BarMeter, DeltaPill, Sparkline } from '../../DashboardKit'
import { SATELLITE } from '../../../../lib/dashboardData'

const PIPELINE = ['Reported', 'Field verified', 'Evidence attached', 'Satellite cross-check', 'Verified']

const DECISIONS = {
  approve: 'Claim approved — advanced to Verified and queued for the covenant ledger.',
  reject: 'Claim rejected — returned to the collection centre for resubmission.',
  evidence: 'More evidence requested — the reporting centre has been notified.',
}

/** One horizontal pipeline stepper. Rejected claims read as a stopped track. */
function PipelineStepper({ stage }) {
  const rejected = stage === 'Rejected'
  const reached = rejected ? 1 : Math.max(1, PIPELINE.indexOf(stage) + 1)
  return (
    <ol className="flex flex-wrap items-center gap-y-2 font-mono text-[10px] uppercase tracking-[0.1em]">
      {PIPELINE.map((step, i) => {
        const done = i + 1 < reached
        const current = i + 1 === reached && !rejected
        return (
          <li key={step} className="flex items-center">
            <span
              className={
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ' +
                (done
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : current
                    ? 'border-emerald-600 bg-emerald-600/[0.12] text-emerald-700'
                    : 'border-line-strong bg-paper-sunk text-ink-faint')
              }
            >
              {done ? <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" /> : i + 1}
            </span>
            <span
              className={
                'ml-1.5 ' + (done || current ? 'text-ink-muted' : 'text-ink-faint')
              }
              aria-current={current ? 'step' : undefined}
            >
              {step}
            </span>
            {i < PIPELINE.length - 1 && (
              <span className="mx-2 h-px w-6 shrink-0 bg-line-strong" aria-hidden="true" />
            )}
          </li>
        )
      })}
    </ol>
  )
}

function SubmissionRow({ label, value }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">{label}</dt>
      <dd className="mt-1 text-[13px] text-ink">{value}</dd>
    </div>
  )
}

export default function VerificationClaimDetail({ claim, onBack }) {
  const [observations, setObservations] = useState(claim.observations ?? '')
  const [decision, setDecision] = useState(null)

  const delta = (claim.ndvi.current - claim.ndvi.baseline).toFixed(2)
  const ndviUp = claim.ndvi.current >= claim.ndvi.baseline
  const sectorMean = SATELLITE.ndvi.current

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
          Back to queue
        </button>
        <StatusPill status={claim.stage} />
      </div>

      <header>
        <h2 className="font-display text-2xl text-emerald-950 sm:text-3xl">
          {claim.type} · {claim.plotId}
        </h2>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
          Claim {claim.id} · {claim.centre} centre · reported {claim.reportedDate}
        </p>
      </header>

      <Panel title="Pipeline" lede="Where this claim sits between farmer report and verified covenant record.">
        <PipelineStepper stage={claim.stage} />
      </Panel>

      <Panel title="Original submission" lede="As filed by the collection centre on behalf of the farmer.">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <SubmissionRow label="Claim type" value={claim.type} />
          <SubmissionRow label="Plot / block" value={claim.plotId} />
          <SubmissionRow label="Collection centre" value={claim.centre} />
          <SubmissionRow label="Reported date" value={claim.reportedDate} />
          <SubmissionRow label="Reported by" value={claim.reportedBy} />
          <SubmissionRow label="Assigned officer" value={claim.officer ?? 'Unassigned'} />
          <SubmissionRow label="Reported work" value={claim.quantity} />
        </dl>
        <p className="mt-4 max-w-[68ch] border-t border-line pt-4 text-[13px] leading-relaxed text-ink-muted">
          {claim.note}
        </p>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Field officer observations" lede="Recorded on the verification visit.">
          <label htmlFor="obs" className="sr-only">
            Field officer observations
          </label>
          <textarea
            id="obs"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={7}
            placeholder="What was found on the plot, how it matched the claim, and the verification decision…"
            className="w-full resize-y rounded-lg border border-line bg-paper-sunk/50 px-3 py-2.5 text-[13px] leading-relaxed text-ink placeholder:text-ink-faint focus-visible:border-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30"
          />
        </Panel>

        <Panel title="Photo & GPS evidence" lede="Attachments from the field visit.">
          <div className="rounded-lg border border-dashed border-line-strong bg-paper-sunk/40 p-4">
            {claim.attachments.photos > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {Array.from({ length: claim.attachments.photos }).map((_, i) => (
                  <li
                    key={i}
                    className="flex h-16 w-16 items-center justify-center rounded-md border border-line bg-card text-ink-faint"
                  >
                    <Camera className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-muted">No photos attached.</p>
            )}
            <p className="mt-3 flex items-center gap-1.5 font-mono text-[11px] text-ink-muted">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-faint" strokeWidth={2} aria-hidden="true" />
              {claim.attachments.gps ? `${claim.attachments.gps} · ${claim.attachments.photos} photo${claim.attachments.photos === 1 ? '' : 's'}` : 'No GPS track attached'}
            </p>
          </div>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-2 rounded-md border border-line px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <Upload className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
            Add attachment
          </button>
        </Panel>
      </div>

      <Panel
        title="Satellite NDVI cross-check"
        lede="Plot-level cut of the same Sentinel-2 quarterly composite behind the sector's satellite verification."
      >
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-display text-[2rem] leading-none tabular-nums text-ink">
            {claim.ndvi.current.toFixed(2)}
          </p>
          <DeltaPill label={`${ndviUp ? '+' : ''}${delta} vs plot baseline`} dir={ndviUp ? 'up' : 'down'} />
        </div>
        <div className="mt-4 space-y-3">
          <BarMeter label="Plot baseline" value={claim.ndvi.baseline} max={1} display={claim.ndvi.baseline.toFixed(2)} tone="muted" />
          <BarMeter label="Current" value={claim.ndvi.current} max={1} display={claim.ndvi.current.toFixed(2)} tone={ndviUp ? 'emerald' : 'amber'} />
        </div>
        <div className="mt-5">
          <Sparkline values={SATELLITE.ndvi.series} />
          <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
            {SATELLITE.ndvi.quarters.map((q) => (
              <span key={q}>{q}</span>
            ))}
          </div>
        </div>
        <p className="mt-3 text-[12px] text-ink-muted">
          Covenant-area sector mean is {sectorMean} this quarter. A verified planting or restoration claim is expected
          to track at or above its plot baseline within two composites.
        </p>
      </Panel>

      <Panel title="Decision" lede="Approve to advance the claim, or return it with a reason.">
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setDecision('approve')}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
            Approve
          </button>
          <button
            type="button"
            onClick={() => setDecision('evidence')}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[13px] font-semibold text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <Upload className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
            Request more evidence
          </button>
          <button
            type="button"
            onClick={() => setDecision('reject')}
            className="inline-flex items-center gap-2 rounded-full border border-amber-700/40 px-4 py-2 text-[13px] font-semibold text-amber-700 transition-colors hover:bg-amber-500/[0.10]"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
            Reject
          </button>
        </div>
        <p className="mt-3 min-h-[1.25rem] font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint" aria-live="polite">
          {decision ? DECISIONS[decision] : 'Prototype — no record is written.'}
        </p>
      </Panel>
    </div>
  )
}
