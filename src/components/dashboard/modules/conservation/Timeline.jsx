import { formatEat } from '../../../../lib/conservation/labels'

const DOT = {
  report: 'bg-line-strong',
  sent: 'bg-emerald-700',
  ack: 'bg-emerald-500',
  closed: 'bg-ink-muted',
}

/**
 * What happened to an incident, oldest first, in EAT: the reports merged into
 * it (a channel each, never an identity), the messages sent to KFS, KFS's
 * acknowledgements and the closing. Officer actions taken in this session are
 * listed beneath, from the activity log.
 */
export default function Timeline({ events, sessionActions }) {
  return (
    <div>
      <ol className="relative space-y-3.5 border-l border-line pl-5">
        {events.map((event, i) => (
          <li key={`${event.at}-${i}`} className="relative">
            <span
              className={'absolute -left-[1.62rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card ' + DOT[event.kind]}
              aria-hidden="true"
            />
            <p className="font-mono text-[11px] text-ink-faint">{formatEat(event.at, 'datetime')} EAT</p>
            <p className="text-[13px] text-ink">{event.text}</p>
          </li>
        ))}
      </ol>
      {sessionActions.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">Officer actions this session</p>
          <ul className="mt-2 space-y-1.5">
            {sessionActions.map((entry) => (
              <li key={entry.ref} className="text-[12.5px] text-ink-muted">
                <span className="font-mono text-[11px] text-ink-faint">{entry.when}</span> · {entry.event}
                <span className="font-mono text-[11px] text-ink-faint"> · {entry.ref}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
