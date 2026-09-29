import { useMemo } from 'react'
import { Check, FileCheck2, Hourglass } from 'lucide-react'
import { BarMeter, DataTable, DeltaPill, Panel, PrototypeTag, StatusPill } from '../../DashboardKit'
import { useConservation } from '../../../../lib/conservation/context'
import { UNIT_HEAD_ID } from '../../../../lib/conservation/policy'
import {
  CLAIM_STATUS_LABEL,
  CLAIM_STATUS_TONE,
  CLAIM_TYPE_LABEL,
  COPY,
  EVIDENCE_KIND_LABEL,
  formatCoord,
  formatCount,
  formatDay,
  formatEat,
  formatHa,
  formatPct,
  quantitySummary,
} from '../../../../lib/conservation/labels'
import { POLICY } from '../../../../lib/conservation/policy'
import { claimDetail } from '../../../../lib/conservation/selectors'
import BackLink from './BackLink'
import Callout from './Callout'
import ClaimDecisionPanel from './ClaimDecisionPanel'
import ClaimStepper from './ClaimStepper'
import DemoClock from './DemoClock'
import Marker from './Marker'
import { useActionRunner, useFocusOn } from './hooks'
import { BTN_PRIMARY, BTN_SECONDARY, CAPTION, ERROR } from './ui'

const RESULT_LABEL = { pass: 'Pass', flag: 'Flag', not_applicable: 'Not applicable' }
const RESULT_TONE = { pass: 'positive', flag: 'warn', not_applicable: 'neutral' }

const CHECK_COLUMNS = [
  { key: 'rule', label: 'Rule' },
  { key: 'result', label: 'Result' },
  { key: 'detail', label: 'What was found' },
  { key: 'policy', label: 'Proposed policy value' },
]

const SPECIES_COLUMNS = [
  { key: 'name', label: 'Species' },
  { key: 'trees', label: 'Trees', align: 'right', mono: true },
]

function Fact({ label, children }) {
  return (
    <div>
      <dt className={CAPTION}>{label}</dt>
      <dd className="mt-1 text-[13px] text-ink">{children}</dd>
    </div>
  )
}

const days = (n) => `${n} working ${n === 1 ? 'day' : 'days'}`

/** The chip beside the status: working days against the target, or a paused clock. */
function SlaChip({ detail }) {
  if (detail.status === 'verified' || detail.status === 'rejected') return null
  if (detail.status === 'evidence_requested') return <StatusPill status="Clock paused" tone="neutral" />
  return (
    <StatusPill
      status={`${days(detail.workingDays)} · target ${detail.slaTarget}`}
      tone={detail.overdue ? 'critical' : 'neutral'}
    />
  )
}

function SatellitePanel({ detail, sentinel }) {
  const { claim } = detail
  const applies = POLICY.claims.satelliteApplies.includes(claim.type)
  const sat = claim.satellite
  const change = sat ? Math.round((sat.ndviAfter - sat.ndviBefore) * 100) / 100 : 0
  const contradicts = detail.flags.includes('satellite_contradicts')
  return (
    <Panel
      title="Satellite cross-check"
      lede={`Sentinel-2 passes about every ${sentinel.cycleDays} days. ${COPY.ndviGloss}.`}
    >
      {!applies && (
        <p className="text-[13px] text-ink-muted">
          Not applicable: structures and cleared areas are not reliably visible at 10 m.
        </p>
      )}
      {applies && !sat && (
        <p className="text-[13px] text-ink-muted">
          No satellite result yet. {detail.waiting ? `${detail.waiting}.` : ''}
        </p>
      )}
      {applies && sat && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-sans text-[1.9rem] font-bold leading-none tabular-nums text-ink">{sat.ndviAfter.toFixed(2)}</p>
            <DeltaPill label={`${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(2)} vs before`} dir={change >= 0 ? 'up' : 'down'} />
          </div>
          <div className="space-y-3">
            <BarMeter label="Before" value={sat.ndviBefore} max={1} display={sat.ndviBefore.toFixed(2)} tone="muted" />
            <BarMeter label="After" value={sat.ndviAfter} max={1} display={sat.ndviAfter.toFixed(2)} tone={contradicts ? 'amber' : 'emerald'} />
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint">
            Pass {formatDay(sat.passDate, true)} · cloud {formatPct(sat.cloudFraction)}
          </p>
        </div>
      )}
      {applies && (
        <p className="mt-4 max-w-[68ch] text-[12.5px] leading-relaxed text-ink-muted">
          {claim.type === 'tree_planting'
            ? 'Satellite can contradict a planting but not confirm it: at 10 m, saplings do not register for months. A clean result means '
            : 'Satellite can contradict this work but not confirm it: at 10 m, small changes do not register for months. A clean result means '}
          <em>no contradiction</em>, not <em>verified</em>.
        </p>
      )}
    </Panel>
  )
}

/**
 * Countersign card (approval waiting for a second signature), the record of a
 * countersign once given, and the open evidence request. The confirmation for
 * these buttons is the announced result line in the decision panel, which is always there.
 */
function StateCards({ detail, runner }) {
  const { ref, now } = useConservation()
  const { errors, run } = runner
  const { claim, status } = detail
  const request = claim.evidenceRequest
  const signed = claim.decision?.countersign
  return (
    <>
      {signed && (
        <Callout tone="positive" title={`Countersigned by ${signed.by}`}>
          Countersigned on {formatEat(signed.at, 'datetime')} EAT after being approved on{' '}
          {formatEat(claim.decision.decidedAt, 'datetime')} EAT. The claim counts as verified.
        </Callout>
      )}
      {status === 'awaiting_countersign' && (
        <Panel title="Countersign" className="border-amber-700/25">
          <p className="text-[13px] font-semibold text-ink">Needs the {ref.roles.unitHead}.</p>
          <p className="mt-1 max-w-[64ch] text-[12.5px] leading-relaxed text-ink-muted">
            Approved by you on {formatEat(claim.decision.decidedAt, 'datetime')}. It counts as verified only after a second
            signature, because it carries a flag or covers {POLICY.claims.countersignAreaHa} ha or more. The approver cannot
            countersign their own approval.
          </p>
          <div className="mt-3">
            <button
              type="button"
              className={BTN_PRIMARY}
              onClick={() =>
                run(
                  'countersign',
                  { type: 'COUNTERSIGN', payload: { claimId: claim.claimId, by: UNIT_HEAD_ID } },
                  () => `${claim.claimId} countersigned and verified.`,
                )
              }
            >
              <FileCheck2 className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              Record countersign (prototype: acts as unit head)
            </button>
            {errors.countersign && (
              <p role="alert" className={ERROR}>
                {errors.countersign}
              </p>
            )}
          </div>
        </Panel>
      )}
      {request && (
        <Callout tone="warn" title={`Evidence requested · ${EVIDENCE_KIND_LABEL[request.kind]}`}>
          <p>
            Asked on {formatEat(request.requestedAt, 'date')}: “{request.note}” The decision clock is paused while a request is
            open and restarts from zero when the evidence is received.
          </p>
          <div className="mt-3">
            <button
              type="button"
              className={BTN_SECONDARY}
              onClick={() =>
                run(
                  'received',
                  { type: 'EVIDENCE_RECEIVED', payload: { claimId: claim.claimId } },
                  () => `Evidence received on ${claim.claimId}; the clock restarts at ${formatEat(now, 'datetime')}.`,
                )
              }
            >
              <Hourglass className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              Mark evidence received (prototype)
            </button>
            {errors.received && (
              <p role="alert" className={ERROR}>
                {errors.received}
              </p>
            )}
          </div>
        </Callout>
      )}
    </>
  )
}

export default function ConservationClaimDetail({ claimId, onBack }) {
  const ctx = useConservation()
  const detail = useMemo(() => claimDetail(ctx, claimId), [ctx, claimId])
  const headingRef = useFocusOn(claimId)
  const runner = useActionRunner(ctx.act)

  if (!detail) {
    return (
      <div className="space-y-5">
        <BackLink onClick={onBack}>Back to queue</BackLink>
        <Callout tone="warn" role="alert" title="Claim not found">
          <span ref={headingRef} tabIndex={-1}>
            {claimId} is not in your region, or it has not arrived yet.
          </span>
        </Callout>
      </div>
    )
  }

  const { claim, status, zone, plot, species, mix } = detail
  const { work, evidence } = claim
  const gps = evidence.gps
  const checkRows = detail.checks.map((row) => ({ id: row.flag, ...row }))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink onClick={onBack}>Back to queue</BackLink>
        <div className="flex flex-wrap items-center gap-2">
          <SlaChip detail={detail} />
          <StatusPill status={CLAIM_STATUS_LABEL[status]} tone={CLAIM_STATUS_TONE[status]} />
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <header>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-sans text-2xl font-bold tracking-tight text-emerald-950 focus:outline-none sm:text-3xl"
          >
            {claim.claimId} · {CLAIM_TYPE_LABEL[claim.type]}
          </h2>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
            Plot {claim.plotId}
            {claim.legacyPlotId ? ` (legacy ${claim.legacyPlotId})` : ''} · {zone?.name ?? claim.zoneId} · reported{' '}
            {formatEat(claim.reportedAt, 'date')}
          </p>
          {claim.legacyRef && (
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
              Legacy ref {claim.legacyRef} (former Block Operations queue)
            </p>
          )}
        </header>
        <DemoClock />
      </div>

      <Panel title="Pipeline" lede="Where this claim sits between the report from the field and a verified record.">
        <ClaimStepper claim={claim} status={status} />
        {detail.waiting && <p className="mt-3 text-[13px] font-medium text-ink">{detail.waiting}</p>}
      </Panel>

      <Panel title="Submission" lede="As reported from the mobile app or USSD.">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Fact label="Work date">{formatDay(work.workDate, true)}</Fact>
          <Fact label="Reported work">{quantitySummary(claim)}</Fact>
          <Fact label="Planting spacing">
            {claim.type === 'tree_planting' ? (work.spacingM ? `${work.spacingM} m` : 'Not reported') : 'Not applicable'}
          </Fact>
          <Fact label="Reported by">
            {claim.reportedBy}
            <Marker title="Worker identifiers stay inside this console. They are never exported, indexed or sent.">internal only</Marker>
          </Fact>
          <Fact label="GPS point">
            {gps ? `${formatCoord(gps.lat)}, ${formatCoord(gps.lon)} ± ${gps.accuracyM} m` : 'No GPS point'}
          </Fact>
          <Fact label="Photos">
            {evidence.photos.length} {evidence.photos.length === 1 ? 'photo' : 'photos'}
          </Fact>
          <Fact label="Plot area">{plot ? `${formatHa(plot.hectares)} ha` : '—'}</Fact>
          <Fact label="Planting mix">{mix ? mix.name : 'Not applicable'}</Fact>
        </dl>
        <div className="mt-4 border-t border-line pt-4">
          <p className="max-w-[68ch] text-[13px] leading-relaxed text-ink-muted">{work.description}</p>
        </div>
        {species.length > 0 && (
          <div className="mt-4 border-t border-line pt-4">
            <p className={CAPTION}>
              Species, split from the {mix.name.toLowerCase()} by share
              <Marker title="Species are indicative. The approved list must come from KEFRI and KFS.">illustrative</Marker>
            </p>
            <div className="mt-2 max-w-md">
              <DataTable
                columns={SPECIES_COLUMNS}
                rows={species.map((s) => ({ id: s.name, name: s.name, trees: s.trees }))}
                renderCell={(key, row) => (key === 'trees' ? formatCount(row.trees) : row[key])}
              />
            </div>
          </div>
        )}
      </Panel>

      <Panel
        title="Evidence checks"
        lede="One row per rule. A flag does not reject the claim; it needs a written justification to approve and a second signature."
        actions={<PrototypeTag label="Proposed policy" />}
      >
        <DataTable
          columns={CHECK_COLUMNS}
          rows={checkRows}
          renderCell={(key, row) =>
            key === 'result' ? <StatusPill status={RESULT_LABEL[row.result]} tone={RESULT_TONE[row.result]} /> : row[key]
          }
        />
      </Panel>

      <SatellitePanel detail={detail} sentinel={ctx.ref.sentinel} />

      <ClaimDecisionPanel detail={detail} runner={runner} />

      <StateCards detail={detail} runner={runner} />

      <div className="flex items-center gap-2 text-[11px] text-ink-faint">
        <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
        Flags, status and countersign need are worked out from the evidence each time; none is stored.
      </div>
    </div>
  )
}
