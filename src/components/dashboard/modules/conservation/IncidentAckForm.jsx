import { useState } from 'react'
import { Panel } from '../../DashboardKit'
import { useConservation } from '../../../../lib/conservation/context'
import { KFS_CHANNEL_LABEL, formatEat } from '../../../../lib/conservation/labels'
import Confirmation from './Confirmation'
import { useActionRunner } from './hooks'
import { BTN_PRIMARY, ERROR, HINT, INPUT, LABEL, fieldProps } from './ui'

/**
 * Records that KFS acknowledged a rung: which rung (only rungs already sent),
 * how (SMS reply or phone), when (EAT; blank means now), and an optional KFS
 * reference and reply. Free text is for references and replies, never names.
 */
export default function IncidentAckForm({ detail }) {
  const { act, now } = useConservation()
  const { notice, errors, run } = useActionRunner(act)
  const { incident } = detail
  const [rung, setRung] = useState('')
  const [channel, setChannel] = useState('sms')
  const [time, setTime] = useState('')
  const [kfsRef, setKfsRef] = useState('')
  const [reply, setReply] = useState('')

  const waiting = detail.sentRungs
  const chosen = rung && waiting.some((r) => r.rung === rung) ? rung : (waiting[0]?.rung ?? '')
  const open = incident.status !== 'closed'

  const submit = (event) => {
    event.preventDefault()
    run(
      'ack',
      {
        type: 'RECORD_ACK',
        payload: {
          incidentId: incident.incidentId,
          rung: chosen,
          ackChannel: channel,
          // The field is in EAT whatever the browser's own time zone is.
          at: time ? Date.parse(`${time}:00+03:00`) : undefined,
          kfsRef,
          note: reply,
        },
      },
      () => `KFS acknowledgement recorded on ${incident.incidentId}.`,
      () => {
        setRung('')
        setTime('')
        setKfsRef('')
        setReply('')
      },
    )
  }

  return (
    <Panel title="Record a KFS acknowledgement" lede="When KFS replies by SMS or phone, record it here. Any acknowledgement ends the chase.">
      {open && waiting.length > 0 ? (
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ack-rung" className={LABEL}>
              Rung that acknowledged
            </label>
            <select id="ack-rung" value={chosen} onChange={(event) => setRung(event.target.value)} className={INPUT}>
              {waiting.map((r) => (
                <option key={r.rung} value={r.rung}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ack-channel" className={LABEL}>
              How KFS replied
            </label>
            <select id="ack-channel" value={channel} onChange={(event) => setChannel(event.target.value)} className={INPUT}>
              <option value="sms">{KFS_CHANNEL_LABEL.sms} reply</option>
              <option value="phone">{KFS_CHANNEL_LABEL.phone}</option>
            </select>
          </div>
          <div>
            <label htmlFor="ack-time" className={LABEL}>
              Time of the reply (EAT)
            </label>
            <input
              {...fieldProps('ack-time', errors.ack, true)}
              type="datetime-local"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className={INPUT}
            />
            <p id="ack-time-hint" className={HINT}>
              Leave blank for now ({formatEat(now, 'datetime')} EAT).
            </p>
          </div>
          <div>
            <label htmlFor="ack-ref" className={LABEL}>
              KFS reference (optional)
            </label>
            <input
              id="ack-ref"
              type="text"
              value={kfsRef}
              onChange={(event) => setKfsRef(event.target.value)}
              autoComplete="off"
              aria-describedby="ack-ref-hint"
              className={INPUT}
            />
            <p id="ack-ref-hint" className={HINT}>
              Free text, for example a KFS incident number. No personal names.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ack-reply" className={LABEL}>
              What KFS said (optional)
            </label>
            <input
              id="ack-reply"
              type="text"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              autoComplete="off"
              aria-describedby="ack-reply-hint"
              className={INPUT}
            />
            <p id="ack-reply-hint" className={HINT}>
              A short reply such as “Ranger team dispatched”. No personal names or phone numbers.
            </p>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className={BTN_PRIMARY}>
              Record acknowledgement
            </button>
            {errors.ack && (
              <p id="ack-time-error" role="alert" className={ERROR}>
                {errors.ack}
              </p>
            )}
          </div>
        </form>
      ) : (
        <p className="text-[13px] text-ink-muted">
          {!open
            ? 'This incident is closed.'
            : incident.escalations.length === 0
              ? 'Send a message to KFS first. There is nothing to acknowledge yet.'
              : 'No message is waiting for an acknowledgement.'}
        </p>
      )}
      <Confirmation message={notice} className="mt-3" />
    </Panel>
  )
}
