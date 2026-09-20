// Shared presentational primitives for the ESG portal — the light
// "operations console" surface. Green is the portal accent (buttons, bars,
// positive data); amber is reserved for semantic warnings only.

import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight, ArrowUp, ChevronsUpDown } from 'lucide-react'

const CARD_BORDER = 'border border-emerald-900/10'

// Stroke / area-fill colours keyed to the emerald + amber tokens (emerald-600
// #059669, amber-700 #7c5322, ink-muted #333e37).
const TREND_STROKE = { ink: '#333e37', emerald: '#059669', amber: '#7c5322' }
const TREND_FILL = {
  ink: 'rgba(51,62,55,0.12)',
  emerald: 'rgba(5,150,105,0.16)',
  amber: 'rgba(124,83,34,0.14)',
}

/** Section wrapper: title, optional lede, an actions slot, and a body. */
export function Panel({ title, lede, actions, children, className = '' }) {
  return (
    <section
      className={'rounded-xl bg-card p-5 shadow-card sm:p-6 ' + CARD_BORDER + ' ' + className}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-sans text-lg font-semibold leading-tight tracking-tight text-ink">{title}</h3>
          {lede && (
            <p className="mt-1 max-w-[60ch] text-[13px] leading-relaxed text-ink-muted">{lede}</p>
          )}
        </div>
        {actions}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

const ALERT_TONE = {
  default: 'border-emerald-900/10 bg-card',
  warn: 'border-amber-700/25 bg-[#fdf4e7]',
  critical: 'border-critical/25 bg-critical-soft',
  info: 'border-[#c3dcda] bg-[#dfeceb]',
  positive: 'border-[#cfe4d6] bg-[#eef6f1]',
}

/**
 * A single callout row — frames.html's "needs attention" card: a bold lead
 * line, a muted detail line, and an optional trailing status pill. `tone`
 * picks the card fill (`default` | `warn` | `critical` | `info` | `positive`).
 */
export function AlertCard({ title, detail, tag, tagTone, tone = 'default', className = '' }) {
  return (
    <div className={'rounded-xl border p-3.5 ' + (ALERT_TONE[tone] ?? ALERT_TONE.default) + ' ' + className}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold leading-snug text-ink">{title}</p>
          {detail && <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{detail}</p>}
        </div>
        {tag && <StatusPill status={tag} tone={tagTone} />}
      </div>
    </div>
  )
}

/** Small monospaced up/down change pill. Direction is announced, not glyph-only. */
export function DeltaPill({ label, dir = 'up' }) {
  const up = dir === 'up'
  const Icon = up ? ArrowUp : ArrowDown
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums ' +
        (up
          ? 'border-emerald-600/20 bg-emerald-600/[0.10] text-emerald-700'
          : 'border-amber-700/25 bg-amber-500/[0.08] text-amber-700')
      }
    >
      <Icon className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />
      <span className="sr-only">{up ? 'Up' : 'Down'}: </span>
      {label}
    </span>
  )
}

/** Compact inline sparkline for KPI cards, with a soft gradient area fill. */
export function MiniSparkline({ values, tone = 'ink', width = 84, height = 26 }) {
  const gradientId = useId()
  if (!values || values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const step = width / (values.length - 1)
  const stroke = TREND_STROKE[tone] ?? TREND_STROKE.ink
  const fill = TREND_FILL[tone] ?? TREND_FILL.ink
  const coords = values.map(
    (v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / span) * (height - 4) - 2).toFixed(1)}`,
  )
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-6 w-[84px] shrink-0"
      role="img"
      aria-label="Recent trend"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${coords.join(' ')} ${width},${height}`} fill={`url(#${gradientId})`} />
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  )
}

/**
 * Top-of-portal KPI tile: mono label, crisp figure, and — in its right slot —
 * either a `trend` sparkline or a `share` (0-1) progress mark, so the tile is
 * never a lone figure in an empty box. An optional `icon` (a Lucide component)
 * renders as a tone-tinted chip beside the label; an optional `to` turns the
 * whole tile into a link (with a trailing arrow) into the screen that explains
 * the figure — only pass it when such a screen actually exists.
 */
export function StatTile({ label, value, unit, delta, trend, share, note, tone = 'default', icon: Icon, to }) {
  const valueColor = tone === 'positive' ? 'text-emerald-700' : 'text-ink'
  const warn = tone === 'warn'
  const critical = tone === 'critical'
  const markTone = critical ? 'bg-critical' : warn ? 'bg-amber-500' : 'bg-emerald-600'
  const noteColor = critical ? 'text-critical' : warn ? 'text-amber-700' : 'text-emerald-700'
  const chipTone = critical
    ? 'bg-critical-soft text-critical'
    : warn
      ? 'bg-amber-500/[0.12] text-amber-700'
      : 'bg-emerald-600/[0.10] text-emerald-700'
  const Wrapper = to ? Link : 'div'
  return (
    <Wrapper
      {...(to ? { to } : {})}
      className={
        'flex flex-col rounded-lg bg-card p-4 shadow-card transition-colors ' +
        (critical
          ? 'border border-critical/25'
          : warn
            ? 'border border-amber-700/25'
            : CARD_BORDER) +
        (to ? ' hover:border-emerald-600/30' : '')
      }
    >
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">
          {(warn || critical) && <span className={'h-1.5 w-1.5 rounded-full ' + markTone} aria-hidden="true" />}
          {label}
        </p>
        {Icon && (
          <span className={'grid h-7 w-7 shrink-0 place-items-center rounded-lg ' + chipTone} aria-hidden="true">
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className={'font-sans text-[1.9rem] font-bold leading-none tracking-tight tabular-nums ' + valueColor}>{value}</p>
        {trend ? (
          <MiniSparkline values={trend} tone={critical ? 'amber' : warn ? 'amber' : 'emerald'} />
        ) : typeof share === 'number' ? (
          <span
            className="mb-1 h-1.5 w-[72px] shrink-0 overflow-hidden rounded-full bg-line-strong"
            role="img"
            aria-label={`${Math.round(share * 100)} percent`}
          >
            <span
              className={'block h-full rounded-full ' + markTone}
              style={{ width: `${Math.max(4, Math.min(100, share * 100))}%` }}
            />
          </span>
        ) : null}
      </div>
      {note && <p className={'mt-2 text-[10.5px] ' + noteColor}>{note}</p>}
      {(delta || unit || to) && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {delta && <DeltaPill label={delta.label} dir={delta.dir} />}
            {unit && <span className="text-[11px] text-ink-muted">{unit}</span>}
          </div>
          {to && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" strokeWidth={2} aria-hidden="true" />}
        </div>
      )}
    </Wrapper>
  )
}

/** Labelled horizontal meter, value shown as a fraction of `max`. */
export function BarMeter({ label, value, max, display, tone = 'emerald' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const fill =
    tone === 'amber'
      ? 'bg-amber-500'
      : tone === 'river'
        ? 'bg-river-500'
        : tone === 'muted'
          ? 'bg-ink-faint/60'
          : 'bg-emerald-600'
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="text-ink-muted">{label}</span>
        <span className="font-mono tabular-nums text-ink">{display ?? value}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line-strong">
        <div className={'h-full rounded-full ' + fill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/**
 * Target-vs-actual bar (a bullet chart). `value` fills the track, `target` is a
 * tick on the same scale — so the gap reads on one row instead of two lists.
 */
export function BulletBar({ label, value, target, max, display, targetLabel, behind }) {
  const clamp = (n) => Math.max(0, Math.min(100, (n / max) * 100))
  const isBehind = behind ?? value < target
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="text-ink-muted">{label}</span>
        <span className="font-mono tabular-nums text-ink">{display ?? value}</span>
      </div>
      <div className="relative mt-1.5 h-2 w-full overflow-hidden rounded-full bg-line-strong">
        <div
          className={'h-full rounded-full ' + (isBehind ? 'bg-amber-500' : 'bg-emerald-600')}
          style={{ width: `${clamp(value)}%` }}
        />
        <span
          className="absolute top-1/2 h-3 w-[2px] -translate-y-1/2 rounded-full bg-ink"
          style={{ left: `${clamp(target)}%` }}
          role="img"
          aria-label={targetLabel ?? `Target ${target}`}
        />
      </div>
    </div>
  )
}

/** Inline SVG line chart for a numeric series, with a soft gradient area fill. */
export function Sparkline({ values, width = 240, height = 56, tone = '#059669', fill = 'rgba(5,150,105,0.16)' }) {
  const gradientId = useId()
  if (!values || values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const step = width / (values.length - 1)
  const coords = values.map(
    (v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / span) * (height - 8) - 4).toFixed(1)}`,
  )
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-14 w-full"
      role="img"
      aria-label="Trend"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${coords.join(' ')} ${width},${height}`}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={tone}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={(i * step).toFixed(1)}
          cy={(height - ((v - min) / span) * (height - 8) - 4).toFixed(1)}
          r={i === values.length - 1 ? 3 : 1.5}
          fill={tone}
        />
      ))}
    </svg>
  )
}

/**
 * Small tag marking a surface as prototype / illustrative data. The DESIGN
 * north star and the Forest Line PRD both require that simulated conservation
 * and financial figures never read as verified real-world evidence.
 */
export function PrototypeTag({ label = 'Prototype data', className = '' }) {
  return (
    <span
      className={
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-paper-sunk px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint ' +
        className
      }
    >
      <span className="h-1.5 w-1.5 rounded-full bg-ink-faint/50" aria-hidden="true" />
      {label}
    </span>
  )
}

/**
 * "Verified Data → AI → Human Understanding" (Forest Line PRD): a collapsible
 * plain-language reading of the verified figures already on the page. `lines`
 * are pre-composed from the page's own data — this is not a live model call and
 * never asserts a new measurement. `explain` is the seam where a real assistant
 * request would slot in later.
 */
export function ExplainPanel({ lines, className = '' }) {
  return (
    <details
      className={
        'group rounded-xl border border-emerald-900/10 bg-paper-sunk/50 [&_summary]:list-none ' + className
      }
    >
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted transition-colors hover:text-ink">
        <ChevronsUpDown className="h-3.5 w-3.5 text-line-strong" strokeWidth={2} aria-hidden="true" />
        Read this in plain language
      </summary>
      <div className="border-t border-line px-4 py-3.5">
        {lines.map((line, i) => (
          <p key={i} className="mt-2 max-w-[72ch] text-[13px] leading-relaxed text-ink first:mt-0">
            {line}
          </p>
        ))}
        <p className="mt-3 border-t border-line pt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
          A plain-language reading of the verified figures above — not a new measurement or claim.
        </p>
      </div>
    </details>
  )
}

/** Page header for a module: bold deep-green title + a mono context line. */
export function ModuleHeader({ title, sub, actions, prototype = false }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h2 className="font-sans text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl">{title}</h2>
          {prototype && <PrototypeTag />}
        </div>
        {sub && (
          <p className="mt-1 max-w-[64ch] font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
            {sub}
          </p>
        )}
      </div>
      {actions}
    </header>
  )
}

/**
 * Compact data table. `columns` = [{ key, label, align?, mono?, sortAccessor? }].
 * When `sortable`, headers become buttons that cycle asc → desc; `sortAccessor`
 * lets a rendered cell sort on a raw value. `csvName` adds a Download CSV action.
 */
export function DataTable({ columns, rows, renderCell, sortable = false, csvName }) {
  const [sort, setSort] = useState(null) // { key, dir }

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    const get = (r) => (col?.sortAccessor ? col.sortAccessor(r) : r[sort.key])
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = get(a)
      const bv = get(b)
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [rows, sort, columns])

  const toggleSort = (key) =>
    setSort((prev) =>
      prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    )

  const exportCsv = () => {
    const head = columns.map((c) => c.label || c.key).join(',')
    const body = sorted
      .map((r) =>
        columns
          .map((c) => {
            const v = c.sortAccessor ? c.sortAccessor(r) : r[c.key]
            return `"${String(v ?? '').replace(/"/g, '""')}"`
          })
          .join(','),
      )
      .join('\n')
    const blob = new Blob([head + '\n' + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${csvName}.csv`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div>
      {csvName && (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-md border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            Download CSV
          </button>
        </div>
      )}
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[520px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-line">
              {columns.map((col) => {
                const active = sort?.key === col.key
                const head = (
                  <span className={'inline-flex items-center gap-1 ' + (col.align === 'right' ? 'flex-row-reverse' : '')}>
                    {col.label}
                    {sortable && (
                      <ChevronsUpDown
                        className={'h-3 w-3 ' + (active ? 'text-emerald-700' : 'text-line-strong')}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                )
                return (
                  <th
                    key={col.key}
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={
                      'py-2 pr-4 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint ' +
                      (col.align === 'right' ? 'text-right' : 'text-left')
                    }
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="transition-colors hover:text-ink"
                      >
                        {head}
                      </button>
                    ) : (
                      head
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={row.id ?? i} className="border-b border-line last:border-0">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={
                      'py-2.5 pr-4 ' +
                      (col.align === 'right' ? 'text-right ' : '') +
                      (col.mono ? 'font-mono tabular-nums text-ink-muted' : 'text-ink')
                    }
                  >
                    {renderCell ? renderCell(col.key, row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const PILL_TONE = {
  positive: 'border-emerald-600/30 bg-emerald-600/[0.10] text-emerald-700',
  warn: 'border-amber-700/30 bg-amber-500/[0.12] text-amber-700',
  critical: 'border-critical/30 bg-critical-soft text-critical',
  neutral: 'border-line-strong bg-paper-sunk text-ink-muted',
}

const STATUS_TONE = {
  clear: 'positive', compliant: 'positive', live: 'positive', drawn: 'positive',
  paid: 'positive', completed: 'positive', resolved: 'positive', 'on track': 'positive',
  'on target': 'positive', approved: 'positive', active: 'positive', passed: 'positive',
  verified: 'positive', 'outcome recorded': 'positive', healthy: 'positive', ok: 'positive',
  clean: 'positive', both: 'positive',
  watch: 'warn', flagged: 'warn', full: 'warn', overdue: 'warn', open: 'warn',
  rejected: 'warn', 'at risk': 'warn', escalated: 'warn', pending: 'warn', degraded: 'warn',
  investigate: 'warn', 'id check': 'warn', 'awaiting attestation': 'warn',
  below: 'critical', critical: 'critical', now: 'critical', bad: 'critical', review: 'critical',
}

/** Status pill. Resolves a tone by keyword; unknown statuses read as neutral. */
export function StatusPill({ status, tone }) {
  const key = String(status).toLowerCase()
  const resolved = tone ?? STATUS_TONE[key] ?? 'neutral'
  return (
    <span
      className={
        'inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ' +
        (PILL_TONE[resolved] ?? PILL_TONE.neutral)
      }
    >
      {status}
    </span>
  )
}
