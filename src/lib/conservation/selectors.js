// Scope-aware selectors for the Conservation Officer console. Every list, KPI
// and export is computed through the account's `scope`, and every number on a
// screen comes from here. Pure functions of `ctx`:
//
//   ctx = { now, scope, state, ref }
//
// `now` is the demo clock (epoch ms), `scope` is `{ level: 'region', regionId }`
// or `{ level: 'national' }`, `state` is the reducer state and `ref` the frozen
// reference data. Records whose `arrivesAt` is later than `now` are invisible.
// Nothing here imports React, the Provider or the reducer, and nothing sorts
// or writes to the (frozen) state in place.
//
// The exports builder narrows a context to a single zone with an internal
// `{ level: 'zones', zoneIds }` scope; it is not part of the public Scope type.

import { POLICY } from './policy.js'
import {
  CLAIM_TYPE_LABEL,
  INCIDENT_TYPE_LABEL,
  KFS_CHANNEL_LABEL,
  REPORT_CHANNEL_LABEL,
  TASK_TYPE_LABEL,
  formatCount,
  formatDuration,
  formatEat,
  formatPct,
} from './labels.js'
import {
  DAY_MS,
  MINUTE_MS,
  addDaysKey,
  approveBlockers,
  claimChecks,
  claimFlags,
  claimStatus,
  claimWorkingDays,
  eatDateKey,
  eatDay,
  eatMonthKey,
  groundAgreement,
  integrityBand,
  isClaimOverdue,
  isVisible,
  ladderState,
  median,
  minutesToFirstMessage,
  missingMarkers,
  msOf,
  needsCountersign,
  nextCount,
  patrolIntervalDays,
  patrolState,
  regionIntegrity,
  buildEscalationSms,
  satelliteView,
  segmentIntegrity,
  segmentRisk,
  slaStart,
  speciesRows,
  survivalCredit,
  survivalOf,
  waitingOn,
  alertMeetsCriteria,
} from './rules.js'

const C = POLICY.claims
const S = POLICY.survival

// ── Scope ───────────────────────────────────────────────────────────────────

/** The zones the account can see. */
export function zonesInScope(ctx) {
  const { scope, ref } = ctx
  if (scope.level === 'national') return ref.zones
  if (scope.level === 'zones') return ref.zones.filter((z) => scope.zoneIds.includes(z.zoneId))
  return ref.zones.filter((z) => z.regionId === scope.regionId)
}

export function zoneIdsInScope(ctx) {
  return new Set(zonesInScope(ctx).map((z) => z.zoneId))
}

const zoneById = (ctx, zoneId) => ctx.ref.zones.find((z) => z.zoneId === zoneId) ?? null
const segmentById = (ctx, segmentId) => ctx.ref.segments.find((s) => s.segmentId === segmentId) ?? null
const plotById = (ctx, plotId) => ctx.ref.plots.find((p) => p.id === plotId) ?? null

export function segmentsInScope(ctx) {
  const zones = zoneIdsInScope(ctx)
  return ctx.ref.segments.filter((s) => zones.has(s.zoneId))
}

export function plotsInScope(ctx) {
  const zones = zoneIdsInScope(ctx)
  return ctx.ref.plots.filter((p) => zones.has(p.zoneId))
}

export function claimsInScope(ctx) {
  const zones = zoneIdsInScope(ctx)
  return ctx.state.claims.filter((c) => zones.has(c.zoneId) && isVisible(c, ctx.now))
}

export function incidentsInScope(ctx) {
  const zones = zoneIdsInScope(ctx)
  return ctx.state.incidents.filter((i) => zones.has(i.zoneId))
}

/** Alerts carry a region, and a zone once they are placed. */
export function alertsInScope(ctx) {
  const { scope } = ctx
  if (scope.level === 'national') return ctx.state.alerts
  if (scope.level === 'zones') return ctx.state.alerts.filter((a) => a.zoneId && scope.zoneIds.includes(a.zoneId))
  return ctx.state.alerts.filter((a) => a.regionId === scope.regionId)
}

export function checksInScope(ctx) {
  const claimIds = new Set(claimsInScope(ctx).map((c) => c.claimId))
  return ctx.state.survivalChecks.filter((c) => claimIds.has(c.claimId) && isVisible(c, ctx.now))
}

const taskZone = (ctx, task) => task.zoneId ?? (task.segmentId ? segmentById(ctx, task.segmentId)?.zoneId : null) ?? null

export function tasksInScope(ctx) {
  const zones = zoneIdsInScope(ctx)
  return ctx.state.tasks.filter((t) => zones.has(taskZone(ctx, t)))
}

export function logsInScope(ctx) {
  const segments = new Set(segmentsInScope(ctx).map((s) => s.segmentId))
  return ctx.state.patrolLogs.filter((l) => l.segmentId === null || segments.has(l.segmentId))
}

/** The line under every screen title: `South Rift Region · 4 zones · demo time 16 Sep 2026 07:12 EAT`. */
export function headerSub(ctx) {
  const zones = zonesInScope(ctx)
  const where =
    ctx.scope.level === 'national'
      ? 'National'
      : `${ctx.ref.regions.find((r) => r.regionId === ctx.scope.regionId)?.label ?? ''} Region`
  return `${where} · ${zones.length} ${zones.length === 1 ? 'zone' : 'zones'} · demo time ${formatEat(ctx.now, 'date')} ${formatEat(ctx.now, 'time')} EAT`
}

// ── Claims ──────────────────────────────────────────────────────────────────

/** Every claim in scope with its derived state, oldest report first. */
export function claimRows(ctx) {
  return claimsInScope(ctx)
    .map((claim) => {
      const status = claimStatus(claim, ctx)
      const flags = claimFlags(claim, ctx)
      return {
        claim,
        id: claim.claimId,
        status,
        flags,
        zoneName: zoneById(ctx, claim.zoneId)?.name ?? claim.zoneId,
        workingDays: claimWorkingDays(claim, ctx.now),
        overdue: isClaimOverdue(claim, ctx),
        needsCountersign: needsCountersign(claim, ctx),
        waiting: status === 'in_pipeline' ? waitingOn(claim, ctx.ref) : null,
      }
    })
    .sort((a, b) => msOf(a.claim.reportedAt) - msOf(b.claim.reportedAt) || a.id.localeCompare(b.id))
}

/** One claim's full read-out for the detail view; `null` when it is not in scope. */
export function claimDetail(ctx, claimId) {
  const row = claimRows(ctx).find((r) => r.id === claimId)
  if (!row) return null
  const { claim } = row
  const mix = claim.work.mixId ? ctx.ref.mixes[claim.work.mixId] : null
  return {
    ...row,
    checks: claimChecks(claim, ctx),
    blockers: approveBlockers(claim, ctx),
    plot: plotById(ctx, claim.plotId),
    zone: zoneById(ctx, claim.zoneId),
    species: mix && claim.work.trees ? speciesRows(mix, claim.work.trees) : [],
    mix,
    slaTarget: C.decisionSlaWorkingDays,
    slaFrom: slaStart(claim),
    justificationRequired: row.flags.length > 0,
  }
}

const isThisMonth = (ctx, instant) => eatMonthKey(instant) === eatMonthKey(ctx.now)

export function claimKpis(ctx) {
  const rows = claimRows(ctx)
  const count = (status) => rows.filter((r) => r.status === status).length
  return {
    awaitingDecision: count('awaiting_decision'),
    awaitingDecisionOverdue: rows.filter((r) => r.status === 'awaiting_decision' && r.overdue).length,
    awaitingCountersign: count('awaiting_countersign'),
    evidenceRequested: count('evidence_requested'),
    inPipeline: count('in_pipeline'),
    decidedThisMonth: rows.filter((r) => r.claim.decision && isThisMonth(ctx, r.claim.decision.decidedAt)).length,
    overdue: rows.filter((r) => r.overdue).length,
    total: rows.length,
  }
}

// ── Incidents ───────────────────────────────────────────────────────────────

/** The next KFS target the incident is up against, in minutes (negative when passed). */
function nextDeadline(incident, ladder, now) {
  if (incident.status === 'closed') return null
  if (ladder.sentCount === 0) {
    return { kind: 'first_message', minutes: (ladder.firstMessageTargetMs - now) / MINUTE_MS, overdue: ladder.firstMessageOverdue }
  }
  if (ladder.awaitingAck && ladder.ackDeadlineMs !== null) {
    return { kind: 'ack', minutes: (ladder.ackDeadlineMs - now) / MINUTE_MS, overdue: ladder.ackOverdue }
  }
  return null
}

/** Incidents in scope, most recently reported first, with the ladder and the satellite view. */
export function incidentRows(ctx) {
  const alerts = alertsInScope(ctx)
  return incidentsInScope(ctx)
    .map((incident) => {
      const ladder = ladderState(incident, ctx.ref, ctx.now)
      return {
        incident,
        id: incident.incidentId,
        ladder,
        severity: ladder.severity,
        satellite: satelliteView(incident, alerts),
        deadline: nextDeadline(incident, ladder, ctx.now),
        segmentName: segmentById(ctx, incident.segmentId)?.name ?? incident.segmentId,
        zoneName: zoneById(ctx, incident.zoneId)?.name ?? incident.zoneId,
        open: incident.status !== 'closed',
      }
    })
    .sort((a, b) => msOf(b.incident.firstReportedAt) - msOf(a.incident.firstReportedAt) || b.id.localeCompare(a.id))
}

export function incidentKpis(ctx) {
  const rows = incidentRows(ctx)
  const open = rows.filter((r) => r.open)
  const awaiting = open.filter((r) => r.ladder.awaitingAck)
  const oldestWaitMin = awaiting.length
    ? Math.max(
        ...awaiting.map((r) => (ctx.now - Math.min(...r.incident.escalations.map((e) => msOf(e.sentAt)))) / MINUTE_MS),
      )
    : null
  const recent = rows.filter((r) => msOf(r.incident.firstReportedAt) >= ctx.now - 30 * DAY_MS)
  const firstMessage = recent.map((r) => minutesToFirstMessage(r.incident)).filter((m) => m !== null)
  return {
    open: open.length,
    awaitingAck: awaiting.length,
    oldestWaitMin,
    escalationOverdue: open.filter((r) => r.ladder.escalationOverdue).length,
    medianFirstMessageMin: median(firstMessage),
    firstMessageSample: firstMessage.length,
    closedThisMonth: rows.filter((r) => r.incident.outcome && isThisMonth(ctx, r.incident.outcome.closedAt)).length,
    total: rows.length,
  }
}

/** One incident's read-out; `null` when it is not in scope. */
export function incidentDetail(ctx, incidentId) {
  const row = incidentRows(ctx).find((r) => r.id === incidentId)
  if (!row) return null
  const { incident } = row
  const zone = zoneById(ctx, incident.zoneId)
  const segment = segmentById(ctx, incident.segmentId)
  const alerts = alertsInScope(ctx).filter((a) => a.incidentId === incident.incidentId || incident.sourceRefs.includes(a.alertId))
  const events = [
    ...incident.reports.map((r) => ({
      at: msOf(r.at),
      kind: 'report',
      text: `Report received · ${REPORT_CHANNEL_LABEL[r.channel] ?? r.channel}`,
    })),
    ...row.ladder.rungs
      .filter((r) => r.sentAt)
      .map((r) => ({
        at: msOf(r.sentAt),
        kind: 'sent',
        text:
          r.channel === 'phone'
            ? `KFS phoned (logged) · ${r.label}`
            : `KFS message sent (simulated) · ${r.label}`,
      })),
    ...row.ladder.rungs
      .filter((r) => r.ackAt)
      .map((r) => ({
        at: msOf(r.ackAt),
        kind: 'ack',
        text: `KFS acknowledged · ${r.label} · ${KFS_CHANNEL_LABEL[r.ackChannel] ?? r.ackChannel}${r.ackNote ? ` · “${r.ackNote}”` : ''}`,
      })),
    ...(incident.outcome
      ? [{ at: msOf(incident.outcome.closedAt), kind: 'closed', text: `Incident closed · ${incident.outcome.kind === 'resolved' ? 'resolved' : 'false alarm'}` }]
      : []),
  ].sort((a, b) => a.at - b.at)
  const sessionActions = ctx.state.activity.filter((a) => a.record === incident.incidentId)
  return {
    ...row,
    zone,
    segment,
    county: zone?.county ?? null,
    events,
    sessionActions,
    sms: zone && segment ? buildEscalationSms(incident, zone, segment) : '',
    smsMax: POLICY.sms.maxChars,
    alerts,
    tasks: tasksInScope(ctx).filter((t) => t.linkedRef === incident.incidentId),
    sourceRefs: incident.sourceRefs.filter((ref) => !alerts.some((a) => a.alertId === ref)),
    lastSentRung: [...row.ladder.rungs].filter((r) => r.sentAt).sort((a, b) => msOf(b.sentAt) - msOf(a.sentAt))[0] ?? null,
    sentRungs: row.ladder.rungs.filter((r) => r.sentAt && !r.ackAt),
    incidentsOnSegment: incidentsInScope(ctx).filter((i) => i.segmentId === incident.segmentId),
  }
}

// ── Boundary ────────────────────────────────────────────────────────────────

/** The segments' patrol schedule and integrity, lowest integrity first. */
export function segmentRows(ctx) {
  const incidents = incidentsInScope(ctx)
  const logs = logsInScope(ctx)
  return segmentsInScope(ctx)
    .map((segment) => {
      const parts = segmentIntegrity(segment)
      const risk = segmentRisk(segment.segmentId, incidents, ctx.now)
      const interval = patrolIntervalDays(risk)
      const patrols = logs
        .filter((l) => l.segmentId === segment.segmentId && l.kind === 'patrol')
        .sort((a, b) => b.on.localeCompare(a.on) || b.logId.localeCompare(a.logId))
      const lastPatrol = patrols.length ? patrols[0].on : null
      const nextDue = lastPatrol ? addDaysKey(lastPatrol, interval) : null
      const patrol = nextDue ? patrolState(nextDue, ctx.now) : { state: 'overdue', daysOverdue: null }
      return {
        segment,
        id: segment.segmentId,
        zoneName: zoneById(ctx, segment.zoneId)?.name ?? segment.zoneId,
        ...parts,
        band: integrityBand(parts.integrity),
        openIncidents: incidents.filter((i) => i.segmentId === segment.segmentId && i.status !== 'closed').length,
        risk,
        interval,
        lastPatrol,
        nextDue,
        patrolState: patrol.state,
        daysOverdue: patrol.daysOverdue,
      }
    })
    .sort((a, b) => a.integrity - b.integrity || a.id.localeCompare(b.id))
}

export function boundaryKpis(ctx) {
  const segments = segmentsInScope(ctx)
  const missing = missingMarkers(segments)
  const rows = segmentRows(ctx)
  return {
    integrity: regionIntegrity(segments),
    underAmber: rows.filter((r) => r.integrity < POLICY.boundary.amberBelow).length,
    underCritical: rows.filter((r) => r.integrity < POLICY.boundary.criticalBelow).length,
    alertsToReview: alertsInScope(ctx).filter((a) => a.status === 'new' || a.status === 'under_review').length,
    newAlerts: alertsInScope(ctx).filter((a) => a.status === 'new').length,
    beltKm: Number(segments.reduce((sum, s) => sum + s.lengthKm, 0).toFixed(1)),
    beaconsMissing: missing.beacons,
    signsMissing: missing.signs,
    markersMissing: missing.beacons + missing.signs,
    segmentCount: segments.length,
  }
}

/** Satellite alerts in scope, newest first, with ground agreement. */
export function alertRows(ctx) {
  const incidents = incidentsInScope(ctx)
  return alertsInScope(ctx)
    .map((alert) => ({
      alert,
      id: alert.alertId,
      agreement: groundAgreement(alert, incidents),
      meetsCriteria: alertMeetsCriteria(alert),
      segmentName: alert.segmentId ? (segmentById(ctx, alert.segmentId)?.name ?? alert.segmentId) : null,
      zoneName: alert.zoneId ? (zoneById(ctx, alert.zoneId)?.name ?? alert.zoneId) : null,
    }))
    .sort((a, b) => msOf(b.alert.detectedAt) - msOf(a.alert.detectedAt) || b.id.localeCompare(a.id))
}

export function alertDetail(ctx, alertId) {
  const row = alertRows(ctx).find((r) => r.id === alertId)
  if (!row) return null
  const { alert } = row
  return {
    ...row,
    incident: alert.incidentId ? (incidentsInScope(ctx).find((i) => i.incidentId === alert.incidentId) ?? null) : null,
    incidentsOnSegment: alert.segmentId ? incidentsInScope(ctx).filter((i) => i.segmentId === alert.segmentId) : [],
    tasks: tasksInScope(ctx).filter((t) => t.linkedRef === alert.alertId),
    final: alert.status === 'dismissed' || alert.status === 'resolved' || alert.status === 'confirmed',
  }
}

// ── Tree survival ───────────────────────────────────────────────────────────

/** Verified tree plantings in scope with their arrived counts, oldest count first. */
export function plantings(ctx) {
  const checks = checksInScope(ctx)
  return claimRows(ctx)
    .filter((r) => r.claim.type === 'tree_planting' && r.status === 'verified')
    .map((r) => {
      const own = checks
        .filter((c) => c.claimId === r.id)
        .sort((a, b) => msOf(a.checkedAt) - msOf(b.checkedAt) || a.checkId.localeCompare(b.checkId))
      return { ...r, trees: r.claim.work.trees, checks: own, latest: own.length ? own[own.length - 1] : null }
    })
}

/** Every arrived count with the planting behind it, newest count first. */
export function survivalRows(ctx) {
  const byClaim = new Map(plantings(ctx).map((p) => [p.id, p]))
  return checksInScope(ctx)
    .map((check) => {
      const planting = byClaim.get(check.claimId)
      const claim = planting?.claim ?? ctx.state.claims.find((c) => c.claimId === check.claimId)
      const mix = claim?.work.mixId ? ctx.ref.mixes[claim.work.mixId] : null
      const species = mix && claim?.work.trees ? speciesRows(mix, claim.work.trees) : []
      const earlier = planting ? planting.checks.filter((c) => msOf(c.checkedAt) < msOf(check.checkedAt)) : []
      return {
        check,
        id: check.checkId,
        claim,
        plotId: claim?.plotId ?? null,
        zoneName: zoneById(ctx, claim?.zoneId)?.name ?? null,
        trees: claim?.work.trees ?? null,
        plantedOn: claim?.work.workDate ?? null,
        species: [...species].sort((a, b) => b.trees - a.trees).slice(0, 2).map((s) => s.name),
        survival: survivalOf(check),
        isLatest: planting?.latest?.checkId === check.checkId,
        earlier,
        openRecount: ctx.state.tasks.find((t) => t.type === 'count_request' && t.linkedRef === check.checkId && t.status !== 'done') ?? null,
        openOrder: openReplantingOrder(ctx, check.claimId),
      }
    })
    .sort((a, b) => msOf(b.check.checkedAt) - msOf(a.check.checkedAt) || b.id.localeCompare(a.id))
}

/** The open replanting order for a planting, if any: linked to one of its counts and not done. */
export function openReplantingOrder(ctx, claimId) {
  const ids = new Set(ctx.state.survivalChecks.filter((c) => c.claimId === claimId).map((c) => c.checkId))
  return ctx.state.tasks.find((t) => t.type === 'replanting' && ids.has(t.linkedRef) && t.status !== 'done') ?? null
}

export function survivalDetail(ctx, checkId) {
  const row = survivalRows(ctx).find((r) => r.id === checkId)
  if (!row) return null
  return {
    ...row,
    trend: [...row.earlier, row.check].map((c) => ({
      checkId: c.checkId,
      checkpointDays: c.checkpointDays,
      pct: c.alive / c.sampleSize,
    })),
    replantingQuantity: row.trees !== null ? row.trees - Math.round((row.trees * row.check.alive) / row.check.sampleSize) : null,
  }
}

/** The next count due for each verified planting. */
export function countsDue(ctx) {
  return plantings(ctx)
    .map((p) => {
      const next = nextCount(p.claim, p.latest, ctx.now)
      return next ? { ...next, id: p.id, plotId: p.claim.plotId, zoneName: p.zoneName, trees: p.trees, claim: p.claim } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.id.localeCompare(b.id))
}

/** Counts worth acting on soon: due now, or coming up within the look-ahead. */
function dueSoon(ctx, entry) {
  if (entry.state === 'due') return true
  return entry.state === 'upcoming' && eatDay(entry.dueOn) <= eatDay(ctx.now) + S.dueSoonDays
}

/** Survival read-out for the region: sample-weighted latest counts, and the tree credit. */
export function survivalSummary(ctx) {
  const all = plantings(ctx)
  const counted = all.filter((p) => p.latest)
  const alive = counted.reduce((sum, p) => sum + p.latest.alive, 0)
  const sample = counted.reduce((sum, p) => sum + p.latest.sampleSize, 0)
  const credit = counted.reduce(
    (total, p) => {
      const c = survivalCredit(p.trees, p.latest)
      return { point: total.point + c.point, conservative: total.conservative + c.conservative }
    },
    { point: 0, conservative: 0 },
  )
  return {
    alive,
    sample,
    pct: sample > 0 ? alive / sample : null,
    verifiedTrees: all.reduce((sum, p) => sum + p.trees, 0),
    countedTrees: counted.reduce((sum, p) => sum + p.trees, 0),
    surviving: credit.point,
    survivingConservative: credit.conservative,
    notCounted: all.filter((p) => !p.latest).map((p) => ({ id: p.id, plotId: p.claim.plotId, zoneName: p.zoneName, trees: p.trees })),
    plantings: all.length,
  }
}

export function survivalKpis(ctx) {
  const summary = survivalSummary(ctx)
  const counted = plantings(ctx).filter((p) => p.latest)
  const verdicts = counted.map((p) => survivalOf(p.latest).verdict)
  const due = countsDue(ctx)
  return {
    pct: summary.pct,
    alive: summary.alive,
    sample: summary.sample,
    belowThreshold: verdicts.filter((v) => v === 'fail').length,
    borderline: verdicts.filter((v) => v === 'borderline').length,
    dueSoon: due.filter((entry) => dueSoon(ctx, entry)).length,
    overdue: due.filter((entry) => entry.state === 'overdue').length,
  }
}

/** Plantings whose latest count fails and that have no open replanting order. */
export function unorderedFailures(ctx) {
  return plantings(ctx)
    .filter((p) => p.latest && survivalOf(p.latest).verdict === 'fail' && !openReplantingOrder(ctx, p.id))
    .map((p) => ({ planting: p, check: p.latest, survival: survivalOf(p.latest) }))
    .sort((a, b) => msOf(a.check.checkedAt) - msOf(b.check.checkedAt))
}

// ── Patrols and maintenance ─────────────────────────────────────────────────

export function patrolRows(ctx) {
  return [...segmentRows(ctx)].sort(
    (a, b) => (a.nextDue ?? '').localeCompare(b.nextDue ?? '') || a.id.localeCompare(b.id),
  )
}

export function taskRows(ctx) {
  return tasksInScope(ctx)
    .map((task) => ({
      task,
      id: task.taskId,
      zoneName: zoneById(ctx, taskZone(ctx, task))?.name ?? null,
      segmentName: task.segmentId ? (segmentById(ctx, task.segmentId)?.name ?? task.segmentId) : null,
      typeLabel: TASK_TYPE_LABEL[task.type],
    }))
    .sort((a, b) => a.task.dueOn.localeCompare(b.task.dueOn) || a.id.localeCompare(b.id))
}

/** The log newest first, by date. */
export function recentLog(ctx, limit = 12) {
  return [...logsInScope(ctx)]
    .sort((a, b) => b.on.localeCompare(a.on) || b.logId.localeCompare(a.logId))
    .slice(0, limit)
    .map((log) => ({ ...log, segmentName: log.segmentId ? (segmentById(ctx, log.segmentId)?.name ?? log.segmentId) : null }))
}

export function patrolKpis(ctx) {
  const rows = segmentRows(ctx)
  const tasks = tasksInScope(ctx)
  const logs = new Map(ctx.state.patrolLogs.map((l) => [l.logId, l]))
  const overdue = rows.filter((r) => r.patrolState === 'overdue').length
  return {
    total: rows.length,
    onSchedule: rows.length - overdue,
    dueToday: rows.filter((r) => r.patrolState === 'due_today').length,
    overdue,
    tasksOpen: tasks.filter((t) => t.status !== 'done').length,
    tasksBlocked: tasks.filter((t) => t.status === 'blocked').length,
    doneThisMonth: tasks.filter((t) => {
      const log = t.status === 'done' && t.logRef ? logs.get(t.logRef) : null
      return log ? eatMonthKey(log.on) === eatMonthKey(ctx.now) : false
    }).length,
  }
}

// ── Reports and exports ─────────────────────────────────────────────────────

/** Export history, newest generation first. */
export function exportHistory(ctx) {
  return [...ctx.state.exports].sort((a, b) => msOf(b.generatedAt) - msOf(a.generatedAt) || b.exportId.localeCompare(a.exportId))
}

// ── Hub ─────────────────────────────────────────────────────────────────────

export function hubTiles(ctx) {
  const incidents = incidentKpis(ctx)
  const claims = claimKpis(ctx)
  const boundary = boundaryKpis(ctx)
  const survival = survivalKpis(ctx)
  const summary = survivalSummary(ctx)
  const patrols = patrolKpis(ctx)
  return { incidents, claims, boundary, survival, summary, patrols }
}

const SEVERITY_RANK = { critical: 0, warn: 1, info: 2 }

const plural = (n, one, many) => `${formatCount(n)} ${n === 1 ? one : many}`

/**
 * "Needs you today": at most six cards, ordered by severity, then by source,
 * then oldest due first. Each carries a module-relative `to` link.
 */
export function needsAttention(ctx, limit = 6) {
  const items = []
  const rows = incidentRows(ctx).filter((r) => r.open)

  // 1. Awaiting a KFS acknowledgement whose target is within 15 minutes or has passed.
  for (const r of rows) {
    const { ladder, incident } = r
    if (!ladder.awaitingAck || ladder.ackDeadlineMs === null) continue
    const minutes = (ladder.ackDeadlineMs - ctx.now) / MINUTE_MS
    if (minutes > 15) continue
    const overdue = minutes < 0
    const last = [...ladder.rungs].filter((x) => x.sentAt).sort((a, b) => msOf(b.sentAt) - msOf(a.sentAt))[0]
    items.push({
      key: `ack:${incident.incidentId}`,
      source: 1,
      severity: 'critical',
      title: `${INCIDENT_TYPE_LABEL[incident.type]} · ${r.segmentName}: KFS acknowledgement ${overdue ? `overdue ${formatDuration(-minutes)}` : `due in ${formatDuration(minutes)}`}`,
      detail: `${incident.incidentId} · ${last?.label ?? 'KFS'} messaged ${formatEat(msOf(last?.sentAt ?? ctx.now), 'time')}. ${overdue ? 'Escalate to the next rung or phone KFS.' : 'Be ready to escalate.'}`,
      tag: overdue ? 'Ack overdue' : 'Ack due',
      tagTone: 'critical',
      to: `incidents?incident=${incident.incidentId}`,
      dueMs: ladder.ackDeadlineMs,
    })
  }

  // 2. Nothing sent to KFS and the first-message target has passed.
  for (const r of rows) {
    const { ladder, incident } = r
    if (ladder.sentCount > 0 || !ladder.firstMessageOverdue) continue
    const hard = incident.type === 'fire' || incident.type === 'illegal_logging'
    const late = (ctx.now - ladder.firstMessageTargetMs) / MINUTE_MS
    items.push({
      key: `first:${incident.incidentId}`,
      source: 2,
      severity: hard ? 'critical' : 'warn',
      title: `${INCIDENT_TYPE_LABEL[incident.type]} · ${r.segmentName}: first KFS message overdue ${formatDuration(late)}`,
      detail: `${incident.incidentId} · target was ${formatEat(ladder.firstMessageTargetMs, 'datetime')}. Nothing has been sent to KFS yet.`,
      tag: 'Escalate',
      tagTone: hard ? 'critical' : 'warn',
      to: `incidents?incident=${incident.incidentId}`,
      dueMs: ladder.firstMessageTargetMs,
    })
  }

  // 3. Claims past the decision target: one card for all of them.
  const late = claimRows(ctx).filter((r) => r.overdue)
  if (late.length > 0) {
    const oldest = late[0]
    items.push({
      key: 'claims-late',
      source: 3,
      severity: 'warn',
      title: `${plural(late.length, 'claim is', 'claims are')} past the ${C.decisionSlaWorkingDays}-day target`,
      detail: `Oldest: ${oldest.id}, ${oldest.workingDays} working days. Target is ${C.decisionSlaWorkingDays} working days.`,
      tag: 'Decide',
      tagTone: 'warn',
      to: 'verification',
      dueMs: msOf(slaStart(oldest.claim)),
    })
  }

  // 4. A planting whose latest count fails and has no replanting order.
  for (const f of unorderedFailures(ctx)) {
    const { check, survival, planting } = f
    items.push({
      key: `survival:${check.checkId}`,
      source: 4,
      severity: 'warn',
      title: `Tree survival below ${formatPct(S.threshold)}: ${planting.claim.plotId} · ${check.alive} of ${check.sampleSize} alive`,
      detail: `${formatPct(survival.p)} alive (range ${formatPct(survival.lower)} to ${formatPct(survival.upper)}), decisively below the target. No replanting order yet.`,
      tag: 'Replant',
      tagTone: 'warn',
      to: `survival?check=${check.checkId}`,
      dueMs: msOf(check.checkedAt),
    })
  }

  // 5. New satellite alerts: one card for all.
  const fresh = alertRows(ctx).filter((r) => r.alert.status === 'new')
  if (fresh.length > 0) {
    const oldest = [...fresh].sort((a, b) => msOf(a.alert.detectedAt) - msOf(b.alert.detectedAt))[0]
    items.push({
      key: 'alerts-new',
      source: 5,
      severity: 'warn',
      title: `${plural(fresh.length, 'new satellite alert', 'new satellite alerts')} on the boundary`,
      detail: `Latest pass ${formatEat(msOf(oldest.alert.detectedAt), 'datetime')}. Confirm as an incident or dismiss with a reason.`,
      tag: 'Review',
      tagTone: 'warn',
      to: 'boundary',
      dueMs: msOf(oldest.alert.detectedAt),
    })
  }

  // 6. Overdue patrols: one card for all.
  const behind = segmentRows(ctx).filter((r) => r.patrolState === 'overdue')
  if (behind.length > 0) {
    const worst = [...behind].sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0))[0]
    items.push({
      key: 'patrols-late',
      source: 6,
      severity: 'warn',
      title: `${plural(behind.length, 'segment has', 'segments have')} an overdue patrol`,
      detail: `Longest: ${worst.segment.name}, ${worst.daysOverdue ?? 0} ${worst.daysOverdue === 1 ? 'day' : 'days'} overdue.`,
      tag: 'Overdue',
      tagTone: 'warn',
      to: 'patrols',
      dueMs: msOf(worst.nextDue ?? eatDateKey(ctx.now)),
    })
  }

  // 7. Approvals waiting for the second signature: one card for all.
  const waiting = claimRows(ctx).filter((r) => r.status === 'awaiting_countersign')
  if (waiting.length > 0) {
    items.push({
      key: 'countersign',
      source: 7,
      severity: 'info',
      title: `${plural(waiting.length, 'claim', 'claims')} awaiting countersign`,
      detail: `Approved by you. The Unit Head, Buffer Zones & Protected Forest, must sign before ${waiting.length === 1 ? 'it counts' : 'they count'} as verified.`,
      tag: 'Countersign',
      tagTone: 'neutral',
      to: 'verification',
      dueMs: msOf(waiting[0].claim.decision.decidedAt),
    })
  }

  items.sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.source - b.source || a.dueMs - b.dueMs,
  )
  return { items: items.slice(0, limit), hidden: Math.max(0, items.length - limit), total: items.length }
}

/** The zones table on the Hub. */
export function zoneRows(ctx) {
  const segments = segmentsInScope(ctx)
  const incidents = incidentsInScope(ctx)
  const claims = claimRows(ctx)
  return zonesInScope(ctx).map((zone) => {
    const own = segments.filter((s) => s.zoneId === zone.zoneId)
    return {
      id: zone.zoneId,
      zone,
      integrity: own.length ? regionIntegrity(own) : null,
      segmentCount: own.length,
      openIncidents: incidents.filter((i) => i.zoneId === zone.zoneId && i.status !== 'closed').length,
      claimsAwaiting: claims.filter((c) => c.claim.zoneId === zone.zoneId && c.status === 'awaiting_decision').length,
    }
  })
}

/** Three plain-language lines composed from the Hub tiles. */
export function explainLines(ctx) {
  const t = hubTiles(ctx)
  const lines = []
  lines.push(
    `${plural(t.incidents.open, 'incident is', 'incidents are')} open. ` +
      (t.incidents.escalationOverdue > 0
        ? `${plural(t.incidents.escalationOverdue, 'KFS escalation is', 'KFS escalations are')} overdue, meaning a first message or an acknowledgement has missed its target.`
        : 'No KFS escalation has missed its target.') +
      (t.incidents.awaitingAck > 0 && t.incidents.oldestWaitMin !== null
        ? ` The longest wait for an acknowledgement is ${formatDuration(t.incidents.oldestWaitMin)}.`
        : ''),
  )
  lines.push(
    `${plural(t.claims.awaitingDecision, 'claim waits', 'claims wait')} for your decision` +
      (t.claims.overdue > 0
        ? `, and ${formatCount(t.claims.overdue)} ${t.claims.overdue === 1 ? 'is' : 'are'} past the ${C.decisionSlaWorkingDays}-working-day target.`
        : ', and none is past the target.') +
      (t.claims.awaitingCountersign > 0 ? ` ${plural(t.claims.awaitingCountersign, 'more waits', 'more wait')} for a countersign.` : ''),
  )
  lines.push(
    `Boundary integrity across the region is ${formatPct(t.boundary.integrity)}, with ${plural(t.boundary.underAmber, 'segment', 'segments')} under ${formatPct(POLICY.boundary.amberBelow)}. ` +
      (t.survival.pct === null
        ? 'No tree survival counts have arrived yet.'
        : `Tree survival on the latest counts is ${formatPct(t.survival.pct, 1)}; the cautious lower bound credits ${formatCount(t.summary.survivingConservative)} of ${formatCount(t.summary.countedTrees)} counted trees.`),
  )
  return lines
}

export function recentActivity(ctx, limit = 8) {
  return ctx.state.activity.slice(0, limit)
}

// ── Notifications (seed-time) ───────────────────────────────────────────────

/**
 * The four role notifications, with counts read from the selectors rather than
 * typed. `when` stays a static phrase like the other roles' notifications.
 */
export function notificationItems(ctx) {
  const fire = incidentRows(ctx).find((r) => r.incident.type === 'fire' && r.ladder.awaitingAck)
  const late = claimRows(ctx).filter((r) => r.overdue)
  const failure = unorderedFailures(ctx)[0]
  const fresh = alertRows(ctx).filter((r) => r.alert.status === 'new')
  const items = []
  if (fire) {
    items.push({
      id: 'con-fire',
      title: `Fire escalated · ${fire.segmentName}: KFS acknowledgement due`,
      detail: `${fire.incident.incidentId} · target ${formatEat(fire.ladder.ackDeadlineMs, 'time')} EAT. Nothing acknowledged yet.`,
      when: '14 min ago',
      to: `incidents?incident=${fire.incident.incidentId}`,
    })
  }
  if (late.length > 0) {
    items.push({
      id: 'con-claims',
      title: `${plural(late.length, 'claim is', 'claims are')} past the ${C.decisionSlaWorkingDays}-day decision target`,
      detail: `Oldest is ${late[0].id} (${CLAIM_TYPE_LABEL[late[0].claim.type].toLowerCase()}).`,
      when: '7 days ago',
      to: 'verification',
    })
  }
  if (failure) {
    items.push({
      id: 'con-survival',
      title: `Tree survival below threshold · ${failure.planting.claim.plotId}`,
      detail: `${failure.check.alive} of ${failure.check.sampleSize} alive. No replanting order yet.`,
      when: '11 days ago',
      to: `survival?check=${failure.check.checkId}`,
    })
  }
  if (fresh.length > 0) {
    items.push({
      id: 'con-alerts',
      title: `${plural(fresh.length, 'new satellite alert', 'new satellite alerts')} on the boundary`,
      detail: 'Confirm as an incident or dismiss with a reason.',
      when: '6 hours ago',
      to: 'boundary',
    })
  }
  return items
}
