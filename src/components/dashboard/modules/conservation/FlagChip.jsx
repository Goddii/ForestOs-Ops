import { StatusPill } from '../../DashboardKit'
import { FLAG_LABEL, FLAG_RULE } from '../../../../lib/conservation/labels'

/** One derived evidence flag as a warning pill. Flags are derived, never stored. */
export default function FlagChip({ flag }) {
  return (
    <span title={FLAG_RULE[flag]}>
      <StatusPill status={FLAG_LABEL[flag]} tone="warn" />
    </span>
  )
}
