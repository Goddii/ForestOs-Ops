import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { search } from '../../lib/searchIndex'

/**
 * The panel only ever mounts while `open` is true (see `GlobalSearch` below),
 * so a fresh mount is itself the "reset query on open" — no effect needed to
 * force that; the focus-on-mount effect is a genuine one-time DOM side effect.
 */
function SearchPanel({ role, onClose }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const groups = search(role, query)
  const goTo = (to) => {
    if (!to) return
    navigate(to)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Search">
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="absolute inset-0 bg-forest-950/50 backdrop-blur-[2px]"
      />
      <div className="relative mx-auto mt-[12vh] w-full max-w-lg px-4">
        <div className="overflow-hidden rounded-xl border border-emerald-900/10 bg-card shadow-card-raised">
          <div className="flex items-center gap-2.5 border-b border-line px-4 py-3 focus-within:border-emerald-700/40">
            <Search className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2} aria-hidden="true" />
            <label htmlFor="global-search-input" className="sr-only">
              Search
            </label>
            <input
              ref={inputRef}
              id="global-search-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search farmer ID, batch, block, plot…"
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-transparent text-[14px] text-ink placeholder:text-ink-faint focus:outline-none"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="shrink-0 rounded-md p-1 text-ink-faint transition-colors hover:bg-paper-sunk hover:text-ink"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          <div className="max-h-[50vh] overflow-y-auto p-2" aria-live="polite">
            {query.trim() === '' && (
              <p className="px-3 py-6 text-center text-[13px] text-ink-faint">
                Start typing to search within {role.label.replace(/ View$/, '')}.
              </p>
            )}
            {query.trim() !== '' && groups.length === 0 && (
              <p className="px-3 py-6 text-center text-[13px] text-ink-faint">No results for “{query}”.</p>
            )}
            {groups.map((group) => (
              <div key={group.category} className="mb-1 last:mb-0">
                <p className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  {group.category}
                </p>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!item.to}
                    onClick={() => goTo(item.to)}
                    className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-paper-sunk disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent"
                  >
                    <span className="truncate text-[13px] font-medium text-ink">{item.label}</span>
                    <span className="shrink-0 truncate text-[11px] text-ink-faint">{item.meta}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Command-palette style global search. Opened from the topbar (or Cmd/Ctrl+K,
 * wired in Topbar.jsx) — results are scoped to what the signed-in role can
 * actually reach (see `lib/searchIndex.js`); this is not a system-wide index.
 */
export default function GlobalSearch({ role, open, onClose }) {
  if (!open) return null
  return <SearchPanel role={role} onClose={onClose} />
}
