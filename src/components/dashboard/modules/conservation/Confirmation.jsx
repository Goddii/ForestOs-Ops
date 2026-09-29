import { COPY } from '../../../../lib/conservation/labels'

/**
 * The polite, announced line every action ends with. It is always in the page so a
 * screen reader hears the message when it changes.
 */
export default function Confirmation({ message, className = '' }) {
  return (
    <p
      aria-live="polite"
      className={'min-h-5 font-mono text-[11px] leading-relaxed tracking-[0.04em] text-ink-muted ' + className}
    >
      {message || COPY.hint}
    </p>
  )
}
