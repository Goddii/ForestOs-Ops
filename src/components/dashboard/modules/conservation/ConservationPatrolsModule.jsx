import { useMemo, useRef, useState } from 'react'
import { DataTable, Panel, PrototypeTag, StatTile, StatusPill } from '../../DashboardKit'
import { useConservation } from '../../../../lib/conservation/context'
import { POLICY } from '../../../../lib/conservation/policy'
import {
  LOG_KIND_LABEL,
  PATROL_ISSUE_LABEL,
  TASK_STATUS_LABEL,
  TASK_STATUS_TONE,
  formatDay,
  formatTaskQuantity,
} from '../../../../lib/conservation/labels'
import { eatDateKey } from '../../../../lib/conservation/rules'
import { patrolKpis, patrolRows, recentLog, segmentsInScope, taskRows } from '../../../../lib/conservation/selectors'
import Confirmation from './Confirmation'
import PatrolLogForm from './PatrolLogForm'
import ScreenHeader from './ScreenHeader'
import Segmented from './Segmented'
import { useActionRunner } from './hooks'
import { BTN_PRIMARY, BTN_SECONDARY, BTN_SMALL, ERROR, INPUT, LABEL } from './ui'

const SCHEDULE_COLUMNS = [
  { key: 'name', label: 'Segment' },
  { key: 'risk', label: 'Risk' },
  { key: 'interval', label: 'Interval', align: 'right', mono: true },
  { key: 'lastPatrol', label: 'Last patrol' },
  { key: 'nextDue', label: 'Next due' },
  { key: 'state', label: 'State' },
  { key: 'action', label: 'Action' },
]

const TASK_COLUMNS = [
  { key: 'id', label: 'Task' },
  { key: 'what', label: 'What' },
  { key: 'where', label: 'Where' },
  { key: 'linkedRef', label: 'Linked' },
  { key: 'assigneeRole', label: 'For' },
  { key: 'dueOn', label: 'Due' },
  { key: 'status', label: 'Status' },
  { key: 'action', label: 'Actions' },
]

const OPEN = ['planned', 'in_progress', 'blocked']

export default function ConservationPatrolsModule() {
  const ctx = useConservation()
  const kpis = useMemo(() => patrolKpis(ctx), [ctx])
  const schedule = useMemo(() => patrolRows(ctx), [ctx])
  const tasks = useMemo(() => taskRows(ctx), [ctx])
  const log = useMemo(() => recentLog(ctx, 12), [ctx])
  const segments = useMemo(() => segmentsInScope(ctx), [ctx])
  const { notice, errors, run } = useActionRunner(ctx.act)

  const [filter, setFilter] = useState('open')
  const [logSegment, setLogSegment] = useState(segments[0]?.segmentId ?? '')
  const [blocking, setBlocking] = useState(null)
  const [reason, setReason] = useState('')
  const formRef = useRef(null)
  const notesRef = useRef(null)
  const today = eatDateKey(ctx.now)

  const visibleTasks = tasks.filter((t) => (filter === 'all' ? true : filter === 'open' ? OPEN.includes(t.task.status) : t.task.status === filter))
  const count = (statuses) => tasks.filter((t) => statuses.includes(t.task.status)).length

  const startLog = (segmentId) => {
    setLogSegment(segmentId)
    formRef.current?.scrollIntoView({ block: 'start' })
    notesRef.current?.focus()
  }

  const update = (task, action, verb, extra = {}) =>
    run(
      task.taskId,
      { type: 'UPDATE_TASK', payload: { taskId: task.taskId, action, ...extra } },
      (result) => `${task.taskId} ${verb}${action === 'complete' && result.logRef ? `; log entry ${result.logRef} written` : ''}.`,
      () => {
        setBlocking(null)
        setReason('')
      },
    )

  const renderSchedule = (key, row) => {
    switch (key) {
      case 'risk':
        return row.risk.high ? (
          <span>
            High<span className="ml-1.5 text-[11.5px] text-ink-muted">({row.risk.reason})</span>
          </span>
        ) : (
          'Normal'
        )
      case 'interval':
        return `${row.interval} d`
      case 'lastPatrol':
        return row.lastPatrol ? formatDay(row.lastPatrol) : <span className="text-ink-faint">Never</span>
      case 'nextDue':
        return row.nextDue ? formatDay(row.nextDue) : '—'
      case 'state':
        return row.patrolState === 'overdue' ? (
          <StatusPill status={row.daysOverdue === null ? 'Overdue' : `Overdue ${row.daysOverdue} d`} tone="critical" />
        ) : row.patrolState === 'due_today' ? (
          <StatusPill status="Due today" tone="neutral" />
        ) : (
          <StatusPill status="On schedule" tone="positive" />
        )
      case 'action':
        return (
          <button type="button" className={BTN_SMALL} onClick={() => startLog(row.id)} aria-label={`Log patrol for ${row.name}`}>
            Log patrol
          </button>
        )
      default:
        return row[key]
    }
  }

  const renderTask = (key, row) => {
    const t = row.task
    switch (key) {
      case 'id':
        return <span className="font-mono text-[12px]">{row.id}</span>
      case 'what':
        return (
          <>
            {row.typeLabel}
            {formatTaskQuantity(t) && <span className="ml-1.5 text-[11.5px] text-ink-muted">· {formatTaskQuantity(t)}</span>}
            {t.note && <p className="mt-0.5 max-w-[34ch] text-[11.5px] leading-snug text-ink-muted">{t.note}</p>}
            {t.blockedReason && <p className="mt-0.5 max-w-[34ch] text-[11.5px] leading-snug text-amber-700">Blocked: {t.blockedReason}</p>}
          </>
        )
      case 'where':
        return [row.segmentName ?? t.plotId, row.zoneName].filter(Boolean).join(' · ') || '—'
      case 'linkedRef':
        return t.linkedRef ? <span className="font-mono text-[12px]">{t.linkedRef}</span> : <span className="text-ink-faint">—</span>
      case 'assigneeRole':
        return t.assigneeRole
      case 'dueOn':
        return (
          <span className={t.status !== 'done' && t.dueOn < today ? 'font-medium text-critical' : ''}>
            {formatDay(t.dueOn)}
            {t.status !== 'done' && t.dueOn < today && <span className="ml-1.5 text-[11px]">overdue</span>}
          </span>
        )
      case 'status':
        return <StatusPill status={TASK_STATUS_LABEL[t.status]} tone={TASK_STATUS_TONE[t.status]} />
      case 'action':
        return (
          <div className="flex flex-wrap gap-1.5">
            {(t.status === 'planned' || t.status === 'blocked') && (
              <button type="button" className={BTN_SMALL} onClick={() => update(t, 'start', 'started')} aria-label={`Start ${t.taskId}`}>
                Start
              </button>
            )}
            {(t.status === 'planned' || t.status === 'in_progress') && (
              <button type="button" className={BTN_SMALL} onClick={() => setBlocking(t.taskId)} aria-label={`Block ${t.taskId}`}>
                Block
              </button>
            )}
            {(t.status === 'planned' || t.status === 'in_progress') && (
              <button type="button" className={BTN_SMALL} onClick={() => update(t, 'complete', 'completed')} aria-label={`Complete ${t.taskId}`}>
                Complete
              </button>
            )}
            {t.status === 'done' && (
              <button type="button" className={BTN_SMALL} onClick={() => update(t, 'reopen', 'reopened')} aria-label={`Reopen ${t.taskId}`}>
                Reopen
              </button>
            )}
            {errors[t.taskId] && (
              <p role="alert" className={ERROR + ' basis-full'}>
                {errors[t.taskId]}
              </p>
            )}
          </div>
        )
      default:
        return row[key]
    }
  }

  const blockingTask = blocking ? tasks.find((t) => t.id === blocking) : null

  return (
    <div className="space-y-5">
      <ScreenHeader title="Patrols & Maintenance" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          label="Segments on schedule"
          value={kpis.onSchedule}
          share={kpis.total ? kpis.onSchedule / kpis.total : undefined}
          unit={`of ${kpis.total}, not overdue`}
          note={kpis.dueToday ? `${kpis.dueToday} due today` : undefined}
        />
        <StatTile label="Overdue" value={kpis.overdue} tone={kpis.overdue > 0 ? 'critical' : 'default'} unit="Patrols past their due day" />
        <StatTile label="Tasks open" value={kpis.tasksOpen} unit="Planned, in progress or blocked" />
        <StatTile label="Blocked" value={kpis.tasksBlocked} tone={kpis.tasksBlocked > 0 ? 'warn' : 'default'} unit="Waiting on something" />
        <StatTile label="Done this month" value={kpis.doneThisMonth} tone="positive" unit="Logged when completed" />
      </div>

      <Panel
        title="Patrol schedule"
        lede={`A segment is patrolled every ${POLICY.boundary.patrolIntervalDays.normal} days, or every ${POLICY.boundary.patrolIntervalDays.high} days when it is high risk: a high-risk season, or an open fire, logging, charcoal or encroachment incident on it. Overdue means past the end of the due day, East Africa Time.`}
        actions={<PrototypeTag label="Proposed policy" />}
      >
        <DataTable columns={SCHEDULE_COLUMNS} rows={schedule.map((r) => ({ ...r, id: r.id, name: r.segment.name }))} renderCell={renderSchedule} />
      </Panel>

      <div ref={formRef} className="scroll-mt-24">
        <PatrolLogForm segments={segments} segmentId={logSegment} onSegmentChange={setLogSegment} notesRef={notesRef} />
      </div>

      <Panel title="Maintenance tasks" lede="Assigned to a role, never a person. Completing a task writes a line in the log below.">
        <Segmented
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'open', label: 'Open', count: count(OPEN) },
            { value: 'planned', label: 'Planned', count: count(['planned']) },
            { value: 'in_progress', label: 'In progress', count: count(['in_progress']) },
            { value: 'blocked', label: 'Blocked', count: count(['blocked']) },
            { value: 'done', label: 'Done', count: count(['done']) },
            { value: 'all', label: 'All', count: tasks.length },
          ]}
        />
        <div className="mt-3">
          {visibleTasks.length === 0 ? (
            <p className="text-[13px] text-ink-muted">No tasks match this filter.</p>
          ) : (
            <DataTable columns={TASK_COLUMNS} rows={visibleTasks} renderCell={renderTask} />
          )}
        </div>
        {blockingTask && (
          <form
            className="mt-4 rounded-xl border border-amber-700/25 bg-[#fdf4e7] p-4"
            onSubmit={(event) => {
              event.preventDefault()
              update(blockingTask.task, 'block', 'blocked', { reason })
            }}
          >
            <label htmlFor="block-reason" className={LABEL}>
              Why is {blockingTask.id} blocked?
            </label>
            <input
              id="block-reason"
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              autoFocus
              autoComplete="off"
              className={INPUT + ' mt-1.5'}
            />
            <p className="mt-1 text-[11.5px] text-ink-muted">At least {POLICY.tasks.blockReasonMinChars} characters. No personal names.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="submit" className={BTN_PRIMARY}>
                Block task
              </button>
              <button type="button" className={BTN_SECONDARY} onClick={() => { setBlocking(null); setReason('') }}>
                Cancel
              </button>
            </div>
            {errors[blockingTask.id] && (
              <p role="alert" className={ERROR}>
                {errors[blockingTask.id]}
              </p>
            )}
          </form>
        )}
        <Confirmation message={notice} className="mt-3" />
      </Panel>

      <Panel title="Recent log" lede="Patrols and maintenance, newest first by date.">
        <ul className="divide-y divide-line">
          {log.map((entry) => (
            <li key={entry.logId} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-[13px] text-ink">{entry.note}</p>
                <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                  {entry.logId} · {formatDay(entry.on, true)}
                  {entry.segmentName ? ` · ${entry.segmentName}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {entry.issues.map((issue) => (
                  <StatusPill key={issue} status={PATROL_ISSUE_LABEL[issue]} tone="warn" />
                ))}
                <StatusPill status={LOG_KIND_LABEL[entry.kind]} tone="neutral" />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11.5px] text-ink-faint">Showing the latest {log.length} entries.</p>
      </Panel>
    </div>
  )
}
