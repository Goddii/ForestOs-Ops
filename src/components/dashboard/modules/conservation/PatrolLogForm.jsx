import { useState } from 'react'
import { Panel } from '../../DashboardKit'
import { useConservation } from '../../../../lib/conservation/context'
import { PATROL_ISSUES, TASK_TYPES } from '../../../../lib/conservation/policy'
import { PATROL_ISSUE_LABEL, TASK_TYPE_LABEL } from '../../../../lib/conservation/labels'
import { eatDateKey } from '../../../../lib/conservation/rules'
import Callout from './Callout'
import Confirmation from './Confirmation'
import { useActionRunner } from './hooks'
import { DEFAULT_ASSIGNEE, ISSUE_TASK, assigneeTitle } from './taskRoles'
import { BTN_PRIMARY, BTN_SECONDARY, ERROR, HINT, INPUT, LABEL, TEXTAREA } from './ui'

/** After a patrol with issues ticked, offer a task for the first of them. */
function FollowUp({ followUp, segments, runner, onDone }) {
  const { ref } = useConservation()
  const { errors, run } = runner
  const [type, setType] = useState(ISSUE_TASK[followUp.issues[0]] ?? 'field_check')
  const zoneId = segments.find((s) => s.segmentId === followUp.segmentId)?.zoneId
  const issues = followUp.issues.map((i) => PATROL_ISSUE_LABEL[i].toLowerCase()).join(', ')

  const create = () =>
    run(
      'task',
      {
        type: 'CREATE_TASK',
        payload: {
          type,
          segmentId: followUp.segmentId,
          linkedRef: followUp.logId,
          assigneeRole: assigneeTitle(ref, DEFAULT_ASSIGNEE[type], zoneId),
          note: `Follow-up to patrol ${followUp.logId}: ${issues}.`,
        },
      },
      (result) => `Task ${result.id} created for ${assigneeTitle(ref, DEFAULT_ASSIGNEE[type], zoneId)}.`,
      onDone,
    )

  return (
    <Callout tone="info" title={`Issues were found on ${followUp.logId}`} className="mt-4">
      <p>Found: {issues}. Create a follow-up task?</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="followup-type" className={LABEL}>
            Task
          </label>
          <select id="followup-type" value={type} onChange={(event) => setType(event.target.value)} className={INPUT + ' min-w-56'}>
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {TASK_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className={BTN_PRIMARY} onClick={create}>
          Create task
        </button>
        <button type="button" className={BTN_SECONDARY} onClick={onDone}>
          Not now
        </button>
      </div>
      {errors.task && (
        <p role="alert" className={ERROR}>
          {errors.task}
        </p>
      )}
    </Callout>
  )
}

/**
 * Records a patrol: segment, date (EAT, today by default), findings and the
 * issues found. A patrol with issues offers a follow-up task. The segment is
 * held by the screen so a row's "Log patrol" action can fill it in.
 */
export default function PatrolLogForm({ segments, segmentId, onSegmentChange, notesRef }) {
  const { act, now } = useConservation()
  const runner = useActionRunner(act)
  const { notice, errors, run } = runner
  const today = eatDateKey(now)
  const [on, setOn] = useState(today)
  const [notes, setNotes] = useState('')
  const [issues, setIssues] = useState([])
  const [followUp, setFollowUp] = useState(null)

  const toggle = (issue) =>
    setIssues((current) => {
      if (issue === 'none') return current.includes('none') ? [] : ['none']
      const without = current.filter((i) => i !== 'none' && i !== issue)
      return current.includes(issue) ? without : [...without, issue]
    })

  const submit = (event) => {
    event.preventDefault()
    const segment = segments.find((s) => s.segmentId === segmentId)
    run(
      'log',
      { type: 'LOG_PATROL', payload: { segmentId, on, note: notes, issues } },
      (result) => `Patrol ${result.id} logged for ${segment?.name ?? segmentId}.`,
      (result) => {
        const found = issues.filter((i) => i !== 'none')
        setFollowUp(found.length ? { logId: result.id, segmentId, issues: found } : null)
        setNotes('')
        setIssues([])
      },
    )
  }

  return (
    <Panel title="Log a patrol" lede="A patrol resets that segment’s clock. Findings are free text: no names or phone numbers.">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="patrol-segment" className={LABEL}>
            Segment
          </label>
          <select id="patrol-segment" value={segmentId} onChange={(event) => onSegmentChange(event.target.value)} className={INPUT}>
            {segments.map((s) => (
              <option key={s.segmentId} value={s.segmentId}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="patrol-date" className={LABEL}>
            Date
          </label>
          <input id="patrol-date" type="date" value={on} max={today} onChange={(event) => setOn(event.target.value)} className={INPUT} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="patrol-notes" className={LABEL}>
            Findings
          </label>
          <textarea
            id="patrol-notes"
            ref={notesRef}
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            aria-describedby="patrol-notes-hint"
            className={TEXTAREA}
          />
          <p id="patrol-notes-hint" className={HINT}>
            What the patrol walked and saw.
          </p>
        </div>
        <fieldset className="sm:col-span-2">
          <legend className={LABEL}>Issues found</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {PATROL_ISSUES.map((issue) => {
              const checked = issues.includes(issue)
              return (
                <label
                  key={issue}
                  className={
                    'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-[12.5px] font-medium transition-colors ' +
                    (checked ? 'border-emerald-700 bg-emerald-700/10 text-emerald-900' : 'border-line bg-card text-ink-muted hover:border-line-strong')
                  }
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(issue)}
                    className="h-4 w-4 accent-emerald-700"
                  />
                  {PATROL_ISSUE_LABEL[issue]}
                </label>
              )
            })}
          </div>
        </fieldset>
        <div className="sm:col-span-2">
          <button type="submit" className={BTN_PRIMARY}>
            Log patrol
          </button>
          {errors.log && (
            <p role="alert" className={ERROR}>
              {errors.log}
            </p>
          )}
        </div>
      </form>
      {followUp && (
        <FollowUp key={followUp.logId} followUp={followUp} segments={segments} runner={runner} onDone={() => setFollowUp(null)} />
      )}
      <Confirmation message={notice} className="mt-3" />
    </Panel>
  )
}
