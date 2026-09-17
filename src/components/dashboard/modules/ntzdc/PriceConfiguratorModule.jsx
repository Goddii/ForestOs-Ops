import { useMemo, useState } from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import { ModuleHeader, Panel, StatTile } from '../../DashboardKit'
import { NTZDC } from '../../../../lib/dashboard/ntzdc'

const TODAY = '2026-09-07'
const STEP = 0.2

// Build-up bar: the premium components at usable scale (the base rate dwarfs
// them, so it's stated as context rather than drawn to scale).
function PremiumStack({ baseRate, components, values, premium, total }) {
  const segs = components.map((c, i) => ({
    label: c.label,
    value: values[c.key],
    cls: ['bg-emerald-800', 'bg-emerald-600', 'bg-emerald-400'][i % 3],
  }))
  return (
    <div>
      <div className="flex flex-col gap-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span>Base rate KES {baseRate}</span>
        <span>+ premium KES {premium.toFixed(1)}</span>
        <span className="font-semibold text-emerald-700">= payout KES {total.toFixed(1)}</span>
      </div>
      <div className="mt-1.5 flex h-3 w-full overflow-hidden rounded-full">
        {segs.map((s) => (
          <div
            key={s.label}
            className={s.cls}
            style={{ width: `${(s.value / premium) * 100}%` }}
            title={`${s.label}: +${s.value.toFixed(1)}`}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {segs.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
            <span className={'h-2 w-2 rounded-[2px] ' + s.cls} aria-hidden="true" />
            {s.label} · +{s.value.toFixed(1)}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stepper({ label, value, suffix, onNudge, step = STEP }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onNudge(-step)}
        aria-label={`Decrease ${label}`}
        className="grid h-5 w-5 place-items-center rounded border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
      >
        <Minus className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
      </button>
      <span className="w-24 text-right font-mono tabular-nums text-ink">
        {value.toFixed(1)} {suffix}
      </span>
      <button
        type="button"
        onClick={() => onNudge(step)}
        aria-label={`Increase ${label}`}
        className="grid h-5 w-5 place-items-center rounded border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
      >
        <Plus className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
      </button>
    </div>
  )
}

export default function PriceConfiguratorModule() {
  const { pricing } = NTZDC
  const [baseRate, setBaseRate] = useState(pricing.baseRateKes)
  const [values, setValues] = useState(() =>
    Object.fromEntries(pricing.components.map((c) => [c.key, c.kes])),
  )
  const [phase, setPhase] = useState('idle') // idle | confirm | published
  const [publishedDate, setPublishedDate] = useState(pricing.lastPublished)

  const premium = useMemo(
    () => pricing.components.reduce((sum, c) => sum + values[c.key], 0),
    [values, pricing.components],
  )
  const total = baseRate + premium
  const upliftPct = ((premium / baseRate) * 100).toFixed(1)
  const dirty =
    baseRate !== pricing.baseRateKes || pricing.components.some((c) => values[c.key] !== c.kes)

  const clampBase = (n) => Math.max(pricing.baseRateMin, Math.min(pricing.baseRateMax, n))
  const nudgeBase = (d) => {
    setBaseRate((b) => clampBase(+(b + d).toFixed(1)))
    setPhase('idle')
  }
  const nudge = (key, delta) => {
    const c = pricing.components.find((x) => x.key === key)
    setValues((prev) => ({
      ...prev,
      [key]: Math.max(c.min, Math.min(c.max, +(prev[key] + delta).toFixed(1))),
    }))
    setPhase('idle')
  }
  const setKey = (key, kes) => {
    setValues((prev) => ({ ...prev, [key]: kes }))
    setPhase('idle')
  }
  const resetToPublished = () => {
    setBaseRate(pricing.baseRateKes)
    setValues(Object.fromEntries(pricing.components.map((c) => [c.key, c.kes])))
    setPhase('idle')
  }
  const confirmPublish = () => {
    setPublishedDate(TODAY)
    setPhase('published')
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Price Configurator"
        sub={`Green-leaf farmgate schedule · published ${publishedDate}`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Base green leaf rate" value={`KES ${baseRate}`} unit="editable · tracks Mombasa" />
        <StatTile label="Total premium" value={`+${premium.toFixed(1)}`} unit="KES / kg" tone="positive" />
        <StatTile label="Total payout per kg" value={`KES ${total.toFixed(1)}`} unit="paid to the farmer" tone="positive" />
        <StatTile label="Uplift" value={`+${upliftPct}%`} unit="above base rate" tone="positive" />
      </div>

      <Panel
        title="Payout components"
        lede="Set the base rate and each premium; the total payout per kg recalculates live."
        actions={
          <div className="flex items-center gap-2">
            {dirty && phase !== 'confirm' && (
              <button
                type="button"
                onClick={resetToPublished}
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted transition-colors hover:text-ink"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={() => setPhase(phase === 'confirm' ? 'idle' : 'confirm')}
              disabled={phase === 'published' && !dirty}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              {phase === 'published' && !dirty ? 'Published' : 'Publish schedule'}
            </button>
          </div>
        }
      >
        {phase === 'confirm' && (
          <div className="mb-5 rounded-lg border border-emerald-700/30 bg-emerald-600/[0.08] p-3">
            <p className="text-[13px] text-ink">
              Publish the payout schedule at{' '}
              <span className="font-mono font-semibold text-emerald-700">KES {total.toFixed(1)}/kg</span>{' '}
              for the next collection cycle? This sets what every farmer in the block is paid.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={confirmPublish}
                className="rounded-full bg-emerald-700 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-800"
              >
                Confirm &amp; publish
              </button>
              <button
                type="button"
                onClick={() => setPhase('idle')}
                className="rounded-full border border-line px-3 py-1.5 text-[12px] text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {phase === 'published' && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-700/30 bg-emerald-600/[0.08] p-3" aria-live="polite">
            <Check className="h-4 w-4 shrink-0 text-emerald-700" strokeWidth={2.5} aria-hidden="true" />
            <p className="text-[13px] text-ink">
              Published (prototype) — effective next cycle at{' '}
              <span className="font-mono font-semibold text-emerald-700">KES {total.toFixed(1)}/kg</span>. Schedule date updated to {publishedDate}.
            </p>
          </div>
        )}

        <div className="space-y-5">
          {/* Base rate — editable */}
          <div>
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <label htmlFor="price-base" className="font-medium text-ink">
                Base Green Leaf Rate (KES)
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => nudgeBase(-1)}
                  aria-label="Decrease base rate"
                  className="grid h-5 w-5 place-items-center rounded border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
                >
                  <Minus className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                </button>
                <input
                  id="price-base"
                  type="number"
                  min={pricing.baseRateMin}
                  max={pricing.baseRateMax}
                  value={baseRate}
                  onChange={(e) => {
                    setBaseRate(clampBase(Number(e.target.value) || pricing.baseRateMin))
                    setPhase('idle')
                  }}
                  className="w-20 rounded border border-line bg-card px-2 py-1 text-right font-mono text-[13px] tabular-nums text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
                />
                <button
                  type="button"
                  onClick={() => nudgeBase(1)}
                  aria-label="Increase base rate"
                  className="grid h-5 w-5 place-items-center rounded border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
                >
                  <Plus className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                </button>
              </div>
            </div>
            <input
              type="range"
              min={pricing.baseRateMin}
              max={pricing.baseRateMax}
              step={1}
              value={baseRate}
              onChange={(e) => {
                setBaseRate(Number(e.target.value))
                setPhase('idle')
              }}
              aria-label="Base green leaf rate"
              className="mt-2 w-full accent-emerald-600"
            />
          </div>

          {pricing.components.map((c) => (
            <div key={c.key}>
              <div className="flex items-center justify-between gap-3 text-[13px]">
                <label htmlFor={`price-${c.key}`} className="text-ink-muted">
                  {c.label}
                </label>
                <Stepper
                  label={c.label}
                  value={values[c.key]}
                  suffix="KES/kg"
                  onNudge={(d) => nudge(c.key, d)}
                />
              </div>
              <input
                id={`price-${c.key}`}
                type="range"
                min={c.min}
                max={c.max}
                step={STEP}
                value={values[c.key]}
                onChange={(event) => setKey(c.key, Number(event.target.value))}
                className="mt-2 w-full accent-emerald-600"
              />
              {c.key === 'conservation' && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
                  Paid per <span className="text-ink-muted">verified</span> conservation event. Until a
                  plot&rsquo;s field + satellite checks clear, its farmers receive base + quality only;
                  the conservation premium is released on verification.
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            Payout build-up
          </p>
          <div className="mt-2">
            <PremiumStack
              baseRate={baseRate}
              components={pricing.components}
              values={values}
              premium={premium}
              total={total}
            />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-3xl tabular-nums text-emerald-700">
              KES {total.toFixed(1)}
            </span>
            <span className="font-mono text-[11px] text-ink-muted">total payout, per kg green leaf</span>
          </div>
        </div>
      </Panel>
    </div>
  )
}
