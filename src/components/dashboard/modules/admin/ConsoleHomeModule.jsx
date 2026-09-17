import { Link } from 'react-router-dom'
import { Activity, FileDown, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react'
import { AlertCard, DeltaPill, ModuleHeader, Panel, Sparkline, StatTile, StatusPill } from '../../DashboardKit'
import { ADMIN } from '../../../../lib/dashboard/systemAdmin'

const PRIMARY_BUTTON =
  'inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800'

/** delta(series) → the last-vs-previous change, for a short "vs yesterday" pill. */
function delta(series) {
  const last = series[series.length - 1]
  const prev = series[series.length - 2]
  const diff = last - prev
  const pct = ((diff / prev) * 100).toFixed(1)
  return { diff, pct, dir: diff >= 0 ? 'up' : 'down' }
}

export default function ConsoleHomeModule() {
  const { asOf, zoneCount, blockCount, workerCount, kpis, integrations, needsAttention } = ADMIN
  const recordsDelta = delta(kpis.recordsTrend)
  const backlogDelta = delta(kpis.syncBacklogTrend)

  const passed = kpis.recordsToday - kpis.anomaliesOpen
  const funnel = [
    { label: 'Records ingested today', value: kpis.recordsToday, pct: 100 },
    { label: 'Passed validation', value: passed, pct: (passed / kpis.recordsToday) * 100 },
    { label: 'Flagged anomalies', value: kpis.anomaliesOpen, pct: (kpis.anomaliesOpen / kpis.recordsToday) * 100 },
    {
      label: 'Above agronomic ceiling',
      value: kpis.anomaliesAboveCeiling,
      pct: (kpis.anomaliesAboveCeiling / kpis.recordsToday) * 100,
    },
  ]

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="System overview"
        sub={`${zoneCount} zones · ${blockCount} blocks · ${workerCount.toLocaleString()} workers · ${asOf}`}
        prototype
        actions={
          <Link to="/app/admin/exports" className={PRIMARY_BUTTON}>
            <FileDown className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            Open exports
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Records today"
          value={kpis.recordsToday.toLocaleString()}
          note="tickets · claims · payments"
          delta={{ label: `${recordsDelta.diff >= 0 ? '+' : ''}${recordsDelta.diff} vs yesterday`, dir: recordsDelta.dir }}
          icon={Activity}
          trend={kpis.recordsTrend}
          to="/app/admin/audit"
        />
        <StatTile
          label="Sync backlog"
          value={kpis.syncBacklog}
          tone="warn"
          note={`${kpis.devicesOffline24h} devices offline > 24 h`}
          delta={{ label: `${backlogDelta.diff >= 0 ? '+' : ''}${backlogDelta.diff} vs yesterday`, dir: backlogDelta.dir }}
          icon={RefreshCw}
          trend={kpis.syncBacklogTrend}
          to="/app/admin/integrations"
        />
        <StatTile
          label="Anomalies open"
          value={kpis.anomaliesOpen}
          tone="warn"
          note={`${kpis.anomaliesAboveCeiling} above ceiling`}
          icon={TriangleAlert}
          trend={kpis.anomaliesTrend}
        />
        <StatTile
          label="Chain integrity"
          value={`${kpis.chainIntegrityPct}%`}
          tone="positive"
          note="no gaps in audit hash"
          icon={ShieldCheck}
          share={kpis.chainIntegrityPct / 100}
          to="/app/admin/audit"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          title="Records processed"
          lede="Daily intake across every synced device, last 7 days."
          className="lg:col-span-2"
          actions={<DeltaPill label={`${recordsDelta.diff >= 0 ? '+' : ''}${recordsDelta.pct}% vs yesterday`} dir={recordsDelta.dir} />}
        >
          <Sparkline values={kpis.recordsTrend} />
          <div className="mt-1 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-faint">
            <span>{kpis.recordsTrendLabels[0]}</span>
            <span>{kpis.recordsTrendLabels[kpis.recordsTrendLabels.length - 1]} · today</span>
          </div>
        </Panel>

        <Panel
          title="Validation pipeline"
          actions={
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600/10 text-emerald-700" aria-hidden="true">
              <ShieldCheck className="h-4 w-4" strokeWidth={2} />
            </span>
          }
        >
          <p className="font-sans text-[1.9rem] font-bold leading-none tracking-tight tabular-nums text-ink">
            {((passed / kpis.recordsToday) * 100).toFixed(1)}%
          </p>
          <p className="mt-1.5 text-[11px] text-ink-muted">of today's records passed validation clean</p>
          <div className="mt-4 divide-y divide-line">
            {funnel.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-faint">{row.label}</p>
                  <p className="mt-0.5 font-sans text-lg font-bold tabular-nums text-ink">{row.value.toLocaleString()}</p>
                </div>
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-muted">{row.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Integrations">
          <ul className="divide-y divide-line">
            {integrations.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-ink">{row.name}</p>
                  <p className="text-[11px] text-ink-muted">{row.detail}</p>
                </div>
                <StatusPill status={row.status} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Needs attention">
          <div className="space-y-2.5">
            {needsAttention.map((item) => (
              <AlertCard key={item.title} title={item.title} detail={item.detail} tone={item.tone} />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
