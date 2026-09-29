import { Satellite } from 'lucide-react'
import { StatusPill } from '../../DashboardKit'
import { AGREEMENT_LABEL, AGREEMENT_TONE } from '../../../../lib/conservation/labels'

/**
 * Ground agreement between a ground report and a satellite signal:
 * Both, Ground only (on incidents) or Satellite only (on alerts). Nothing is
 * drawn for a type the satellite cannot see.
 */
export default function AgreementPill({ value }) {
  if (!value) return null
  return (
    <span className="inline-flex items-center gap-1" title="Ground agreement between the ground report and the satellite">
      <Satellite className="h-3 w-3 text-ink-faint" strokeWidth={2} aria-hidden="true" />
      <span className="sr-only">Ground agreement: </span>
      <StatusPill status={AGREEMENT_LABEL[value]} tone={AGREEMENT_TONE[value]} />
    </span>
  )
}
