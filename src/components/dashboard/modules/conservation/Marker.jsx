/** A small tag marking a figure as inferred, derived, illustrative or proposed. */
export default function Marker({ children, title }) {
  return (
    <span
      title={title}
      className="ml-1.5 inline-block rounded border border-line-strong px-1 py-px align-middle font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint"
    >
      {children}
    </span>
  )
}
