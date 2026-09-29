import { Check, Phone, Send } from 'lucide-react'
import { Panel, PrototypeTag, StatusPill } from '../../DashboardKit'
import { useConservation } from '../../../../lib/conservation/context'
import {
  COPY,
  RUNG_STATE_LABEL,
  RUNG_STATE_TONE,
  formatDuration,
  formatEat,
} from '../../../../lib/conservation/labels'
import { GSM_SAFE, escalationOf } from '../../../../lib/conservation/rules'
import Callout from './Callout'
import Confirmation from './Confirmation'
import Marker from './Marker'
import { useActionRunner } from './hooks'
import { BTN_SECONDARY, BTN_SMALL, CAPTION, ERROR } from './ui'

const at = (ms) => `${formatEat(ms, 'datetime')} EAT`

/** One line saying where a rung stands. */
function rungNote(rung, now) {
  if (rung.state === 'acknowledged') {
    const how = rung.ackChannel === 'phone' ? 'phone' : 'SMS reply'
    return `Acknowledged ${at(Date.parse(rung.ackAt))} by ${how}${rung.ackNote ? ` · “${rung.ackNote}”` : ''}`
  }
  if (rung.sentAt) {
    const sent = `Sent ${at(Date.parse(rung.sentAt))} by ${rung.channel === 'phone' ? 'phone call (logged)' : 'SMS (simulated)'}`
    if (rung.targetMs === null) return sent
    return rung.state === 'overdue'
      ? `${sent} · acknowledgement target ${at(rung.targetMs)} passed ${formatDuration((now - rung.targetMs) / 60000)} ago`
      : `${sent} · acknowledgement target ${at(rung.targetMs)}`
  }
  switch (rung.state) {
    case 'overdue':
      return `First-message target was ${at(rung.targetMs)} · overdue ${formatDuration((now - rung.targetMs) / 60000)}`
    case 'due':
      return rung.targetMs === null
        ? 'Its turn: the earlier rung has not been acknowledged in time.'
        : `Send by ${at(rung.targetMs)}`
    case 'waiting':
      return rung.targetMs === null
        ? 'Waits until the earlier rung has been sent.'
        : `Becomes due if the earlier rung is not acknowledged by ${at(rung.targetMs)}`
    default:
      return 'Not needed: KFS has acknowledged, or the incident is closed.'
  }
}

/**
 * The KFS ladder for one incident: the illustrative text message, and one row
 * per rung with its target, its state and the two ways to record contact. The
 * SMS is simulated: nothing leaves the browser.
 */
export default function EscalationLadder({ detail }) {
  const { act, now } = useConservation()
  const { notice, errors, run } = useActionRunner(act)
  const { incident, ladder, sms, smsMax } = detail
  const open = incident.status !== 'closed'
  const rule = escalationOf(incident.type)
  const gsmSafe = GSM_SAFE.test(sms)

  const send = (rung, channel) =>
    run(
      rung.rung,
      { type: 'SEND_ESCALATION', payload: { incidentId: incident.incidentId, rung: rung.rung, channel } },
      () => (channel === 'sms' ? COPY.smsSent : `Phone call to ${rung.label} logged.`),
    )

  return (
    <Panel
      title="Escalation to KFS"
      lede={`KFS enforces on gazetted land; NTZDC is the custodian. Targets for this type: first message within ${formatDuration(rule.firstMessageMin)}${rule.ackMin === null ? '' : `, acknowledgement within ${formatDuration(rule.ackMin)}`}.`}
      actions={<PrototypeTag label="Proposed policy" />}
    >
      {ladder.allRungsSentNoAck && (
        <Callout tone="critical" role="alert" title={COPY.phoneKfs} className="mb-4">
          Every rung has been messaged and none has acknowledged within its target.
        </Callout>
      )}

      <div className="rounded-xl border border-line bg-paper-sunk/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={CAPTION}>Message to KFS</p>
          <Marker>{COPY.illustrativeSms}</Marker>
        </div>
        <p className="mt-2 break-words rounded-lg border border-line bg-card p-3 font-mono text-[12.5px] leading-relaxed text-ink" data-testid="sms-text">
          {sms}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-ink-muted">
          <span className={sms.length > smsMax ? 'text-critical' : ''}>
            {sms.length}/{smsMax}
          </span>
          {gsmSafe ? (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
              GSM-safe
            </span>
          ) : (
            <span className="text-critical">Not GSM-safe</span>
          )}
          <span>{COPY.illustrativeSms}</span>
        </div>
      </div>

      <ol className="mt-4 space-y-3">
        {ladder.rungs.map((rung, index) => {
          const sendable = open && !rung.sentAt && rung.state !== 'not_needed'
          return (
            <li key={rung.rung} className="rounded-xl border border-line p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink">
                    <span className="mr-2 font-mono text-ink-faint">{index + 1}</span>
                    {rung.label}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">{rungNote(rung, now)}</p>
                </div>
                <StatusPill status={RUNG_STATE_LABEL[rung.state]} tone={RUNG_STATE_TONE[rung.state]} />
              </div>
              {sendable && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className={BTN_SECONDARY} onClick={() => send(rung, 'sms')} aria-label={`Send SMS to ${rung.label}`}>
                    <Send className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                    Send SMS
                  </button>
                  <button type="button" className={BTN_SMALL} onClick={() => send(rung, 'phone')} aria-label={`Log phone call to ${rung.label}`}>
                    <Phone className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                    Log phone call
                  </button>
                </div>
              )}
              {errors[rung.rung] && (
                <p role="alert" className={ERROR}>
                  {errors[rung.rung]}
                </p>
              )}
            </li>
          )
        })}
      </ol>
      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-faint">
        The officer may send any rung early; the labels only follow the schedule. Once any rung acknowledges, the rest are not
        needed. Times are EAT.
      </p>
      <Confirmation message={notice} className="mt-2" />
    </Panel>
  )
}
