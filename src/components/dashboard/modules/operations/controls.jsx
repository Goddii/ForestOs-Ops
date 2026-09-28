// Small action controls shared by the Operations Manager's screens — the
// same emerald primary / hairline secondary button classes the Energy Ledger
// and Price Configurator already use, pulled into one place because every
// screen in this role carries actions rather than one or two.

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={
        'inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-700 px-3.5 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 ' +
        FOCUS +
        ' ' +
        className
      }
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={
        'inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-[12px] text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 ' +
        FOCUS +
        ' ' +
        className
      }
    >
      {children}
    </button>
  )
}

/** A native select with a visually-hidden or visible label. */
export function SelectField({ id, label, value, onChange, options, hideLabel = false, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'block text-[12px] font-medium text-ink-muted'}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={'w-full rounded border border-line bg-card px-2 py-1.5 text-[12.5px] text-ink ' + (hideLabel ? '' : 'mt-1 ') + FOCUS}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export const inputClass = 'mt-1 w-full rounded border border-line bg-card px-2 py-1.5 text-[12.5px] text-ink ' + FOCUS

/** A one-line "done (prototype)" confirmation shown after an action. */
export function DoneNote({ children }) {
  return (
    <p className="text-[11.5px] text-emerald-700" aria-live="polite">
      {children}
    </p>
  )
}
