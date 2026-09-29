import { useMemo } from 'react'
import { DataTable, Panel, PrototypeTag, StatTile, StatusPill } from '../../DashboardKit'
import { useConservation } from '../../../../lib/conservation/context'
import { POLICY } from '../../../../lib/conservation/policy'
import {
  CHECKPOINT_LABEL,
  COUNT_STATE_LABEL,
  COUNT_STATE_TONE,
  VERDICT_LABEL,
  VERDICT_TONE,
  formatCount,
  formatDay,
  formatPct,
} from '../../../../lib/conservation/labels'
import { eatDay } from '../../../../lib/conservation/rules'
import {
  countsDue,
  openCountRequest,
  survivalKpis,
  survivalRows,
  survivalSummary,
} from '../../../../lib/conservation/selectors'
import ConservationSurvivalDetail from './ConservationSurvivalDetail'
import Confirmation from './Confirmation'
import IntervalBar from './IntervalBar'
import Marker from './Marker'
import ScreenHeader from './ScreenHeader'
import SortableFrame from './SortableFrame'
import { useActionRunner, useSelectedParam } from './hooks'
import { assigneeTitle } from './taskRoles'
import { BTN_SMALL, CAPTION, ERROR } from './ui'

const S = POLICY.survival

const COUNT_COLUMNS = [
  { key: 'cohort', label: 'Cohort' },
  { key: 'checkpoint', label: 'Checkpoint' },
  { key: 'dueOn', label: 'Due' },
  { key: 'state', label: 'State' },
  { key: 'daysLate', label: 'Days overdue', align: 'right', mono: true },
  { key: 'action', label: 'Action' },
]

const CHECK_COLUMNS = [
  { key: 'id', label: 'Count' },
  { key: 'cohort', label: 'Plot · zone' },
  { key: 'species', label: 'Main species' },
  { key: 'checkpoint', label: 'Checkpoint' },
  { key: 'planted', label: 'Planted' },
  { key: 'alive', label: 'Alive / sample', align: 'right', mono: true },
  { key: 'survival', label: 'Survival, with range' },
  { key: 'verdict', label: 'Verdict' },
  { key: 'action', label: 'Action' },
]

export default function ConservationSurvivalModule() {
  const ctx = useConservation()
  const [checkId, openCheck, closeCheck] = useSelectedParam('check')
  const { notice, errors, run } = useActionRunner(ctx.act)

  const kpis = useMemo(() => survivalKpis(ctx), [ctx])
  const summary = useMemo(() => survivalSummary(ctx), [ctx])
  const due = useMemo(() => countsDue(ctx), [ctx])
  const checks = useMemo(() => survivalRows(ctx), [ctx])

  if (checkId) return <ConservationSurvivalDetail key={checkId} checkId={checkId} onBack={closeCheck} />

  const today = eatDay(ctx.now)
  const soon = (entry) => entry.state !== 'upcoming' || eatDay(entry.dueOn) <= today + S.dueSoonDays
  const near = due.filter(soon)
  const later = due.filter((entry) => !soon(entry))

  const request = (entry) =>
    run(
      entry.id,
      {
        type: 'CREATE_TASK',
        payload: {
          type: 'count_request',
          zoneId: entry.claim.zoneId,
          plotId: entry.plotId,
          linkedRef: entry.id,
          assigneeRole: assigneeTitle(ctx.ref, 'block_supervisor', entry.claim.zoneId),
          quantity: S.sampleSize,
          note: `${CHECKPOINT_LABEL[entry.checkpointDays]} survival count for ${entry.plotId}: a sample of ${S.sampleSize} trees.`,
        },
      },
      (result) => `Count requested for ${entry.plotId}; task ${result.id} created.`,
    )

  const countRows = (entries) =>
    entries.map((entry) => ({
      id: entry.id,
      cohort: `${entry.plotId} · ${entry.zoneName}`,
      entry,
      checkpoint: CHECKPOINT_LABEL[entry.checkpointDays],
      dueOn: entry.dueOn,
      state: entry.state,
      daysLate: entry.state === 'upcoming' ? null : entry.daysPast,
    }))

  const renderCount = (key, row) => {
    const { entry } = row
    switch (key) {
      case 'cohort':
        return (
          <>
            {row.cohort}
            <span className="ml-2 font-mono text-[11px] text-ink-faint">{entry.id}</span>
          </>
        )
      case 'dueOn':
        return formatDay(entry.dueOn, true)
      case 'state':
        return <StatusPill status={COUNT_STATE_LABEL[entry.state]} tone={COUNT_STATE_TONE[entry.state]} />
      case 'daysLate':
        return entry.state === 'upcoming' ? (
          <span className="text-ink-faint">in {-entry.daysPast} {-entry.daysPast === 1 ? 'day' : 'days'}</span>
        ) : (
          entry.daysPast
        )
      case 'action': {
        const open = openCountRequest(ctx, entry.id)
        return (
          <>
            <button type="button" className={BTN_SMALL} disabled={Boolean(open)} onClick={() => request(entry)}>
              {open ? `Requested · ${open.taskId}` : 'Request count'}
            </button>
            {errors[entry.id] && (
              <p role="alert" className={ERROR}>
                {errors[entry.id]}
              </p>
            )}
          </>
        )
      }
      default:
        return row[key]
    }
  }

  const checkTable = checks.map((r) => ({
    id: r.id,
    cohort: `${r.plotId} · ${r.zoneName}`,
    species: r.species.join(', ') || '—',
    checkpoint: CHECKPOINT_LABEL[r.check.checkpointDays],
    planted: `${formatDay(r.plantedOn)} · ${formatCount(r.trees)} trees`,
    alive: `${r.check.alive} / ${r.check.sampleSize}`,
    survival: r.survival.p,
    row: r,
    verdict: r.survival.verdict,
  }))

  const renderCheck = (key, row) => {
    const { row: r } = row
    switch (key) {
      case 'id':
        return <span className="font-mono text-[12px]">{row.id}</span>
      case 'survival':
        return (
          <span className="inline-flex flex-wrap items-center gap-2">
            <IntervalBar p={r.survival.p} lower={r.survival.lower} upper={r.survival.upper} verdict={r.survival.verdict} />
            <span className="font-mono text-[12px] tabular-nums text-ink">
              {formatPct(r.survival.p)} <span className="text-ink-faint">({Math.round(r.survival.lower * 100)}–{formatPct(r.survival.upper)})</span>
            </span>
          </span>
        )
      case 'verdict':
        return (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <StatusPill status={VERDICT_LABEL[r.survival.verdict]} tone={VERDICT_TONE[r.survival.verdict]} />
            {!r.isLatest && <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">earlier</span>}
          </span>
        )
      case 'action':
        return (
          <button type="button" className={BTN_SMALL} onClick={() => openCheck(r.id)} aria-label={`Open ${r.id}`}>
            Open
          </button>
        )
      default:
        return row[key]
    }
  }

  return (
    <div className="space-y-5">
      <ScreenHeader title="Tree Survival" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          label="Latest survival"
          value={kpis.pct === null ? '—' : formatPct(kpis.pct, 1)}
          share={kpis.pct ?? undefined}
          unit={`${kpis.alive} of ${kpis.sample} alive, sample-weighted`}
        />
        <StatTile
          label="Below threshold"
          value={kpis.belowThreshold}
          tone={kpis.belowThreshold > 0 ? 'warn' : 'default'}
          unit={`Latest count fails ${formatPct(S.threshold)}`}
        />
        <StatTile label="Borderline" value={kpis.borderline} unit="Recount before replanting" />
        <StatTile label={`Counts due within ${S.dueSoonDays} days`} value={kpis.dueSoon} unit="Due now or coming up" />
        <StatTile
          label="Counts overdue"
          value={kpis.overdue}
          tone={kpis.overdue > 0 ? 'critical' : 'default'}
          unit={`Past the ${S.graceDays}-day grace`}
        />
      </div>

      <Panel
        title="Counts due"
        lede={`Each verified planting is counted about ${S.checkpointsDays.join(', ')} days after planting, on a sample of ${S.sampleSize} trees. The schedule is worked out from the planting date, and only the next count is shown.`}
        actions={<PrototypeTag label="Proposed policy" />}
      >
        {near.length === 0 ? (
          <p className="text-[13px] text-ink-muted">No count is due within {S.dueSoonDays} days.</p>
        ) : (
          <DataTable columns={COUNT_COLUMNS} rows={countRows(near)} renderCell={renderCount} />
        )}
        {later.length > 0 && (
          <details className="mt-4 rounded-lg border border-line bg-paper-sunk/40 px-4 py-3">
            <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
              Later counts ({later.length})
            </summary>
            <div className="mt-3">
              <DataTable columns={COUNT_COLUMNS} rows={countRows(later)} renderCell={renderCount} />
            </div>
          </details>
        )}
        <Confirmation message={notice} className="mt-3" />
      </Panel>

      <Panel
        title="Counts received"
        lede="The newest first. The bar is the 95% range of the count on a 0 to 100% track; the tick is the threshold."
      >
        <SortableFrame>
          <DataTable columns={CHECK_COLUMNS} rows={checkTable} renderCell={renderCheck} sortable />
        </SortableFrame>
        <p className={CAPTION + ' mt-3'}>
          A sample of {S.sampleSize} trees leaves a wide range, so a wide bar is normal.
        </p>
      </Panel>

      <Panel
        title="Survival-adjusted trees"
        lede="Verified trees counted by what the latest sample says survived. The cautious figure is the low end of the range, rounded down."
      >
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <div>
            <dt className={CAPTION}>Verified trees</dt>
            <dd className="mt-1 text-[1.5rem] font-bold tabular-nums text-ink">{formatCount(summary.verifiedTrees)}</dd>
            <dd className="text-[11.5px] text-ink-muted">{summary.plantings} plantings</dd>
          </div>
          <div>
            <dt className={CAPTION}>Counted</dt>
            <dd className="mt-1 text-[1.5rem] font-bold tabular-nums text-ink">{formatCount(summary.countedTrees)}</dd>
            <dd className="text-[11.5px] text-ink-muted">have a latest count</dd>
          </div>
          <div>
            <dt className={CAPTION}>Surviving (estimate)</dt>
            <dd className="mt-1 text-[1.5rem] font-bold tabular-nums text-ink">{formatCount(summary.surviving)}</dd>
            <dd className="text-[11.5px] text-ink-muted">point estimate</dd>
          </div>
          <div>
            <dt className={CAPTION}>Surviving (conservative)</dt>
            <dd className="mt-1 text-[1.5rem] font-bold tabular-nums text-emerald-700">{formatCount(summary.survivingConservative)}</dd>
            <dd className="text-[11.5px] text-ink-muted">lower bound</dd>
          </div>
        </dl>
        {summary.notCounted.length > 0 && (
          <div className="mt-4 border-t border-line pt-4">
            <p className={CAPTION}>
              Not yet counted
              <Marker>excluded from both</Marker>
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-ink-muted">
              {summary.notCounted.map((n) => (
                <li key={n.id}>
                  {n.plotId} · {n.zoneName} · {formatCount(n.trees)} trees
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </div>
  )
}
