/**
 * A segmented control made of real buttons with `aria-pressed`, so it is
 * operable by keyboard and announced correctly. `options` are
 * `{ value, label, count? }`.
 */
export default function Segmented({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">{label}</span>
      <div className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-paper-sunk/60 p-1">
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={
                'inline-flex min-h-11 items-center rounded-lg px-3 text-[12.5px] font-medium transition-colors ' +
                (active
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-ink-muted hover:bg-card hover:text-ink')
              }
            >
              {option.label}
              {option.count !== undefined && (
                <span className={'ml-1.5 tabular-nums ' + (active ? 'text-white/80' : 'text-ink-faint')}>{option.count}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
