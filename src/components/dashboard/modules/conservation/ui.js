// Class-name constants shared by the Conservation Officer screens, so buttons,
// fields and labels look the same everywhere. They reuse the classes the
// existing modules use (see the Verification Queue detail this console
// replaces): emerald-700 for the primary action, hairline borders for the
// rest, amber only for a warning. Buttons and inputs are at least 44 px tall.

const BUTTON =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export const BTN_PRIMARY = BUTTON + ' bg-emerald-700 text-white shadow-sm hover:bg-emerald-800'
export const BTN_SECONDARY = BUTTON + ' border border-line text-ink-muted hover:border-line-strong hover:text-ink'
export const BTN_WARN = BUTTON + ' border border-amber-700/40 text-amber-700 hover:bg-amber-500/[0.10]'
export const BTN_CRITICAL = BUTTON + ' border border-critical/40 text-critical hover:bg-critical-soft'

/** The small mono button used for row actions and controls in a header. */
export const BTN_SMALL =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-line px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-50'

export const INPUT =
  'min-h-11 w-full rounded-lg border border-line bg-card px-3 py-2 text-[13px] text-ink placeholder:text-ink-faint focus-visible:border-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 aria-[invalid=true]:border-critical'

export const TEXTAREA = INPUT + ' resize-y leading-relaxed'

export const LABEL = 'block text-[12.5px] font-medium text-ink'
export const HINT = 'mt-1 text-[11.5px] leading-snug text-ink-muted'
export const ERROR = 'mt-1.5 text-[12px] font-medium leading-snug text-critical'

/** Mono uppercase caption used above values and in definition lists. */
export const CAPTION = 'font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint'

/** A link that wraps a card, with a visible focus ring. */
export const CARD_LINK =
  'block rounded-xl transition-shadow hover:shadow-card-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'

/** Attributes tying a control to its error and hint text. */
export function fieldProps(id, error, hint = false) {
  const described = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ')
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': described || undefined,
  }
}
