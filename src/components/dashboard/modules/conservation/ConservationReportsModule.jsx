import { useMemo, useState } from 'react'
import { Check, FileDown, ShieldAlert } from 'lucide-react'
import { DataTable, Panel } from '../../DashboardKit'
import { useConservation } from '../../../../lib/conservation/context'
import { EXPORT_PERIODS, EXPORT_TEMPLATES } from '../../../../lib/conservation/policy'
import {
  COPY,
  EXPORT_TEMPLATE_LABEL,
  formatCount,
  formatEat,
  periodLabel,
} from '../../../../lib/conservation/labels'
import { previewExport } from '../../../../lib/conservation/exports'
import { exportHistory } from '../../../../lib/conservation/selectors'
import Callout from './Callout'
import Confirmation from './Confirmation'
import Marker from './Marker'
import ScreenHeader from './ScreenHeader'
import { downloadCsv } from './download'
import { useActionRunner } from './hooks'
import { BTN_PRIMARY, CAPTION, ERROR, INPUT, LABEL } from './ui'

const PREVIEW_ROWS = 10

/** Who each file is for and what is in it. */
const TEMPLATE_INFO = {
  kfs_register: {
    audience: 'KFS county Ecosystem Conservator and station in-charge',
    contains: 'One row per incident whose first report falls in the period: type, severity, place, times, and who at KFS was told and when they answered.',
    defaultPeriod: 'last_30_days',
  },
  jaza_miti: {
    audience: 'KEFRI, for entry into the Jaza Miti tree-tracking app',
    contains: 'One row per species for each verified tree-planting claim whose verification date falls in the period: plot, position, species, trees and planting date. Jaza Miti has no public API, so this is a file for manual or bulk entry.',
    defaultPeriod: 'all_time',
  },
  monthly_return: {
    audience: 'NTZDC head office',
    contains: 'Thirteen measures for each zone in your region and for the region as a whole, in long format: claims, trees, survival, boundary, incidents and patrols.',
    defaultPeriod: 'month_to_date',
  },
}

const HISTORY_COLUMNS = [
  { key: 'exportId', label: 'Export' },
  { key: 'template', label: 'File' },
  { key: 'period', label: 'Period' },
  { key: 'rows', label: 'Rows', align: 'right', mono: true },
  { key: 'generatedAt', label: 'Generated' },
  { key: 'hash', label: 'Check value (prototype)', mono: true },
]

/** One export template: the period, a preview of the first rows, and Generate. */
function TemplateCard({ template, runner }) {
  const ctx = useConservation()
  const { now } = ctx
  const info = TEMPLATE_INFO[template]
  const [period, setPeriod] = useState(info.defaultPeriod)
  const { errors, run } = runner

  const preview = useMemo(
    () => previewExport({ template, period, scope: ctx.scope, now: ctx.now, state: ctx.state, ref: ctx.ref }),
    [template, period, ctx],
  )

  const generate = () =>
    run(
      template,
      { type: 'GENERATE_EXPORT', payload: { template, period, scope: ctx.scope } },
      (result) => `${result.filename} generated: ${formatCount(result.rows)} rows, check value ${result.hash}.`,
      (result) => downloadCsv(result.filename, result.csv),
    )

  const columns = preview.ok ? preview.table.header.map((h) => ({ key: h, label: h, mono: true })) : []
  const rows = preview.ok
    ? preview.table.rows.slice(0, PREVIEW_ROWS).map((cells, i) => ({ id: i, ...Object.fromEntries(preview.table.header.map((h, j) => [h, cells[j]])) }))
    : []

  return (
    <Panel
      title={EXPORT_TEMPLATE_LABEL[template]}
      lede={info.contains}
      actions={
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          For {info.audience}
        </span>
      }
    >
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor={`period-${template}`} className={LABEL}>
            Period
          </label>
          <select
            id={`period-${template}`}
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className={INPUT + ' min-w-56'}
          >
            {EXPORT_PERIODS.map((p) => (
              <option key={p} value={p}>
                {periodLabel(p, now)}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className={BTN_PRIMARY} disabled={!preview.ok} onClick={generate}>
          <FileDown className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
          Generate
        </button>
        <div className="min-h-11 py-2 text-[12.5px]">
          {preview.ok ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
              <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
              {COPY.noPersonalData}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium text-critical" role="alert">
              <ShieldAlert className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              {preview.error}
            </span>
          )}
        </div>
      </div>
      {errors[template] && (
        <p role="alert" className={ERROR}>
          {errors[template]}
        </p>
      )}

      <div className="mt-4 border-t border-line pt-4">
        <p className={CAPTION}>
          {preview.ok
            ? `${formatCount(preview.rows)} ${preview.rows === 1 ? 'row' : 'rows'} · preview of the first ${Math.min(PREVIEW_ROWS, preview.rows)}`
            : 'No preview'}
          <Marker>illustrative</Marker>
        </p>
        {preview.ok && preview.rows === 0 && <p className="mt-2 text-[13px] text-ink-muted">No rows fall in this period.</p>}
        {preview.ok && preview.rows > 0 && (
          <div className="mt-2 text-[11.5px] [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
            <DataTable columns={columns} rows={rows} renderCell={(key, row) => row[key]} />
          </div>
        )}
      </div>
    </Panel>
  )
}

export default function ConservationReportsModule() {
  const ctx = useConservation()
  const runner = useActionRunner(ctx.act)
  const history = useMemo(() => exportHistory(ctx), [ctx])

  return (
    <div className="space-y-5">
      <ScreenHeader title="Reports & Exports" />

      <Callout tone="warn" role="note" title="Prototype data">
        {COPY.mockNames}
      </Callout>

      {EXPORT_TEMPLATES.map((template) => (
        <TemplateCard key={template} template={template} runner={runner} />
      ))}

      <Panel
        title="Export history"
        lede="Every file generated, including this session. The list keeps a check value for each, never the content."
      >
        <DataTable
          columns={HISTORY_COLUMNS}
          rows={history.map((h) => ({ ...h, id: h.exportId }))}
          renderCell={(key, row) => {
            if (key === 'template') return EXPORT_TEMPLATE_LABEL[row.template]
            if (key === 'generatedAt') return `${formatEat(row.generatedAt, 'datetime')} EAT`
            if (key === 'rows') return formatCount(row.rows)
            return row[key]
          }}
        />
        <Confirmation message={runner.notice} className="mt-3" />
      </Panel>
    </div>
  )
}
