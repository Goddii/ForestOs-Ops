import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Panel, StatTile, StatusPill } from '../../DashboardKit'
import { useConservation } from '../../../../lib/conservation/context'
import { CLAIM_TYPES } from '../../../../lib/conservation/policy'
import {
  CLAIM_STATUS_LABEL,
  CLAIM_STATUS_TONE,
  CLAIM_TYPE_LABEL,
  formatEat,
  quantitySummary,
} from '../../../../lib/conservation/labels'
import { claimKpis, claimRows, zonesInScope } from '../../../../lib/conservation/selectors'
import ConservationClaimDetail from './ConservationClaimDetail'
import FlagChip from './FlagChip'
import ScreenHeader from './ScreenHeader'
import Segmented from './Segmented'
import { useSelectedParam } from './hooks'

const MAX_CHIPS = 3
const STATUSES = ['awaiting_decision', 'awaiting_countersign', 'evidence_requested', 'in_pipeline', 'verified', 'rejected']

const days = (n) => `${n} working ${n === 1 ? 'day' : 'days'}`

/** What the row says about time: working days for open claims, the decision date for closed ones. */
function TimeNote({ row }) {
  if (row.status === 'verified' || row.status === 'rejected') {
    return <>decided {formatEat(row.claim.decision.decidedAt, 'date')}</>
  }
  if (row.status === 'evidence_requested') return <>clock paused</>
  return <>{days(row.workingDays)}</>
}

export default function ConservationVerificationModule() {
  const ctx = useConservation()
  const [claimId, openClaim, closeClaim] = useSelectedParam('claim')
  const [status, setStatus] = useState('awaiting_decision')
  const [type, setType] = useState('all')
  const [zone, setZone] = useState('all')
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [sort, setSort] = useState('oldest')

  const rows = useMemo(() => claimRows(ctx), [ctx])
  const kpis = useMemo(() => claimKpis(ctx), [ctx])
  const zones = useMemo(() => zonesInScope(ctx), [ctx])

  const visible = useMemo(() => {
    const kept = rows.filter(
      (r) =>
        (status === 'all' || r.status === status) &&
        (type === 'all' || r.claim.type === type) &&
        (zone === 'all' || r.claim.zoneId === zone) &&
        (!flaggedOnly || r.flags.length > 0),
    )
    // `rows` is oldest first; "most flags" keeps that order among equals.
    return sort === 'flags' ? [...kept].sort((a, b) => b.flags.length - a.flags.length) : kept
  }, [rows, status, type, zone, flaggedOnly, sort])

  if (claimId) return <ConservationClaimDetail key={claimId} claimId={claimId} onBack={closeClaim} />

  const count = (s) => rows.filter((r) => r.status === s).length

  return (
    <div className="space-y-5">
      <ScreenHeader title="Verification Queue" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          label="Awaiting your decision"
          value={kpis.awaitingDecision}
          tone={kpis.awaitingDecisionOverdue > 0 ? 'warn' : 'default'}
          note={`${kpis.awaitingDecisionOverdue} overdue`}
        />
        <StatTile label="Awaiting countersign" value={kpis.awaitingCountersign} unit="Approved, second signature due" />
        <StatTile label="Evidence requested" value={kpis.evidenceRequested} unit="Decision clock paused" />
        <StatTile label="In pipeline" value={kpis.inPipeline} unit="Not yet ready to decide" />
        <StatTile label="Decided this month" value={kpis.decidedThisMonth} tone="positive" unit="Verified or rejected" />
      </div>

      <Panel
        title="Conservation claims"
        lede="Claims from workers and block supervisors, tree planting to invasive removal. Open one to see the evidence and decide."
      >
        <div className="space-y-3">
          <Segmented
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              ...STATUSES.map((s) => ({ value: s, label: CLAIM_STATUS_LABEL[s], count: count(s) })),
              { value: 'all', label: 'All', count: rows.length },
            ]}
          />
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <Segmented
              label="Type"
              value={type}
              onChange={setType}
              options={[{ value: 'all', label: 'All' }, ...CLAIM_TYPES.map((t) => ({ value: t, label: CLAIM_TYPE_LABEL[t] }))]}
            />
            <Segmented
              label="Zone"
              value={zone}
              onChange={setZone}
              options={[{ value: 'all', label: 'All' }, ...zones.map((z) => ({ value: z.zoneId, label: z.name }))]}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div role="group" aria-label="Flags" className="flex flex-wrap items-center gap-x-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">Flags</span>
              <button
                type="button"
                aria-pressed={flaggedOnly}
                onClick={() => setFlaggedOnly((on) => !on)}
                className={
                  'inline-flex min-h-11 items-center rounded-xl border px-3 text-[12.5px] font-medium transition-colors ' +
                  (flaggedOnly
                    ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                    : 'border-line bg-paper-sunk/60 text-ink-muted hover:text-ink')
                }
              >
                Flagged only
              </button>
            </div>
            <Segmented
              label="Sort"
              value={sort}
              onChange={setSort}
              options={[
                { value: 'oldest', label: 'Oldest first' },
                { value: 'flags', label: 'Most flags' },
              ]}
            />
          </div>
        </div>

        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint" aria-live="polite">
          Showing {visible.length} of {rows.length} claims
        </p>

        {visible.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-muted">No claims match these filters.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {visible.map((row) => {
              const { claim } = row
              const shown = row.flags.slice(0, MAX_CHIPS)
              const extra = row.flags.length - shown.length
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => openClaim(row.id)}
                    className="group flex w-full flex-wrap items-center gap-x-4 gap-y-2 py-3 text-left transition-colors hover:bg-paper-sunk/50"
                  >
                    <div className="min-w-0 flex-1 basis-64">
                      <p className="text-[13px] text-ink">
                        {CLAIM_TYPE_LABEL[claim.type]}
                        <span className="ml-2 font-mono text-[11px] text-ink-faint">{row.id}</span>
                      </p>
                      <p className="mt-0.5 text-[12px] text-ink-muted">
                        {claim.plotId} · {row.zoneName} · {quantitySummary(claim)}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                        Submitted {formatEat(claim.reportedAt, 'date')} · <TimeNote row={row} />
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {row.overdue && <StatusPill status="Overdue" tone="critical" />}
                      {shown.map((flag) => (
                        <FlagChip key={flag} flag={flag} />
                      ))}
                      {extra > 0 && <StatusPill status={`+${extra}`} tone="neutral" />}
                      <StatusPill status={CLAIM_STATUS_LABEL[row.status]} tone={CLAIM_STATUS_TONE[row.status]} />
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-line-strong transition-colors group-hover:text-ink-muted"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </div>
  )
}
