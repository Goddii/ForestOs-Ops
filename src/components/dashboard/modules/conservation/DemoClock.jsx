import { useState } from 'react'
import { useConservation } from '../../../../lib/conservation/context'
import { formatEat } from '../../../../lib/conservation/labels'
import { BTN_SMALL } from './ui'

const QUARTER_HOUR_MS = 15 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

/**
 * The prototype's time control. The demo clock runs in real time from
 * 16 Sep 2026 07:12 EAT; these buttons move it forward so a deadline can be
 * seen to pass. Reset restores the seed data and the clock, after a confirm.
 */
export default function DemoClock() {
  const { now, clock } = useConservation()
  const [confirming, setConfirming] = useState(false)

  return (
    <div
      role="group"
      aria-label="Prototype control: demo clock"
      className="rounded-xl border border-line bg-card px-3 py-2 shadow-card sm:max-w-[22rem]"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">Prototype control</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="text-[12.5px] font-semibold tabular-nums text-ink">
          Demo time {formatEat(now, 'date')} {formatEat(now, 'time')} EAT
        </p>
        {confirming ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] text-ink-muted">Reset all changes and the clock?</span>
            <button
              type="button"
              className={BTN_SMALL}
              onClick={() => {
                clock.reset()
                setConfirming(false)
              }}
            >
              Yes, reset
            </button>
            <button type="button" className={BTN_SMALL} onClick={() => setConfirming(false)}>
              Keep
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" className={BTN_SMALL} onClick={() => clock.advance(QUARTER_HOUR_MS)}>
              +15 min
            </button>
            <button type="button" className={BTN_SMALL} onClick={() => clock.advance(HOUR_MS)}>
              +1 h
            </button>
            <button type="button" className={BTN_SMALL} onClick={() => setConfirming(true)}>
              Reset demo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
