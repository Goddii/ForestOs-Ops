import { Outlet } from 'react-router-dom'
import ConservationProvider from './ConservationProvider'

/**
 * The Conservation Officer's layout route. It keeps the provider mounted while
 * the officer moves between the seven screens, so the session state and the
 * demo clock survive navigation.
 */
export default function ConservationLayout() {
  return (
    <ConservationProvider>
      <Outlet />
    </ConservationProvider>
  )
}
