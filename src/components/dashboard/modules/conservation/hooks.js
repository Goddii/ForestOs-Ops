import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { COPY } from '../../../../lib/conservation/labels'

/**
 * A selected record held only in the query string (`?claim=VER-0142`), so it
 * can be linked to from the Hub, notifications and search. It is read on every
 * render and never copied into state: opening sets the parameter, closing
 * removes it.
 */
export function useSelectedParam(name) {
  const [params, setParams] = useSearchParams()
  const value = params.get(name)
  const open = (id) => setParams({ [name]: id })
  const close = () => setParams({})
  return [value, open, close]
}

/** Moves keyboard focus to the returned ref's element whenever `key` changes (opening a detail view). */
export function useFocusOn(key) {
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.focus()
  }, [key])
  return ref
}

/**
 * Runs actions against the provider and keeps the two things a screen shows
 * afterwards: the polite confirmation line, and the error for the control that
 * was refused (`errors[slot]`, shown next to it with `role="alert"`).
 *
 *   run(slot, { type, payload }, (result) => 'Approved VER-0140.', (result) => …)
 *
 * The confirmation always ends with the prototype note. Returns the outcome.
 */
export function useActionRunner(act) {
  const [notice, setNotice] = useState('')
  const [errors, setErrors] = useState({})
  const run = useCallback(
    (slot, action, describe, after) => {
      const out = act(action)
      if (!out.ok) {
        setErrors({ [slot]: out.error })
        return out
      }
      setErrors({})
      setNotice(`${describe(out.result)} ${COPY.saved}`)
      if (after) after(out.result)
      return out
    },
    [act],
  )
  const fail = useCallback((slot, message) => setErrors({ [slot]: message }), [])
  return { notice, errors, run, fail }
}

/**
 * Brings the returned ref's element into view once, when the screen opens with a
 * deep link (`?alert=…`) so the record is on screen, not somewhere below the fold.
 */
export function useScrollOnOpen(key) {
  const ref = useRef(null)
  const done = useRef(false)
  useEffect(() => {
    if (key && !done.current) ref.current?.scrollIntoView({ block: 'start' })
    done.current = true
  }, [key])
  return ref
}
