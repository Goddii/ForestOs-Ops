import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertCard, DataTable, ExplainPanel, Panel, StatTile, StatusPill } from '../../DashboardKit'
import { useConservation } from '../../../../lib/conservation/context'
import { POLICY } from '../../../../lib/conservation/policy'
import { formatCount, formatPct } from '../../../../lib/conservation/labels'
import { integrityBand } from '../../../../lib/conservation/rules'
import {
  explainLines,
  hubTiles,
  needsAttention,
  recentActivity,
  zoneRows,
} from '../../../../lib/conservation/selectors'
import Marker from './Marker'
import ScreenHeader from './ScreenHeader'
import SortableFrame from './SortableFrame'
import { conPath } from './paths'
import { CAPTION, CARD_LINK } from './ui'

const ALERT_TONE = { critical: 'critical', warn: 'warn', info: 'info' }

const ZONE_COLUMNS = [
  { key: 'name', label: 'Zone' },
  { key: 'block', label: 'Forest block' },
  { key: 'county', label: 'County' },
  { key: 'teaHa', label: 'Tea ha', align: 'right', mono: true },
  { key: 'treesHa', label: 'Trees ha', align: 'right', mono: true },
  { key: 'beltKm', label: 'Belt km', align: 'right', mono: true },
  { key: 'integrity', label: 'Integrity' },
  { key: 'openIncidents', label: 'Open incidents', align: 'right', mono: true },
  { key: 'claims', label: 'Claims awaiting', align: 'right', mono: true },
]

const BAND_FILL = { ok: 'bg-emerald-600', amber: 'bg-amber-500', critical: 'bg-critical' }

/** The integrity percentage with a small bar; the number is always printed beside it. */
function IntegrityCell({ value }) {
  if (value === null) return <span className="text-ink-faint">—</span>
  const band = integrityBand(value)
  return (
    <span className="inline-flex items-center gap-2">
      <span className={'w-10 font-mono tabular-nums ' + (band === 'critical' ? 'text-critical' : 'text-ink')}>
        {formatPct(value)}
      </span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line-strong" aria-hidden="true">
        <span className={'block h-full rounded-full ' + BAND_FILL[band]} style={{ width: `${value * 100}%` }} />
      </span>
    </span>
  )
}

function renderZoneCell(key, row) {
  switch (key) {
    case 'county':
      return row.county ? (
        <>
          {row.county}
          <Marker title="The county is inferred from the place name, not confirmed by NTZDC.">inferred</Marker>
        </>
      ) : (
        <span className="text-ink-faint">Not set</span>
      )
    case 'teaHa':
    case 'treesHa':
      return formatCount(row[key])
    case 'beltKm':
      return row.beltKm === null ? (
        <span className="text-ink-faint">—</span>
      ) : (
        <>
          {row.beltKm.toFixed(1)}
          <Marker title="Belt length is derived pro rata to zone hectares. It is not published.">derived</Marker>
        </>
      )
    case 'integrity':
      return <IntegrityCell value={row.integrity} />
    default:
      return row[key]
  }
}

const plural = (n, one, many) => (n === 1 ? one : many)

export default function ConservationHubModule() {
  const ctx = useConservation()
  const tiles = useMemo(() => hubTiles(ctx), [ctx])
  const attention = useMemo(() => needsAttention(ctx), [ctx])
  const zones = useMemo(
    () =>
      zoneRows(ctx).map((r) => ({
        id: r.id,
        name: r.zone.name,
        block: r.zone.forestBlock,
        county: r.zone.county,
        teaHa: r.zone.teaHa,
        treesHa: r.zone.treesHa,
        beltKm: r.zone.beltKm,
        integrity: r.integrity,
        openIncidents: r.openIncidents,
        claims: r.claimsAwaiting,
      })),
    [ctx],
  )
  const lines = useMemo(() => explainLines(ctx), [ctx])
  const activity = useMemo(() => recentActivity(ctx), [ctx])
  const { incidents, claims, boundary, survival, summary, patrols } = tiles
  const structure = ctx.ref.structure

  return (
    <div className="space-y-5">
      <ScreenHeader title="Conservation Hub" />

      <Panel title="Needs you today" lede="Ordered by severity, then by how long each item has waited. Each card opens the record behind it.">
        {attention.items.length === 0 ? (
          <p className="text-[13px] text-ink-muted">Nothing needs you right now.</p>
        ) : (
          <ul className="space-y-2.5">
            {attention.items.map((item) => (
              <li key={item.key}>
                <Link to={conPath(item.to)} className={CARD_LINK}>
                  <AlertCard
                    tone={ALERT_TONE[item.severity]}
                    title={item.title}
                    detail={item.detail}
                    tag={item.tag}
                    tagTone={item.tagTone}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {attention.hidden > 0 && (
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
            +{attention.hidden} more
          </p>
        )}
      </Panel>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile
          label="Open incidents"
          value={incidents.open}
          tone={incidents.escalationOverdue > 0 ? 'critical' : 'default'}
          note={`${incidents.escalationOverdue} ${plural(incidents.escalationOverdue, 'escalation', 'escalations')} overdue`}
          to={conPath('incidents')}
        />
        <StatTile
          label="Claims awaiting decision"
          value={claims.awaitingDecision}
          tone={claims.awaitingDecisionOverdue > 0 ? 'warn' : 'default'}
          note={`${claims.awaitingDecisionOverdue} overdue`}
          to={conPath('verification')}
        />
        <StatTile
          label="Boundary integrity"
          value={formatPct(boundary.integrity)}
          share={boundary.integrity}
          tone={boundary.underAmber > 0 ? 'warn' : 'default'}
          unit="Region, length-weighted"
          note={`${boundary.underAmber} ${plural(boundary.underAmber, 'segment', 'segments')} under ${formatPct(POLICY.boundary.amberBelow)}`}
          to={conPath('boundary')}
        />
        <StatTile
          label="Tree survival"
          value={survival.pct === null ? '—' : formatPct(survival.pct, 1)}
          tone={survival.belowThreshold > 0 ? 'warn' : 'default'}
          unit="Sample-weighted, latest counts"
          note={`Lower bound: ${formatCount(summary.survivingConservative)} trees`}
          to={conPath('survival')}
        />
        <StatTile
          label="Patrols on schedule"
          value={patrols.onSchedule}
          share={patrols.total ? patrols.onSchedule / patrols.total : undefined}
          tone={patrols.overdue > 0 ? 'warn' : 'default'}
          unit={`of ${patrols.total} segments`}
          note={`${patrols.overdue} overdue`}
          to={conPath('patrols')}
        />
        <StatTile
          label="Alerts to review"
          value={boundary.alertsToReview}
          tone={boundary.newAlerts > 0 ? 'warn' : 'default'}
          unit="New and under review"
          note={`${boundary.newAlerts} new`}
          to={conPath('boundary')}
        />
      </div>

      <Panel
        title="Zones in your region"
        lede="Hectares are as printed in the NTZDC annual report. Region, county and belt length are assumed, inferred or derived; see the note below the table."
      >
        <SortableFrame>
          <DataTable columns={ZONE_COLUMNS} rows={zones} renderCell={renderZoneCell} sortable />
        </SortableFrame>
        <details className="mt-4 rounded-lg border border-line bg-paper-sunk/40 px-4 py-3 text-[12px] leading-relaxed text-ink-muted">
          <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
            About these zone figures
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Source: {structure.source.report}.</li>
            <li>{structure.source.zoneCountNote}</li>
            <li>{structure.source.regionNote}</li>
            {structure.zoneTotals.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
            <li>
              The Mau zones total {formatCount(structure.mauReconciliation.zoneTotalHa)} ha; the belt table gives{' '}
              {formatCount(structure.mauReconciliation.beltHa)} ha for the Mau Complex, {formatCount(structure.mauReconciliation.differenceHa)} ha
              more. Both are kept and neither is reconciled.
            </li>
          </ul>
        </details>
      </Panel>

      <Panel title="Activity this session" lede="Session activity. Not yet in the Admin Audit Log.">
        <p className={CAPTION}>Check value (prototype): not a cryptographic signature</p>
        <ul className="mt-2 divide-y divide-line">
          {activity.map((entry) => (
            <li
              key={entry.ref}
              className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-[13px] text-ink">{entry.event}</p>
                <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                  {entry.ref} · {entry.when} · {entry.who} · {entry.record}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {entry.tone && (
                  <StatusPill status={entry.tone === 'critical' ? 'Critical' : 'Warning'} tone={entry.tone} />
                )}
                <span className="font-mono text-[10.5px] text-ink-faint">{entry.hash}</span>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <ExplainPanel lines={lines} />
    </div>
  )
}
