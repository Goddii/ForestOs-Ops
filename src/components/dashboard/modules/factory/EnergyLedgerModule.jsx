import { useState } from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import { DataTable, ModuleHeader, Panel } from '../../DashboardKit'
import { FACTORY } from '../../../../lib/dashboard/factoryManager'

const COLUMNS = [
  { key: 'periodStart', label: 'Period' },
  { key: 'readingType', label: 'Reading type' },
  { key: 'quantity', label: 'Quantity', align: 'right' },
  { key: 'costKes', label: 'Cost', align: 'right' },
  { key: 'sourceChannel', label: 'Source' },
]

// Priced reading types carry a `priceKey` into the pricing state below;
// solar generation and the production record have no purchase cost (self-
// generated, and made tea isn't an energy reading) so theirs is always null.
const READING_TYPES = [
  { value: 'Grid electricity', unit: 'kWh', priceKey: 'gridKesPerKwh', defaultSource: 'Manual · weighbridge office' },
  { value: 'Diesel', unit: 'litres', priceKey: 'dieselKesPerLitre', defaultSource: 'Manual · fuel log' },
  { value: 'Fuelwood', unit: 'm³', priceKey: 'fuelwoodKesPerM3', defaultSource: 'Manual · delivery note' },
  { value: 'Solar generation', unit: 'kWh', priceKey: null, defaultSource: 'Seeded · no ESP32 hardware yet' },
  { value: 'Made tea (production)', unit: 'kg', priceKey: null, defaultSource: 'Manual · production log' },
]

// Backed out from this file's own seeded September row (486,000 / 31,800,
// etc.) so a freshly recorded reading costs about what the readings already
// on file do, rather than introducing a second, disconnected set of rates.
const DEFAULT_PRICING = { gridKesPerKwh: 15.28, dieselKesPerLitre: 185.71, fuelwoodKesPerM3: 4000 }

const RATE_FIELDS = [
  { key: 'gridKesPerKwh', label: 'Grid electricity', suffix: 'KES/kWh', min: 5, max: 30, step: 0.1 },
  { key: 'dieselKesPerLitre', label: 'Diesel', suffix: 'KES/litre', min: 100, max: 260, step: 1 },
  { key: 'fuelwoodKesPerM3', label: 'Fuelwood', suffix: 'KES/m³', min: 2000, max: 6000, step: 50 },
]

function formatPeriod(isoDate) {
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function monthToPeriod(monthStr) {
  const [year, mon] = monthStr.split('-').map(Number)
  const periodStart = new Date(Date.UTC(year, mon - 1, 1)).toISOString().slice(0, 10)
  const periodEnd = new Date(Date.UTC(year, mon, 0)).toISOString().slice(0, 10)
  return { periodStart, periodEnd }
}

function RateControl({ field, value, onChange }) {
  const clamp = (n) => Math.max(field.min, Math.min(field.max, n))
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <label htmlFor={`rate-${field.key}`} className="text-ink-muted">
          {field.label}
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChange(clamp(+(value - field.step).toFixed(2)))}
            aria-label={`Decrease ${field.label} rate`}
            className="grid h-5 w-5 place-items-center rounded border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <Minus className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
          </button>
          <span className="w-28 text-right font-mono tabular-nums text-ink">
            {value.toFixed(2)} <span className="text-ink-faint">{field.suffix}</span>
          </span>
          <button
            type="button"
            onClick={() => onChange(clamp(+(value + field.step).toFixed(2)))}
            aria-label={`Increase ${field.label} rate`}
            className="grid h-5 w-5 place-items-center rounded border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <Plus className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
      </div>
      <input
        id={`rate-${field.key}`}
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${field.label} rate`}
        className="mt-2 w-full accent-emerald-600"
      />
    </div>
  )
}

// Every metered reading behind the Power & Energy screen's mix and cost
// figures — the same reading-type vocabulary as SolGrid's energy ledger
// (grid_electricity | diesel | fuelwood | solar_generation, plus the
// matched production record) with a per-row source channel, so a total on
// the dashboard can be traced back to what was actually recorded, when, and
// how it reached the system.
//
// Pricing and new readings are session-only, the same pattern
// PriceConfiguratorModule (Block Operations' farmgate rate screen) already
// uses: plain React state with a "Publish (prototype)" confirm step, no
// backend to write to — leaving this screen (or refreshing) forgets it.
export default function EnergyLedgerModule() {
  const { ledger, month } = FACTORY
  const [entries, setEntries] = useState(ledger.entries)

  const [pricing, setPricing] = useState(DEFAULT_PRICING)
  const [publishedPricing, setPublishedPricing] = useState(DEFAULT_PRICING)
  const [pricePhase, setPricePhase] = useState('idle') // idle | confirm | published
  const priceDirty = RATE_FIELDS.some((f) => pricing[f.key] !== publishedPricing[f.key])

  const [readingType, setReadingType] = useState(READING_TYPES[0].value)
  const [monthInput, setMonthInput] = useState('2026-10')
  const [quantity, setQuantity] = useState('')
  const [sourceChannel, setSourceChannel] = useState(READING_TYPES[0].defaultSource)
  const [recordedFlash, setRecordedFlash] = useState(false)

  const typeConfig = READING_TYPES.find((t) => t.value === readingType)
  const qtyNumber = Number(quantity)
  const previewCost =
    typeConfig.priceKey && qtyNumber > 0 ? Math.round(qtyNumber * publishedPricing[typeConfig.priceKey]) : null

  const handleTypeChange = (value) => {
    setReadingType(value)
    setSourceChannel(READING_TYPES.find((t) => t.value === value).defaultSource)
  }

  const handleRecord = (event) => {
    event.preventDefault()
    if (!qtyNumber || qtyNumber <= 0) return
    const { periodStart, periodEnd } = monthToPeriod(monthInput)
    const entry = {
      id: `ER-${monthInput}-${readingType.replace(/\s+/g, '').toUpperCase()}-${entries.length}`,
      periodStart,
      periodEnd,
      readingType,
      quantity: qtyNumber,
      unit: typeConfig.unit,
      costKes: previewCost,
      sourceChannel,
    }
    setEntries((prev) => [entry, ...prev])
    setQuantity('')
    setRecordedFlash(true)
    setTimeout(() => setRecordedFlash(false), 2500)
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Energy Ledger"
        sub={`${month} and prior · every metered reading behind the energy figures, for audit`}
        prototype
      />

      <Panel
        title="Energy pricing"
        lede="Rate per unit for each purchased source — used to cost any reading recorded below. Solar has no rate: it's self-generated, not bought."
        actions={
          <div className="flex items-center gap-2">
            {priceDirty && pricePhase !== 'confirm' && (
              <button
                type="button"
                onClick={() => {
                  setPricing(publishedPricing)
                  setPricePhase('idle')
                }}
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted transition-colors hover:text-ink"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={() => setPricePhase(pricePhase === 'confirm' ? 'idle' : 'confirm')}
              disabled={!priceDirty && pricePhase !== 'confirm'}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              Publish rates
            </button>
          </div>
        }
      >
        {pricePhase === 'confirm' && (
          <div className="mb-5 rounded-lg border border-emerald-700/30 bg-emerald-600/[0.08] p-3">
            <p className="text-[13px] text-ink">
              Publish these rates for readings recorded from now on? This is a prototype — nothing is
              written to a real backend, and the change is forgotten if you leave this screen.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPublishedPricing(pricing)
                  setPricePhase('published')
                }}
                className="rounded-full bg-emerald-700 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-800"
              >
                Confirm &amp; publish
              </button>
              <button
                type="button"
                onClick={() => setPricePhase('idle')}
                className="rounded-full border border-line px-3 py-1.5 text-[12px] text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {pricePhase === 'published' && !priceDirty && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-700/30 bg-emerald-600/[0.08] p-3" aria-live="polite">
            <Check className="h-4 w-4 shrink-0 text-emerald-700" strokeWidth={2.5} aria-hidden="true" />
            <p className="text-[13px] text-ink">Published (prototype) — new readings below will cost against these rates.</p>
          </div>
        )}

        <div className="space-y-5">
          {RATE_FIELDS.map((field) => (
            <RateControl
              key={field.key}
              field={field}
              value={pricing[field.key]}
              onChange={(v) => {
                setPricing((prev) => ({ ...prev, [field.key]: v }))
                setPricePhase('idle')
              }}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Record a reading" lede="Costed against the published rates above; added to the table below for this session only.">
        <form onSubmit={handleRecord} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <div>
            <label htmlFor="reading-type" className="block text-[12px] font-medium text-ink-muted">
              Reading type
            </label>
            <select
              id="reading-type"
              value={readingType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="mt-1 w-full rounded border border-line bg-card px-2 py-1.5 text-[13px] text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
            >
              {READING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="reading-month" className="block text-[12px] font-medium text-ink-muted">
              Period
            </label>
            <input
              id="reading-month"
              type="month"
              value={monthInput}
              onChange={(e) => setMonthInput(e.target.value)}
              className="mt-1 w-full rounded border border-line bg-card px-2 py-1.5 text-[13px] text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
            />
          </div>

          <div>
            <label htmlFor="reading-quantity" className="block text-[12px] font-medium text-ink-muted">
              Quantity ({typeConfig.unit})
            </label>
            <input
              id="reading-quantity"
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className="mt-1 w-full rounded border border-line bg-card px-2 py-1.5 text-right font-mono text-[13px] tabular-nums text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
            />
          </div>

          <div>
            <label htmlFor="reading-source" className="block text-[12px] font-medium text-ink-muted">
              Source channel
            </label>
            <input
              id="reading-source"
              type="text"
              value={sourceChannel}
              onChange={(e) => setSourceChannel(e.target.value)}
              className="mt-1 w-full rounded border border-line bg-card px-2 py-1.5 text-[13px] text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!qtyNumber || qtyNumber <= 0}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              Record
            </button>
            <span className="font-mono text-[11px] text-ink-muted">
              {previewCost !== null ? `KES ${previewCost.toLocaleString()}` : typeConfig.priceKey ? '—' : 'no cost'}
            </span>
          </div>
        </form>
        {recordedFlash && (
          <p className="mt-3 text-[12px] text-emerald-700" aria-live="polite">
            Recorded — this session only, not written anywhere real. See it at the top of the table below.
          </p>
        )}
      </Panel>

      <Panel
        title="Readings on file"
        lede="One row per metered period and source — grid, diesel, fuelwood, solar generation, and the matched production record."
      >
        <DataTable
          columns={COLUMNS}
          rows={entries}
          sortable
          csvName="ForestOS-factory-energy-ledger"
          renderCell={(key, row) => {
            if (key === 'periodStart') return formatPeriod(row.periodStart)
            if (key === 'quantity') return `${row.quantity.toLocaleString()} ${row.unit}`
            if (key === 'costKes') return row.costKes !== null ? `KES ${row.costKes.toLocaleString()}` : '—'
            return row[key]
          }}
        />
      </Panel>
    </div>
  )
}
