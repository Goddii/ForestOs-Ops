import { useMemo } from 'react'
import { Check, RotateCcw, Sprout } from 'lucide-react'
import { DataTable, Panel, PrototypeTag, Sparkline, StatusPill } from '../../DashboardKit'
import { useConservation } from '../../../../lib/conservation/context'
import { POLICY } from '../../../../lib/conservation/policy'
import {
  CHECKPOINT_LABEL,
  VERDICT_LABEL,
  VERDICT_TONE,
  formatCount,
  formatDay,
  formatEat,
  formatPct,
} from '../../../../lib/conservation/labels'
import { survivalDetail } from '../../../../lib/conservation/selectors'
import BackLink from './BackLink'
import Callout from './Callout'
import Confirmation from './Confirmation'
import DemoClock from './DemoClock'
import IntervalBar from './IntervalBar'
import Marker from './Marker'
import { useActionRunner, useFocusOn } from './hooks'
import { assigneeTitle } from './taskRoles'
import { BTN_PRIMARY, BTN_SECONDARY, CAPTION, ERROR } from './ui'

const S = POLICY.survival

const TREND_COLUMNS = [
  { key: 'checkpoint', label: 'Count' },
  { key: 'alive', label: 'Alive / sample', align: 'right', mono: true },
  { key: 'pct', label: 'Survival', align: 'right', mono: true },
]

function Fact({ label, children }) {
  return (
    <div>
      <dt className={CAPTION}>{label}</dt>
      <dd className="mt-1 text-[13px] text-ink">{children}</dd>
    </div>
  )
}

/** The count in plain words, including what a sample this size can and cannot rule out. */
function plainLine(detail) {
  const { check, survival } = detail
  const head = `${check.alive} of ${check.sampleSize} alive is ${formatPct(survival.p)}.`
  const threshold = formatPct(S.threshold)
  const range = `${formatPct(survival.lower)} and ${formatPct(survival.upper)}`
  if (survival.verdict === 'fail') {
    return `${head} A sample this size cannot rule out anything between ${range}, so it is decisively below ${threshold}.`
  }
  if (survival.verdict === 'borderline') {
    return `${head} A sample this size cannot rule out anything between ${range}, so the planting may still be at or above ${threshold}. A recount is needed before ordering replanting.`
  }
  return survival.lower >= S.threshold
    ? `${head} Even the low end of the range, ${formatPct(survival.lower)}, is at or above ${threshold}.`
    : `${head} It passes, but a sample this size cannot rule out a survival as low as ${formatPct(survival.lower)}, so the cautious count credits fewer trees.`
}

export default function ConservationSurvivalDetail({ checkId, onBack }) {
  const ctx = useConservation()
  const detail = useMemo(() => survivalDetail(ctx, checkId), [ctx, checkId])
  const headingRef = useFocusOn(checkId)
  const { notice, errors, run } = useActionRunner(ctx.act)

  if (!detail) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <BackLink onClick={onBack}>Back to survival</BackLink>
          <DemoClock />
        </div>
        <Callout tone="warn" role="alert" title="Count not found">
          <span ref={headingRef} tabIndex={-1}>
            {checkId} is not in your region, or it has not arrived yet.
          </span>
        </Callout>
      </div>
    )
  }

  const { check, claim, survival } = detail
  const reviewed = check.review
  const canOrder = detail.isLatest && survival.verdict === 'fail'
  const orderOpen = detail.openOrder
  const fail = survival.verdict === 'fail'
  const borderline = survival.verdict === 'borderline'

  const accept = () =>
    run('accept', { type: 'REVIEW_CHECK', payload: { checkId: check.checkId, review: 'accepted' } }, () => `${check.checkId} accepted.`)
  const recount = () =>
    run(
      'recount',
      { type: 'REVIEW_CHECK', payload: { checkId: check.checkId, review: 'recount_requested' } },
      (result) => `Recount requested for ${claim.plotId}; task ${result.taskId} created.`,
    )
  const order = () =>
    run(
      'order',
      {
        type: 'CREATE_TASK',
        payload: {
          type: 'replanting',
          linkedRef: check.checkId,
          assigneeRole: assigneeTitle(ctx.ref, 'block_supervisor', claim.zoneId),
        },
      },
      (result) => `Replanting order ${result.id} issued for ${formatCount(result.quantity)} trees on ${claim.plotId}.`,
    )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink onClick={onBack}>Back to survival</BackLink>
        <StatusPill status={VERDICT_LABEL[survival.verdict]} tone={VERDICT_TONE[survival.verdict]} />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <header>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="flex flex-wrap items-center gap-x-3 font-sans text-2xl font-bold tracking-tight text-emerald-950 focus:outline-none sm:text-3xl"
          >
            <Sprout className="h-6 w-6 shrink-0 text-ink-muted" strokeWidth={2} aria-hidden="true" />
            {check.checkId}
          </h2>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
            {claim.plotId} · {detail.zoneName} · {CHECKPOINT_LABEL[check.checkpointDays]} count
          </p>
        </header>
        <DemoClock />
      </div>

      <Panel title="This count" actions={<PrototypeTag label="Proposed policy" />}>
        <div className="flex flex-wrap items-center gap-4">
          <IntervalBar p={survival.p} lower={survival.lower} upper={survival.upper} verdict={survival.verdict} className="w-56" />
          <p className="font-sans text-[1.9rem] font-bold leading-none tabular-nums text-ink">{formatPct(survival.p)}</p>
          <p className="font-mono text-[12px] text-ink-muted">
            range {Math.round(survival.lower * 100)}–{formatPct(survival.upper)} · threshold {formatPct(S.threshold)}
          </p>
        </div>
        <p className="mt-3 max-w-[68ch] text-[13.5px] leading-relaxed text-ink">{plainLine(detail)}</p>
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-4 sm:grid-cols-3">
          <Fact label="Planting">{claim.claimId}</Fact>
          <Fact label="Planted">
            {formatDay(detail.plantedOn, true)} · {formatCount(detail.trees)} trees
          </Fact>
          <Fact label="Main species">{detail.species.join(', ') || '—'}</Fact>
          <Fact label="Counted">{formatEat(check.checkedAt, 'datetime')} EAT</Fact>
          <Fact label="Sample">
            {check.alive} alive of {check.sampleSize}
          </Fact>
          <Fact label="Submitted by">
            {check.submittedBy}
            <Marker>internal only</Marker>
          </Fact>
        </dl>
      </Panel>

      <Panel title="Earlier counts of this planting" lede="A trend needs at least two counts.">
        {detail.trend.length >= 2 ? (
          <div className="grid gap-4 sm:grid-cols-2 sm:items-center">
            <div>
              <Sparkline values={detail.trend.map((t) => t.pct * 100)} tone={fail ? '#7c5322' : '#059669'} fill={fail ? 'rgba(124,83,34,0.14)' : 'rgba(5,150,105,0.16)'} />
            </div>
            <DataTable
              columns={TREND_COLUMNS}
              rows={detail.trend.map((t) => ({
                id: t.checkId,
                checkpoint: `${CHECKPOINT_LABEL[t.checkpointDays]} (${t.checkId})`,
                alive: `${t.alive} / ${t.sampleSize}`,
                pct: formatPct(t.pct),
              }))}
              renderCell={(key, row) => row[key]}
            />
          </div>
        ) : (
          <p className="text-[13px] text-ink-muted">This is the first count for this planting.</p>
        )}
      </Panel>

      <Panel
        title="What to do with this count"
        lede="Accept it, ask for a recount, or, if the latest count fails, order replanting."
      >
        {borderline && (
          <Callout tone="warn" title="A recount is needed before ordering replanting" className="mb-4">
            The count is below {formatPct(S.threshold)} but the range still includes it. Ask for a recount; order replanting only if it confirms the failure.
          </Callout>
        )}
        {fail && !detail.isLatest && (
          <Callout tone="info" className="mb-4">
            This is not the planting’s latest count, so it cannot be ordered against.
          </Callout>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {!borderline && (
            <button type="button" className={BTN_SECONDARY} disabled={Boolean(reviewed)} onClick={accept}>
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              {reviewed === 'accepted' ? 'Count accepted' : 'Accept count'}
            </button>
          )}
          <button type="button" className={BTN_SECONDARY} disabled={Boolean(reviewed)} onClick={recount}>
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
            {reviewed === 'recount_requested' ? 'Recount requested' : 'Request recount'}
          </button>
          {fail && (
            <button type="button" className={BTN_PRIMARY} disabled={!canOrder || Boolean(orderOpen)} onClick={order}>
              <Sprout className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              {orderOpen ? `Order ${orderOpen.taskId} is open` : 'Issue replanting order'}
            </button>
          )}
        </div>
        {fail && (
          <p className="mt-3 text-[12.5px] text-ink-muted">
            About {formatCount(detail.replantingQuantity)} trees have died. A replanting order is for that many, linked to this count.
          </p>
        )}
        {(errors.accept || errors.recount || errors.order) && (
          <p role="alert" className={ERROR}>
            {errors.accept || errors.recount || errors.order}
          </p>
        )}
        <Confirmation message={notice} className="mt-3" />
      </Panel>
    </div>
  )
}
