import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarPlus, Check, Eye, X } from 'lucide-react'
import { Panel, PrototypeTag, StatusPill } from '../../DashboardKit'
import { useConservation } from '../../../../lib/conservation/context'
import { DISMISSAL_REASONS, INCIDENT_TYPES, POLICY } from '../../../../lib/conservation/policy'
import {
  ALERT_STATUS_LABEL,
  ALERT_STATUS_TONE,
  COPY,
  DISMISSAL_LABEL,
  INCIDENT_STATUS_LABEL,
  INCIDENT_TYPE_LABEL,
  TASK_STATUS_LABEL,
  TASK_STATUS_TONE,
  TASK_TYPE_LABEL,
  formatCoord,
  formatDay,
  formatEat,
  formatHa,
} from '../../../../lib/conservation/labels'
import AgreementPill from './AgreementPill'
import Callout from './Callout'
import Confirmation from './Confirmation'
import Marker from './Marker'
import { useActionRunner } from './hooks'
import { conPath } from './paths'
import { assigneeTitle } from './taskRoles'
import { BTN_PRIMARY, BTN_SECONDARY, BTN_WARN, CAPTION, ERROR, HINT, INPUT, LABEL, TEXTAREA } from './ui'

const B = POLICY.boundary

function Fact({ label, children }) {
  return (
    <div>
      <dt className={CAPTION}>{label}</dt>
      <dd className="mt-1 text-[13px] text-ink">{children}</dd>
    </div>
  )
}

/** One satellite alert: the facts, whether it meets the mapping rules, and the four things the officer can do with it. */
export default function AlertDetail({ detail }) {
  const { act, ref } = useConservation()
  const { notice, errors, run } = useActionRunner(act)
  const { alert } = detail
  const [incidentType, setIncidentType] = useState('')
  const [reason, setReason] = useState('')
  const [knownId, setKnownId] = useState('')
  const [note, setNote] = useState('')

  const placed = Boolean(alert.segmentId)
  const triageable = alert.status === 'new' || alert.status === 'under_review'
  const patrolable = placed && alert.status !== 'dismissed' && alert.status !== 'resolved'
  const openTask = detail.tasks.find((t) => t.type === 'field_check' && t.status !== 'done')

  const confirm = () =>
    run(
      'confirm',
      { type: 'TRIAGE_ALERT', payload: { alertId: alert.alertId, to: 'confirmed', incidentType } },
      (result) => `${alert.alertId} confirmed as incident ${result.id}.`,
      () => setIncidentType(''),
    )
  const review = () =>
    run('review', { type: 'TRIAGE_ALERT', payload: { alertId: alert.alertId, to: 'under_review' } }, () => `${alert.alertId} marked under review.`)
  const dismiss = () =>
    run(
      'dismiss',
      {
        type: 'TRIAGE_ALERT',
        payload: { alertId: alert.alertId, to: 'dismissed', dismissal: { reason, incidentId: knownId || null, note } },
      },
      () => `${alert.alertId} dismissed as ${DISMISSAL_LABEL[reason].toLowerCase()}.`,
      () => {
        setReason('')
        setKnownId('')
        setNote('')
      },
    )
  const schedule = () =>
    run(
      'patrol',
      {
        type: 'CREATE_TASK',
        payload: {
          type: 'field_check',
          segmentId: alert.segmentId,
          linkedRef: alert.alertId,
          assigneeRole: assigneeTitle(ref, 'zone_manager', alert.zoneId),
          note: `Check the boundary at ${detail.segmentName} after satellite alert ${alert.alertId}.`,
        },
      },
      (result) => `Patrol ${result.id} scheduled for ${assigneeTitle(ref, 'zone_manager', alert.zoneId)}. The alert keeps its status.`,
    )

  return (
    <Panel
      title={alert.alertId}
      lede={`${detail.segmentName ?? 'Not placed on a segment'}${detail.zoneName ? ` · ${detail.zoneName}` : ''}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <AgreementPill value={detail.agreement} />
          <StatusPill status={ALERT_STATUS_LABEL[alert.status]} tone={ALERT_STATUS_TONE[alert.status]} />
        </div>
      }
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Fact label="Area">{formatHa(alert.areaHa)} ha</Fact>
        <Fact label="From the belt edge">{alert.distanceM} m</Fact>
        <Fact label="NDVI drop">{alert.ndviDrop === null ? 'Not recorded' : alert.ndviDrop.toFixed(2)}</Fact>
        <Fact label="Detected">{formatEat(alert.detectedAt, 'datetime')} EAT</Fact>
        <Fact label="Satellite pass">{alert.passDate ? formatDay(alert.passDate, true) : 'Not recorded'}</Fact>
        <Fact label="Cloud on the pass">{alert.cloudFraction === null ? 'Not recorded' : `${(alert.cloudFraction * 100).toFixed(1)}%`}</Fact>
        <Fact label="Coordinates">
          {alert.lat === null ? 'Not recorded' : `${formatCoord(alert.lat)}, ${formatCoord(alert.lon)}`}
        </Fact>
        <Fact label="Plot">{alert.plotId ?? '—'}</Fact>
        <Fact label="Linked incident">
          {alert.incidentId ? (
            <Link
              to={conPath(`incidents?incident=${alert.incidentId}`)}
              className="font-mono text-[12.5px] text-emerald-700 underline decoration-emerald-700/30 underline-offset-2 hover:text-emerald-800"
            >
              {alert.incidentId}
            </Link>
          ) : (
            <span className="text-ink-faint">None</span>
          )}
        </Fact>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-muted">
        <span>
          Mapping rules: {formatHa(B.alert.minMappingUnitHa)} ha or more, NDVI drop {B.alert.ndviDropMin.toFixed(2)} or more, within {B.alert.bufferM} m of the belt edge.
        </span>
        <Marker>proposed</Marker>
        {detail.meetsCriteria === null ? (
          <StatusPill status="Not assessed" tone="neutral" />
        ) : (
          <StatusPill status={detail.meetsCriteria ? 'Meets the rules' : 'Below the rules'} tone={detail.meetsCriteria ? 'positive' : 'warn'} />
        )}
      </div>
      <Callout tone="info" className="mt-4">
        {COPY.agreement}
      </Callout>

      {alert.dismissal && (
        <p className="mt-4 text-[13px] text-ink-muted">
          Dismissed as {DISMISSAL_LABEL[alert.dismissal.reason].toLowerCase()}
          {alert.dismissal.incidentId ? ` (${alert.dismissal.incidentId})` : ''}
          {alert.dismissal.note ? `: ${alert.dismissal.note}` : '.'}
        </p>
      )}

      <div className="mt-5 grid gap-4 border-t border-line pt-4 lg:grid-cols-2">
        <section aria-labelledby={`confirm-${alert.alertId}`} className="rounded-xl border border-line bg-paper-sunk/30 p-4">
          <h4 id={`confirm-${alert.alertId}`} className="text-[14px] font-semibold text-ink">
            Confirm as incident
          </h4>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
            Raises an incident at the alert’s position. Its first report is the satellite, at the time it was detected.
          </p>
          <label htmlFor={`type-${alert.alertId}`} className={LABEL + ' mt-3'}>
            Type of incident
          </label>
          <select
            id={`type-${alert.alertId}`}
            value={incidentType}
            onChange={(event) => setIncidentType(event.target.value)}
            disabled={!triageable || !placed}
            className={INPUT}
          >
            <option value="">Choose a type…</option>
            {INCIDENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {INCIDENT_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          {!placed && <p className={HINT}>This alert is not placed on a segment, so it cannot be raised here.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={BTN_PRIMARY} disabled={!triageable || !placed} onClick={confirm}>
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              Confirm as incident
            </button>
            <button type="button" className={BTN_SECONDARY} disabled={alert.status !== 'new'} onClick={review}>
              <Eye className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              Mark under review
            </button>
          </div>
          {(errors.confirm || errors.review) && (
            <p role="alert" className={ERROR}>
              {errors.confirm || errors.review}
            </p>
          )}
        </section>

        <section aria-labelledby={`dismiss-${alert.alertId}`} className="rounded-xl border border-line bg-paper-sunk/30 p-4">
          <h4 id={`dismiss-${alert.alertId}`} className="text-[14px] font-semibold text-ink">
            Dismiss
          </h4>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">A reason is required. Dismissing is final.</p>
          <label htmlFor={`reason-${alert.alertId}`} className={LABEL + ' mt-3'}>
            Reason
          </label>
          <select
            id={`reason-${alert.alertId}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={!triageable}
            className={INPUT}
          >
            <option value="">Choose a reason…</option>
            {DISMISSAL_REASONS.map((r) => (
              <option key={r} value={r}>
                {DISMISSAL_LABEL[r]}
              </option>
            ))}
          </select>
          {reason === 'known_incident' && (
            <div className="mt-3">
              <label htmlFor={`known-${alert.alertId}`} className={LABEL}>
                Which incident
              </label>
              <select id={`known-${alert.alertId}`} value={knownId} onChange={(event) => setKnownId(event.target.value)} className={INPUT}>
                <option value="">Choose an incident on this segment…</option>
                {detail.incidentsOnSegment.map((i) => (
                  <option key={i.incidentId} value={i.incidentId}>
                    {i.incidentId} · {INCIDENT_TYPE_LABEL[i.type]} · {INCIDENT_STATUS_LABEL[i.status]}
                  </option>
                ))}
              </select>
            </div>
          )}
          {reason === 'other' && (
            <div className="mt-3">
              <label htmlFor={`note-${alert.alertId}`} className={LABEL}>
                Note
              </label>
              <textarea
                id={`note-${alert.alertId}`}
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                aria-describedby={`note-hint-${alert.alertId}`}
                className={TEXTAREA}
              />
              <p id={`note-hint-${alert.alertId}`} className={HINT}>
                At least {B.dismissNoteMinChars} characters.
              </p>
            </div>
          )}
          <div className="mt-3">
            <button type="button" className={BTN_WARN} disabled={!triageable} onClick={dismiss}>
              <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              Dismiss
            </button>
          </div>
          {errors.dismiss && (
            <p role="alert" className={ERROR}>
              {errors.dismiss}
            </p>
          )}
        </section>
      </div>

      <div className="mt-4 rounded-xl border border-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-[14px] font-semibold text-ink">Schedule patrol</h4>
            <p className="mt-1 max-w-[56ch] text-[12px] leading-relaxed text-ink-muted">
              Creates a field check on the segment for the zone’s Zone Manager, linked to this alert. The alert keeps its status.
            </p>
          </div>
          <button type="button" className={BTN_SECONDARY} disabled={!patrolable} onClick={schedule}>
            <CalendarPlus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
            Schedule patrol
          </button>
        </div>
        {errors.patrol && (
          <p role="alert" className={ERROR}>
            {errors.patrol}
          </p>
        )}
        {detail.tasks.length > 0 && (
          <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
            {detail.tasks.map((t) => (
              <li key={t.taskId} className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-muted">
                <span className="font-mono text-ink">{t.taskId}</span>
                {TASK_TYPE_LABEL[t.type]}
                <StatusPill status={TASK_STATUS_LABEL[t.status]} tone={TASK_STATUS_TONE[t.status]} />
                <span>
                  {t.assigneeRole} · due {formatDay(t.dueOn)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {openTask && <p className="mt-2 text-[11.5px] text-ink-faint">A field check is already open for this alert.</p>}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <Confirmation message={notice} />
        <PrototypeTag label="Proposed policy" />
      </div>
    </Panel>
  )
}
