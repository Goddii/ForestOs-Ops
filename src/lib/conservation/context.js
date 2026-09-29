// The Conservation Officer context and its hook. Kept apart from the Provider
// component so that the component file exports only a component (fast refresh),
// and so no screen imports the Provider to read state.
//
// `ctx` carries:
//   now    demo time in epoch milliseconds
//   scope  the account's scope: { level: 'region', regionId } | { level: 'national' }
//   state  the reducer state: claims, incidents, alerts, survivalChecks, tasks,
//          patrolLogs, exports, activity, seq
//   ref    frozen reference data (zones, belts, segments, plots, mixes, ladder,
//          sentinel, roles, regions)
//   act    act({ type, payload }) → { ok: true, result } | { ok: false, error }
//   clock  { advance(ms), reset() }
// Selectors take `ctx` as their first argument.

import { createContext, useContext } from 'react'

export const ConservationContext = createContext(null)

/** The Conservation Officer context. Only valid inside `ConservationLayout`. */
export function useConservation() {
  const ctx = useContext(ConservationContext)
  if (!ctx) throw new Error('useConservation must be used inside the Conservation Officer layout.')
  return ctx
}
