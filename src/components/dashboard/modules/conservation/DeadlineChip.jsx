import { StatusPill } from '../../DashboardKit'
import { formatDuration } from '../../../../lib/conservation/labels'

/**
 * The next KFS target an open incident is up against: "First message due in
 * 50 h", "First message overdue 46 h", "Ack due in 1 min", "Ack overdue 12 min".
 * Nothing once the incident is acknowledged or closed. These are targets, not
 * statutory deadlines.
 */
export default function DeadlineChip({ deadline }) {
  if (!deadline) return null
  const subject = deadline.kind === 'first_message' ? 'First message' : 'Ack'
  const text = deadline.overdue
    ? `${subject} overdue ${formatDuration(-deadline.minutes)}`
    : `${subject} due in ${formatDuration(deadline.minutes)}`
  const tone = deadline.overdue ? 'critical' : deadline.minutes <= 15 ? 'warn' : 'neutral'
  return <StatusPill status={text} tone={tone} />
}
