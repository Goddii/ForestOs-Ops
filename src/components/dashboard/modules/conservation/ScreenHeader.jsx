import { ModuleHeader } from '../../DashboardKit'
import { useConservation } from '../../../../lib/conservation/context'
import { headerSub } from '../../../../lib/conservation/selectors'
import DemoClock from './DemoClock'

/**
 * The header every Conservation Officer screen opens with: the screen title, the
 * prototype tag, the region and demo-time line, and the demo clock. `sub`
 * replaces the default line where a screen needs to say more.
 */
export default function ScreenHeader({ title, sub, actions = null }) {
  const ctx = useConservation()
  return (
    <ModuleHeader
      title={title}
      sub={sub ?? headerSub(ctx)}
      prototype
      actions={
        <div className="flex flex-wrap items-start gap-2">
          {actions}
          <DemoClock />
        </div>
      }
    />
  )
}
