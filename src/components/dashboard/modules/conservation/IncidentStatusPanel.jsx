import { useState } from 'react'
import { Panel, PrototypeTag, StatusPill } from '../../DashboardKit'
import { useConservation } from '../../../../lib/conservation/context'
import { POLICY } from '../../../../lib/conservation/policy'
import {
  INCIDENT_STATUS_ACTION,
  INCIDENT_STATUS_LABEL,
  INCIDENT_STATUS_TONE,
  OUTCOME_LABEL,
  formatEat,
  formatHa,
} from '../../../../lib/conservation/labels'
import { closeOptions, nextIncidentStatus, statusStep } from '../../../../lib/conservation/rules'
import Confirmation from './Confirmation'
import { useActionRunner } from './hooks'
import { BTN_SECONDARY, BTN_WARN, ERROR, HINT, INPUT, LABEL, TEXTAREA, fieldProps } from './ui'

const NOTE_MIN = POLICY.incidents.closeNoteMinChars

/**
 * Status controls. Only the next legal status is offered, one step at a time;
 * `escalated` and `acknowledged` follow from sending a message and recording a
 * reply. Closing asks for the outcome, the area affected and a note.
 */
export default function IncidentStatusPanel({ detail }) {
  const { act } = useConservation()
  const { notice, errors, run } = useActionRunner(act)
  const { incident } = detail
  const [kind, setKind] = useState('')
  const [area, setArea] = useState('')
  const [note, setNote] = useState('')

  const open = incident.status !== 'closed'
  const next = nextIncidentStatus(incident.status)
  const step = open && next && next !== 'closed' ? statusStep(incident, next) : null
  const options = closeOptions(incident)
  const chosenKind = kind || (options.resolved ? 'resolved' : 'false_alarm')
  const fire = incident.type === 'fire'

  const advance = () =>
    run(
      'status',
      { type: 'SET_INCIDENT_STATUS', payload: { incidentId: incident.incidentId, to: next } },
      () => `${incident.incidentId} is now ${INCIDENT_STATUS_LABEL[next].toLowerCase()}.`,
    )

  const close = (event) => {
    event.preventDefault()
    run(
      'close',
      {
        type: 'CLOSE_INCIDENT',
        payload: { incidentId: incident.incidentId, kind: chosenKind, areaAffectedHa: area === '' ? undefined : Number(area), note },
      },
      () => `${incident.incidentId} closed as ${OUTCOME_LABEL[chosenKind].toLowerCase()}.`,
      () => {
        setKind('')
        setArea('')
        setNote('')
      },
    )
  }

  return (
    <Panel title="Status" lede="One step at a time. Sending a message to KFS and recording a reply move the status for you." actions={<PrototypeTag label="Proposed policy" />}>
      <div className="flex flex-wrap items-center gap-3">
        <StatusPill status={INCIDENT_STATUS_LABEL[incident.status]} tone={INCIDENT_STATUS_TONE[incident.status]} />
        {step?.ok && (
          <button type="button" className={BTN_SECONDARY} onClick={advance}>
            {INCIDENT_STATUS_ACTION[next]}
          </button>
        )}
        {step && !step.ok && <p className="text-[12.5px] text-ink-muted">{step.reason}</p>}
        {open && next === 'closed' && <p className="text-[12.5px] text-ink-muted">Controlled. Close it below with an outcome.</p>}
      </div>
      {errors.status && (
        <p role="alert" className={ERROR}>
          {errors.status}
        </p>
      )}

      {open ? (
        <form onSubmit={close} className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
          <div>
            <label htmlFor="close-kind" className={LABEL}>
              Close as
            </label>
            <select id="close-kind" value={chosenKind} onChange={(event) => setKind(event.target.value)} className={INPUT}>
              <option value="resolved" disabled={!options.resolved}>
                {OUTCOME_LABEL.resolved}
                {options.resolved ? '' : ' (only once controlled)'}
              </option>
              <option value="false_alarm">{OUTCOME_LABEL.false_alarm}</option>
            </select>
          </div>
          {chosenKind === 'resolved' && (
            <div>
              <label htmlFor="close-area" className={LABEL}>
                Area affected (ha){fire ? '' : ' (optional)'}
              </label>
              <input
                id="close-area"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={area}
                onChange={(event) => setArea(event.target.value)}
                aria-describedby="close-area-hint"
                className={INPUT}
              />
              <p id="close-area-hint" className={HINT}>
                {fire ? 'Area burnt. Required for a fire; enter 0 if none.' : 'Area disturbed, if known.'}
              </p>
            </div>
          )}
          <div className="sm:col-span-2">
            <label htmlFor="close-note" className={LABEL}>
              Closing note
            </label>
            <textarea
              {...fieldProps('close-note', errors.close, true)}
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={TEXTAREA}
            />
            <p id="close-note-hint" className={HINT}>
              What was found and what was done. At least {NOTE_MIN} characters. No personal names.
            </p>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className={BTN_WARN}>
              Close incident
            </button>
            {errors.close && (
              <p id="close-note-error" role="alert" className={ERROR}>
                {errors.close}
              </p>
            )}
          </div>
        </form>
      ) : (
        <dl className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">Outcome</dt>
            <dd className="mt-1 text-[13px] text-ink">{OUTCOME_LABEL[incident.outcome.kind]}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">Area affected</dt>
            <dd className="mt-1 text-[13px] text-ink">
              {incident.outcome.areaAffectedHa === null ? 'Not recorded' : `${formatHa(incident.outcome.areaAffectedHa)} ha`}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">Closed</dt>
            <dd className="mt-1 text-[13px] text-ink">{formatEat(incident.outcome.closedAt, 'datetime')} EAT</dd>
          </div>
          <div className="sm:col-span-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">Note</dt>
            <dd className="mt-1 text-[13px] text-ink-muted">{incident.outcome.note}</dd>
          </div>
        </dl>
      )}
      <Confirmation message={notice} className="mt-3" />
    </Panel>
  )
}
