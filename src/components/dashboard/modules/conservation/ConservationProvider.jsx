import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ROLES } from '../../../../lib/dashboard/roles'
import { CLOCK_START_MS, REF, SEED_STATE } from '../../../../lib/dashboard/conservation'
import { ConservationContext } from '../../../../lib/conservation/context'
import { reduce } from '../../../../lib/conservation/reducer'

const SCOPE = ROLES.find((role) => role.id === 'conservation').scope

// How often the demo clock catches up with real time.
const TICK_MS = 15 * 1000

/**
 * Owns the Conservation Officer session: the reducer state and the demo clock.
 * Reload resets everything; nothing is persisted. The demo clock starts at
 * 16 Sep 2026 07:12 EAT and runs forward in real time, plus whatever the
 * prototype control adds. The real clock is read only when the provider mounts,
 * in the interval callback and when the demo is reset — never while rendering.
 */
export default function ConservationProvider({ children }) {
  const [state, setState] = useState(SEED_STATE)
  // The latest state, so two actions in one event handler both see each other.
  const stateRef = useRef(SEED_STATE)
  const [mountedAt, setMountedAt] = useState(() => Date.now())
  const [elapsedMs, setElapsedMs] = useState(0)
  const [offsetMs, setOffsetMs] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setElapsedMs(Date.now() - mountedAt), TICK_MS)
    return () => clearInterval(id)
  }, [mountedAt])

  const now = CLOCK_START_MS + offsetMs + elapsedMs

  const act = useCallback(
    (action) => {
      const out = reduce(stateRef.current, action, now)
      if (out.error) return { ok: false, error: out.error }
      stateRef.current = out.state
      setState(out.state)
      return { ok: true, result: out.result }
    },
    [now],
  )

  const clock = useMemo(
    () => ({
      advance: (ms) => setOffsetMs((offset) => offset + ms),
      reset: () => {
        stateRef.current = reduce(stateRef.current, { type: 'RESET' }, CLOCK_START_MS).state
        setState(stateRef.current)
        setOffsetMs(0)
        setElapsedMs(0)
        setMountedAt(Date.now())
      },
    }),
    [],
  )

  const value = useMemo(() => ({ now, scope: SCOPE, state, ref: REF, act, clock }), [now, state, act, clock])

  return <ConservationContext.Provider value={value}>{children}</ConservationContext.Provider>
}
