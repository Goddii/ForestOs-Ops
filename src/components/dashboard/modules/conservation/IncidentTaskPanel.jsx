import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Panel, StatusPill } from '../../DashboardKit'
import { useConservation } from '../../../../lib/conservation/context'
import { POLICY, TASK_TYPES } from '../../../../lib/conservation/policy'
import {
  INCIDENT_TYPE_LABEL,
  TASK_STATUS_LABEL,
  TASK_STATUS_TONE,
  TASK_TYPE_LABEL,
  formatDay,
  formatEat,
} from '../../../../lib/conservation/labels'
import { addDaysKey, eatDateKey } from '../../../../lib/conservation/rules'
import Confirmation from './Confirmation'
import { useActionRunner } from './hooks'
import { conPath } from './paths'
import { ASSIGNEE_KEYS, DEFAULT_ASSIGNEE, SUGGESTED_TASK, assigneeTitle } from './taskRoles'
import { BTN_PRIMARY, CAPTION, ERROR, INPUT, LABEL, TEXTAREA } from './ui'

/**
 * What is tied to this incident — the source report, satellite alerts and
 * maintenance tasks — and a prefilled form to create a follow-up task. The
 * assignee is picked from role titles, never typed.
 */
export default function IncidentTaskPanel({ detail }) {
  const { act, now, ref } = useConservation()
  const { notice, errors, run } = useActionRunner(act)
  const { incident, segment } = detail
  const [type, setType] = useState(SUGGESTED_TASK[incident.type])
  const [assignee, setAssignee] = useState(null)
  const [due, setDue] = useState(() => addDaysKey(eatDateKey(now), POLICY.tasks.defaultDueDays))
  const [note, setNote] = useState(
    `Follow-up to ${incident.incidentId}: ${INCIDENT_TYPE_LABEL[incident.type].toLowerCase()} on ${segment?.name ?? incident.segmentId}.`,
  )
  const chosenAssignee = assignee ?? DEFAULT_ASSIGNEE[type]

  const submit = (event) => {
    event.preventDefault()
    run(
      'task',
      {
        type: 'CREATE_TASK',
        payload: {
          type,
          segmentId: incident.segmentId,
          zoneId: incident.zoneId,
          plotId: incident.plotId,
          linkedRef: incident.incidentId,
          assigneeRole: assigneeTitle(ref, chosenAssignee, incident.zoneId),
          dueOn: due,
          note,
        },
      },
      (result) => `Task ${result.id} created for ${assigneeTitle(ref, chosenAssignee, incident.zoneId)}.`,
    )
  }

  return (
    <Panel title="Linked items" lede="What is tied to this incident, and a follow-up task you can create from it.">
      <dl className="grid gap-4 sm:grid-cols-3">
        <div>
          <dt className={CAPTION}>Source report</dt>
          <dd className="mt-1 text-[13px] text-ink">
            {detail.sourceRefs.length ? detail.sourceRefs.join(', ') : <span className="text-ink-faint">None</span>}
          </dd>
        </div>
        <div>
          <dt className={CAPTION}>Satellite alerts</dt>
          <dd className="mt-1 text-[13px] text-ink">
            {detail.alerts.length ? (
              <ul className="space-y-1">
                {detail.alerts.map((a) => (
                  <li key={a.alertId}>
                    <Link
                      to={conPath(`boundary?alert=${a.alertId}`)}
                      className="font-mono text-[12.5px] text-emerald-700 underline decoration-emerald-700/30 underline-offset-2 hover:text-emerald-800"
                    >
                      {a.alertId}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-ink-faint">None</span>
            )}
          </dd>
        </div>
        <div>
          <dt className={CAPTION}>Tasks</dt>
          <dd className="mt-1 text-[13px] text-ink">
            {detail.tasks.length ? (
              <ul className="space-y-1.5">
                {detail.tasks.map((t) => (
                  <li key={t.taskId} className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[12.5px]">{t.taskId}</span>
                    <span>{TASK_TYPE_LABEL[t.type]}</span>
                    <StatusPill status={TASK_STATUS_LABEL[t.status]} tone={TASK_STATUS_TONE[t.status]} />
                    <span className="text-[11.5px] text-ink-muted">
                      {t.assigneeRole} · due {formatDay(t.dueOn)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-ink-faint">None</span>
            )}
          </dd>
        </div>
      </dl>

      <form onSubmit={submit} className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
        <p className={CAPTION + ' sm:col-span-3'}>Create maintenance task (prefilled)</p>
        <div>
          <label htmlFor="task-type" className={LABEL}>
            Task
          </label>
          <select
            id="task-type"
            value={type}
            onChange={(event) => {
              setType(event.target.value)
              setAssignee(null)
            }}
            className={INPUT}
          >
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {TASK_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="task-assignee" className={LABEL}>
            For
          </label>
          <select id="task-assignee" value={chosenAssignee} onChange={(event) => setAssignee(event.target.value)} className={INPUT}>
            {ASSIGNEE_KEYS.map((key) => (
              <option key={key} value={key}>
                {assigneeTitle(ref, key, incident.zoneId)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="task-due" className={LABEL}>
            Due
          </label>
          <input id="task-due" type="date" value={due} onChange={(event) => setDue(event.target.value)} className={INPUT} />
        </div>
        <div className="sm:col-span-3">
          <label htmlFor="task-note" className={LABEL}>
            Note
          </label>
          <textarea id="task-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} className={TEXTAREA} />
        </div>
        <div className="sm:col-span-3">
          <button type="submit" className={BTN_PRIMARY}>
            Create task
          </button>
          {errors.task && (
            <p role="alert" className={ERROR}>
              {errors.task}
            </p>
          )}
        </div>
      </form>
      <Confirmation message={notice} className="mt-3" />
      <p className="mt-2 text-[11.5px] text-ink-faint">
        The due date starts {POLICY.tasks.defaultDueDays} days after {formatEat(now, 'date')}; change it if the work is more urgent.
      </p>
    </Panel>
  )
}
