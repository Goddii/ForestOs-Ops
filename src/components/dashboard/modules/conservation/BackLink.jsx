import { ArrowLeft } from 'lucide-react'

/** The mono "back" control at the top of a detail view. Closing removes the selected record from the URL. */
export default function BackLink({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted transition-colors hover:text-ink"
    >
      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
      {children}
    </button>
  )
}
