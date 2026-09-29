// Export builders for the Conservation Officer console: the KFS incident and
// encroachment register, the Jaza Miti planting sheet and the head-office
// monthly return. Pure functions; the download itself happens in the screen.
//
// Every file is marked illustrative in its name and in a final `data_status`
// column. Worker identifiers never leave the console: `assertNoPersonalData`
// runs over every file before it is produced. Node-importable: no React.

import { DEFAULT_SCOPE } from '../dashboard/conservation.js'
import { EXPORT_PERIODS, EXPORT_TEMPLATES } from './policy.js'
import {
  EXPORT_TEMPLATE_SLUG,
  PERIOD_SLUG,
  formatEat,
  periodRecordLabel,
} from './labels.js'
import { checkValue, completedAt, eatDateKey, eatMonthStartMs, msOf, severityOf, speciesRows, DAY_MS } from './rules.js'
import {
  boundaryKpis,
  claimRows,
  incidentsInScope,
  logsInScope,
  segmentRows,
  survivalSummary,
  zonesInScope,
} from './selectors.js'

const DATA_STATUS = 'illustrative'

// ── Periods ─────────────────────────────────────────────────────────────────

/** The half-open window `[from, to)` in epoch ms for a period. */
export function periodWindow(periodId, now) {
  switch (periodId) {
    case 'last_30_days':
      return { from: now - 30 * DAY_MS, to: now + 1 }
    case 'month_to_date':
      return { from: eatMonthStartMs(now), to: now + 1 }
    case 'august_2026':
      return { from: msOf('2026-08-01'), to: msOf('2026-09-01') }
    case 'all_time':
      return { from: Number.NEGATIVE_INFINITY, to: Number.POSITIVE_INFINITY }
    default:
      throw new Error('Choose a period.')
  }
}

const within = (ms, window) => ms >= window.from && ms < window.to

// ── CSV ─────────────────────────────────────────────────────────────────────

/** RFC 4180: UTF-8 with a byte-order mark, every field quoted, `\r\n` line ends. */
export function toCsv(matrix) {
  const quote = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  return '﻿' + matrix.map((row) => row.map(quote).join(',') + '\r\n').join('')
}

/**
 * Throws if a header names a reporter or worker, or any cell holds a worker
 * identifier. Row 0 is the header. The message never repeats the value found.
 */
export function assertNoPersonalData(matrix) {
  for (const heading of matrix[0] ?? []) {
    if (/reporter|reported_by|farmer|worker/i.test(String(heading))) {
      throw new Error('A column could identify a person, so the file was not produced.')
    }
  }
  for (const row of matrix) {
    for (const cell of row) {
      if (/RVT-\d+/.test(String(cell))) {
        throw new Error('A cell holds a worker identifier, so the file was not produced.')
      }
    }
  }
}

const coord = (value) => (value === null || value === undefined ? '' : value.toFixed(4))
const num = (value) => (value === null || value === undefined ? '' : String(value))
const stamp = (ms) => formatEat(ms, 'stamp')

// ── Templates ───────────────────────────────────────────────────────────────

export const KFS_COLUMNS = [
  'ref', 'type', 'severity', 'zone', 'county_inferred', 'segment', 'latitude', 'longitude',
  'first_report_eat', 'report_count', 'est_area_ha', 'status', 'kfs_rung_notified',
  'notified_eat', 'acked_eat', 'kfs_reference', 'data_status',
]

export const JAZA_COLUMNS = [
  'plot_id', 'zone', 'latitude', 'longitude', 'species', 'trees_planted', 'planting_date',
  'claim_ref', 'verified_on', 'data_status',
]

export const RETURN_COLUMNS = ['section', 'metric', 'zone', 'value', 'unit', 'data_status']

/** Incidents in scope whose first report falls in the period. */
function kfsRegister(ctx, periodId) {
  const window = periodWindow(periodId, ctx.now)
  const rows = incidentsInScope(ctx)
    .filter((i) => within(msOf(i.firstReportedAt), window))
    .sort((a, b) => msOf(a.firstReportedAt) - msOf(b.firstReportedAt) || a.incidentId.localeCompare(b.incidentId))
    .map((incident) => {
      const zone = ctx.ref.zones.find((z) => z.zoneId === incident.zoneId)
      const segment = ctx.ref.segments.find((s) => s.segmentId === incident.segmentId)
      const sent = [...incident.escalations].sort((a, b) => msOf(a.sentAt) - msOf(b.sentAt))
      const acks = incident.escalations.filter((e) => e.ackAt).map((e) => msOf(e.ackAt))
      return [
        incident.incidentId,
        incident.type,
        severityOf(incident.type),
        zone?.name ?? '',
        zone?.county ?? '',
        segment?.name ?? '',
        coord(incident.lat),
        coord(incident.lon),
        stamp(msOf(incident.firstReportedAt)),
        String(incident.reports.length),
        num(incident.estAreaHa),
        incident.status,
        sent.length ? sent[0].rung : '',
        sent.length ? stamp(msOf(sent[0].sentAt)) : '',
        acks.length ? stamp(Math.min(...acks)) : '',
        incident.kfsRef ?? '',
        DATA_STATUS,
      ]
    })
  return { header: KFS_COLUMNS, rows }
}

/** One row per species per verified tree-planting claim whose verification date falls in the period. */
function jazaMiti(ctx, periodId) {
  const window = periodWindow(periodId, ctx.now)
  const rows = []
  const claims = claimRows(ctx)
    .filter((r) => r.claim.type === 'tree_planting' && r.status === 'verified')
    .sort((a, b) => a.id.localeCompare(b.id))
  for (const { claim } of claims) {
    const verifiedMs = msOf(completedAt(claim))
    if (!within(verifiedMs, window)) continue
    const zone = ctx.ref.zones.find((z) => z.zoneId === claim.zoneId)
    const mix = claim.work.mixId ? ctx.ref.mixes[claim.work.mixId] : null
    if (!mix || !claim.work.trees) continue
    const gps = claim.evidence.gps
    for (const species of speciesRows(mix, claim.work.trees)) {
      if (species.trees <= 0) continue
      rows.push([
        claim.plotId,
        zone?.name ?? '',
        coord(gps?.lat),
        coord(gps?.lon),
        species.name,
        String(species.trees),
        claim.work.workDate,
        claim.claimId,
        eatDateKey(verifiedMs),
        DATA_STATUS,
      ])
    }
  }
  return { header: JAZA_COLUMNS, rows }
}

const METRICS = [
  { section: 'claims', metric: 'claims_verified', unit: 'claims' },
  { section: 'claims', metric: 'claims_rejected', unit: 'claims' },
  { section: 'claims', metric: 'claims_awaiting_decision_now', unit: 'claims' },
  { section: 'trees', metric: 'trees_verified', unit: 'trees' },
  { section: 'survival', metric: 'survival_latest_pct_now', unit: 'percent' },
  { section: 'survival', metric: 'trees_surviving_conservative_now', unit: 'trees' },
  { section: 'boundary', metric: 'integrity_pct_now', unit: 'percent' },
  { section: 'boundary', metric: 'beacons_signs_missing_now', unit: 'items' },
  { section: 'incidents', metric: 'incidents_opened', unit: 'incidents' },
  { section: 'incidents', metric: 'incidents_closed', unit: 'incidents' },
  { section: 'incidents', metric: 'incidents_open_now', unit: 'incidents' },
  { section: 'patrols', metric: 'patrols_logged', unit: 'patrols' },
  { section: 'patrols', metric: 'segments_overdue_now', unit: 'segments' },
]

/** The thirteen head-office metrics for one context. Metrics ending `_now` ignore the period. */
function metricValues(ctx, window) {
  const claims = claimRows(ctx)
  const verified = claims.filter((r) => r.status === 'verified' && within(msOf(completedAt(r.claim)), window))
  const survival = survivalSummary(ctx)
  const boundary = boundaryKpis(ctx)
  const incidents = incidentsInScope(ctx)
  const percent = (fraction) => (fraction === null ? '' : (fraction * 100).toFixed(1))
  return {
    claims_verified: verified.length,
    claims_rejected: claims.filter((r) => r.status === 'rejected' && within(msOf(r.claim.decision.decidedAt), window)).length,
    claims_awaiting_decision_now: claims.filter((r) => r.status === 'awaiting_decision').length,
    trees_verified: verified
      .filter((r) => r.claim.type === 'tree_planting')
      .reduce((sum, r) => sum + (r.claim.work.trees ?? 0), 0),
    survival_latest_pct_now: percent(survival.pct),
    trees_surviving_conservative_now: survival.survivingConservative,
    integrity_pct_now: percent(boundary.integrity),
    beacons_signs_missing_now: boundary.markersMissing,
    incidents_opened: incidents.filter((i) => within(msOf(i.firstReportedAt), window)).length,
    incidents_closed: incidents.filter((i) => i.outcome && within(msOf(i.outcome.closedAt), window)).length,
    incidents_open_now: incidents.filter((i) => i.status !== 'closed').length,
    patrols_logged: logsInScope(ctx).filter((l) => l.kind === 'patrol' && within(msOf(l.on), window)).length,
    segments_overdue_now: segmentRows(ctx).filter((r) => r.patrolState === 'overdue').length,
  }
}

/** Long format: thirteen metrics for each zone in scope and for `ALL`. */
function monthlyReturn(ctx, periodId) {
  const window = periodWindow(periodId, ctx.now)
  const zones = zonesInScope(ctx)
  const perZone = zones.map((zone) => ({
    label: zone.name,
    values: metricValues({ ...ctx, scope: { level: 'zones', zoneIds: [zone.zoneId] } }, window),
  }))
  const all = { label: 'ALL', values: metricValues(ctx, window) }
  const rows = []
  for (const { section, metric, unit } of METRICS) {
    for (const entry of [...perZone, all]) {
      rows.push([section, metric, entry.label, String(entry.values[metric]), unit, DATA_STATUS])
    }
  }
  return { header: RETURN_COLUMNS, rows }
}

const BUILDERS = { kfs_register: kfsRegister, jaza_miti: jazaMiti, monthly_return: monthlyReturn }

/**
 * Builds one export: the table, the CSV text, the file name and the content
 * check value. Throws if the personal-data guard fails or the choice is not
 * recognised. `scope` defaults to the demo account's scope.
 */
export function buildExport({ template, period, scope = DEFAULT_SCOPE, now, state, ref }) {
  if (!EXPORT_TEMPLATES.includes(template)) throw new Error('Choose an export template.')
  if (!EXPORT_PERIODS.includes(period)) throw new Error('Choose a period.')
  const ctx = { now, scope, state, ref }
  const table = BUILDERS[template](ctx, period)
  const matrix = [table.header, ...table.rows]
  assertNoPersonalData(matrix)
  const csv = toCsv(matrix)
  const templateSlug = EXPORT_TEMPLATE_SLUG[template]
  return {
    table,
    matrix,
    csv,
    rows: table.rows.length,
    hash: checkValue(csv),
    templateSlug,
    periodRecord: periodRecordLabel(period, now),
    filename: `PROTOTYPE-ILLUSTRATIVE-${templateSlug}-${PERIOD_SLUG[period]}.csv`,
  }
}

/** Like `buildExport`, but reports the guard's failure instead of throwing. Used for the on-screen preview. */
export function previewExport(args) {
  try {
    return { ok: true, ...buildExport(args) }
  } catch (error) {
    return { ok: false, error: error.message }
  }
}
