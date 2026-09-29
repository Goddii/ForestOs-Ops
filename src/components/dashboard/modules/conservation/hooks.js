import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

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
