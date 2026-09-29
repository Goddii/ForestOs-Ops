const TONES = {
  info: 'border-[#c3dcda] bg-[#dfeceb] text-[#3d6b67]',
  warn: 'border-amber-700/25 bg-[#fdf4e7] text-amber-700',
  critical: 'border-critical/25 bg-critical-soft text-critical',
  positive: 'border-[#cfe4d6] bg-[#eef6f1] text-emerald-800',
}

/**
 * A boxed note in the console's own callout style (the teal "why" box on the
 * Zone Manager screens). Use `role="alert"` for a message that must be heard
 * straight away, such as a blocker.
 */
export default function Callout({ tone = 'info', title, children, role, className = '' }) {
  return (
    <div role={role} className={'rounded-xl border p-4 ' + (TONES[tone] ?? TONES.info) + ' ' + className}>
      {title && <p className="text-[12.5px] font-semibold leading-snug">{title}</p>}
      <div className={'text-[11.5px] leading-relaxed ' + (title ? 'mt-1' : '')}>{children}</div>
    </div>
  )
}
