// The Conservation Officer reducer: `reduce(state, action, now)` is a pure
// function that returns `{ state, error?, result? }`. On `error` the returned
// state IS the input object, untouched. `now` (epoch ms, the demo clock) stamps
// everything an action creates; the reducer never reads a clock of its own.
// Every branch that changes a record appends exactly one activity entry.
// Node-importable: no React.

import {
  makeAuditLogId,
  makeBufferLogId,
  makeExportId,
  makeIncidentId,
  makeTaskId,
} from '../contracts/ids.js'
import { REF, SEED_STATE } from '../dashboard/conservation.js'
import {
  DISMISSAL_REASONS,
  ESCALATION,
  EVIDENCE_KINDS,
  INCIDENT_TYPES,
  OFFICER_ID,
  PATROL_ISSUES,
  POLICY,
  REJECT_REASONS,
  TASK_TYPES,
} from './policy.js'
import {
  EVIDENCE_KIND_LABEL,
  INCIDENT_STATUS_LABEL,
  INCIDENT_TYPE_LABEL,
  OUTCOME_LABEL,
  TASK_TYPE_LABEL,
  formatEat,
  formatTaskQuantity,
} from './labels.js'
import {
  addDaysKey,
  approveBlockers,
  chainHash,
  claimFlags,
  claimStatus,
  eatDateKey,
  isVisible,
  isoOf,
  msOf,
  needsCountersign,
  replantingQuantity,
  statusStep,
  survivalOf,
} from './rules.js'
import { buildExport } from './exports.js'

const C = POLICY.claims
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

const trim = (value) => String(value ?? '').trim()
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)
/** A real calendar date written `YYYY-MM-DD` (rejects `2026-02-31`). */
const isDateKey = (value) => typeof value === 'string' && DATE_KEY.test(value) && addDaysKey(value, 0) === value

// ── Small helpers ───────────────────────────────────────────────────────────

/** A copy of `list` with the item whose `key` equals `id` replaced by `next`. */
const replace = (list, key, id, next) => list.map((item) => (item[key] === id ? next : item))

const zoneOf = (ref, zoneId) => ref.zones.find((z) => z.zoneId === zoneId) ?? null
const segmentOf = (ref, segmentId) => ref.segments.find((s) => s.segmentId === segmentId) ?? null
const plotOf = (ref, plotId) => ref.plots.find((p) => p.id === plotId) ?? null

/** `Zone Manager, Nyangores`: a role title, never a person. */
const zoneRole = (ref, title, zoneId) => {
  const zone = zoneOf(ref, zoneId)
  return zone ? `${title}, ${zone.name}` : title
}

const findClaim = (state, claimId, now) =>
  state.claims.find((c) => c.claimId === claimId && isVisible(c, now)) ?? null
const findIncident = (state, incidentId) => state.incidents.find((i) => i.incidentId === incidentId) ?? null

/** Chronological checks for one planting that have arrived, oldest first. */
const checksOf = (state, claimId, now) =>
  state.survivalChecks
    .filter((c) => c.claimId === claimId && isVisible(c, now))
    .sort((a, b) => msOf(a.checkedAt) - msOf(b.checkedAt))

const isOpenTask = (task) => task.status !== 'done'

const nextIncident = (state, spec, now, seq) => ({
  incidentId: makeIncidentId(Number(eatDateKey(now).slice(0, 4)), seq),
  type: spec.type,
  zoneId: spec.zoneId,
  segmentId: spec.segmentId,
  plotId: spec.plotId ?? null,
  lat: spec.lat ?? null,
  lon: spec.lon ?? null,
  firstReportedAt: spec.firstReportedAt,
  reports: [{ at: spec.firstReportedAt, channel: spec.channel }],
  estAreaHa: spec.estAreaHa ?? null,
  status: 'reported',
  escalations: [],
  sourceRefs: spec.sourceRefs ?? [],
  kfsRef: null,
  note: spec.note ?? null,
  outcome: null,
})

/** Builds a task from a validated spec and returns the task plus the sequence bump. */
function buildTask(state, spec, now) {
  return {
    taskId: makeTaskId(state.seq.MT),
    type: spec.type,
    segmentId: spec.segmentId ?? null,
    zoneId: spec.zoneId ?? null,
    plotId: spec.plotId ?? null,
    linkedRef: spec.linkedRef ?? null,
    assigneeRole: spec.assigneeRole,
    dueOn: spec.dueOn ?? addDaysKey(eatDateKey(now), 7),
    status: 'planned',
    blockedReason: null,
    quantity: spec.quantity ?? null,
    note: spec.note ?? '',
    logRef: null,
  }
}

/** Adds a task to a state: the task appended, the MT sequence advanced. */
const withTask = (state, task) => ({
  ...state,
  tasks: [...state.tasks, task],
  seq: { ...state.seq, MT: state.seq.MT + 1 },
})

const fail = (error) => ({ error })

// ── Claims ──────────────────────────────────────────────────────────────────

function decideClaim(state, p, ctx) {
  const claim = findClaim(state, p.claimId, ctx.now)
  if (!claim) return fail('That claim was not found.')
  const by = trim(p.by)
  if (!by) return fail('Say who is deciding.')
  const status = claimStatus(claim, ctx)

  if (p.outcome === 'approve') {
    const blockers = approveBlockers(claim, ctx)
    if (status !== 'awaiting_decision') return fail(blockers[0]?.message ?? 'This claim cannot be approved now.')
    const hard = blockers.find((b) => b.hard)
    if (hard) return fail(hard.message)
    const flags = claimFlags(claim, ctx)
    const justification = trim(p.justification)
    if (flags.length > 0 && justification.length < C.justificationMinChars) {
      return fail(
        `This claim has ${flags.length} ${flags.length === 1 ? 'flag' : 'flags'}. Add a justification of at least ${C.justificationMinChars} characters.`,
      )
    }
    const countersign = needsCountersign(claim, ctx)
    const next = {
      ...claim,
      stage: countersign ? claim.stage : 'verified',
      decision: {
        outcome: 'verified',
        reason: null,
        note: trim(p.note),
        justification: justification || null,
        decidedAt: isoOf(ctx.now),
        decidedBy: by,
        countersign: null,
      },
    }
    return {
      state: { ...state, claims: replace(state.claims, 'claimId', claim.claimId, next) },
      result: { id: claim.claimId, status: countersign ? 'awaiting_countersign' : 'verified' },
      log: {
        event: countersign ? 'Claim approved · awaiting countersign' : 'Claim approved · verified',
        record: claim.claimId,
      },
    }
  }

  if (p.outcome === 'reject') {
    if (status === 'rejected' || status === 'verified') return fail('This claim already has a final decision.')
    if (!REJECT_REASONS.includes(p.reason)) return fail('Choose a reason for the rejection.')
    const note = trim(p.note)
    if (note.length < C.rejectNoteMinChars) {
      return fail(`Add a note of at least ${C.rejectNoteMinChars} characters explaining the rejection.`)
    }
    const next = {
      ...claim,
      stage: 'rejected',
      evidenceRequest: null,
      decision: {
        outcome: 'rejected',
        reason: p.reason,
        note,
        justification: null,
        decidedAt: isoOf(ctx.now),
        decidedBy: by,
        countersign: null,
      },
    }
    return {
      state: { ...state, claims: replace(state.claims, 'claimId', claim.claimId, next) },
      result: { id: claim.claimId, status: 'rejected' },
      log: { event: 'Claim rejected', record: claim.claimId, tone: 'warn' },
    }
  }

  return fail('Choose approve or reject.')
}

function requestEvidence(state, p, ctx) {
  const claim = findClaim(state, p.claimId, ctx.now)
  if (!claim) return fail('That claim was not found.')
  const status = claimStatus(claim, ctx)
  if (status === 'rejected' || status === 'verified') return fail('This claim already has a final decision.')
  if (claim.evidenceRequest) return fail('An evidence request is already open on this claim.')
  if (!EVIDENCE_KINDS.includes(p.kind)) return fail('Choose what evidence is needed.')
  const note = trim(p.note)
  if (note.length < C.evidenceRequestNoteMinChars) {
    return fail(`Add a note of at least ${C.evidenceRequestNoteMinChars} characters saying what is needed.`)
  }
  // Asking for more evidence after an approval withdraws the pending approval.
  const withdrawn = claim.decision?.outcome === 'verified'
  const next = {
    ...claim,
    decision: withdrawn ? null : claim.decision,
    evidenceRequest: { kind: p.kind, note, requestedAt: isoOf(ctx.now) },
  }
  let nextState = { ...state, claims: replace(state.claims, 'claimId', claim.claimId, next) }
  let taskId = null
  if (p.kind === 'field_check') {
    const task = buildTask(
      nextState,
      {
        type: 'field_check',
        zoneId: claim.zoneId,
        plotId: claim.plotId,
        linkedRef: claim.claimId,
        assigneeRole: zoneRole(ctx.ref, ctx.ref.roles.zoneManager, claim.zoneId),
        note: `Field check for ${claim.claimId}: ${note}`,
      },
      ctx.now,
    )
    nextState = withTask(nextState, task)
    taskId = task.taskId
  }
  return {
    state: nextState,
    result: { id: claim.claimId, taskId, withdrewApproval: withdrawn },
    log: { event: `Evidence requested · ${EVIDENCE_KIND_LABEL[p.kind].toLowerCase()}`, record: claim.claimId },
  }
}

function evidenceReceived(state, p, ctx) {
  const claim = findClaim(state, p.claimId, ctx.now)
  if (!claim) return fail('That claim was not found.')
  if (!claim.evidenceRequest) return fail('There is no open evidence request on this claim.')
  const next = { ...claim, evidenceRequest: null, resubmittedAt: isoOf(ctx.now) }
  return {
    state: { ...state, claims: replace(state.claims, 'claimId', claim.claimId, next) },
    result: { id: claim.claimId },
    log: { event: 'Evidence received', record: claim.claimId },
  }
}

function countersign(state, p, ctx) {
  const claim = findClaim(state, p.claimId, ctx.now)
  if (!claim) return fail('That claim was not found.')
  const status = claimStatus(claim, ctx)
  if (status !== 'awaiting_countersign') {
    if (status === 'verified') {
      return fail(claim.decision?.countersign ? 'This claim is already countersigned.' : 'This claim needs no countersign.')
    }
    return fail('Approve the claim first. Only an approval can be countersigned.')
  }
  const by = trim(p.by)
  if (!by) return fail('Say who is countersigning.')
  if (by === claim.decision.decidedBy) return fail('The approver cannot countersign their own approval.')
  const next = {
    ...claim,
    stage: 'verified',
    decision: { ...claim.decision, countersign: { by, at: isoOf(ctx.now) } },
  }
  return {
    state: { ...state, claims: replace(state.claims, 'claimId', claim.claimId, next) },
    result: { id: claim.claimId },
    log: { event: 'Claim countersigned · verified', record: claim.claimId, who: by },
  }
}

// ── Incidents ───────────────────────────────────────────────────────────────

function logIncident(state, p, ctx) {
  if (!INCIDENT_TYPES.includes(p.type)) return fail('Choose the type of incident.')
  const segment = segmentOf(ctx.ref, p.segmentId)
  if (!segment) return fail('Choose the boundary segment.')
  const hasLat = p.lat !== undefined && p.lat !== null && p.lat !== ''
  const hasLon = p.lon !== undefined && p.lon !== null && p.lon !== ''
  let lat = null
  let lon = null
  if (hasLat || hasLon) {
    lat = Number(p.lat)
    lon = Number(p.lon)
    if (!hasLat || !hasLon || !isFiniteNumber(lat) || !isFiniteNumber(lon)) {
      return fail('Enter both a latitude and a longitude, or leave both blank.')
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return fail('That position is outside the valid range.')
  }
  const note = trim(p.note)
  if (note.length > 500) return fail('Keep the note under 500 characters.')
  const incident = nextIncident(
    state,
    {
      type: p.type,
      zoneId: segment.zoneId,
      segmentId: segment.segmentId,
      lat,
      lon,
      firstReportedAt: isoOf(ctx.now),
      channel: 'officer',
      note: note || null,
    },
    ctx.now,
    state.seq.INC,
  )
  return {
    state: { ...state, incidents: [incident, ...state.incidents], seq: { ...state.seq, INC: state.seq.INC + 1 } },
    result: { id: incident.incidentId },
    log: { event: `Incident logged · ${INCIDENT_TYPE_LABEL[p.type].toLowerCase()}`, record: incident.incidentId },
  }
}

function sendEscalation(state, p, ctx) {
  const incident = findIncident(state, p.incidentId)
  if (!incident) return fail('That incident was not found.')
  if (incident.status === 'closed') return fail('This incident is closed.')
  const ladder = (ESCALATION[incident.type] ?? ESCALATION.other).ladder
  if (!ladder.includes(p.rung)) return fail('That rung is not part of this incident’s ladder.')
  if (incident.escalations.some((e) => e.rung === p.rung)) return fail('A message has already been sent to that rung.')
  if (p.channel !== 'sms' && p.channel !== 'phone') return fail('Choose SMS or phone.')
  const next = {
    ...incident,
    status: incident.status === 'reported' || incident.status === 'triaged' ? 'escalated' : incident.status,
    escalations: [
      ...incident.escalations,
      { rung: p.rung, channel: p.channel, sentAt: isoOf(ctx.now), ackAt: null, ackChannel: null, ackNote: null },
    ],
  }
  const rungNumber = ladder.indexOf(p.rung) + 1
  const how = p.channel === 'sms' ? 'SMS, simulated' : 'phone call logged'
  return {
    state: { ...state, incidents: replace(state.incidents, 'incidentId', incident.incidentId, next) },
    result: { id: incident.incidentId, rung: p.rung },
    log: {
      event: `Incident escalated to KFS · ${INCIDENT_TYPE_LABEL[incident.type].toLowerCase()} · rung ${rungNumber} (${how})`,
      record: incident.incidentId,
      tone: incident.type === 'fire' ? 'critical' : undefined,
    },
  }
}

function recordAck(state, p, ctx) {
  const incident = findIncident(state, p.incidentId)
  if (!incident) return fail('That incident was not found.')
  if (incident.status === 'closed') return fail('This incident is closed.')
  const entry = incident.escalations.find((e) => e.rung === p.rung)
  if (!entry) return fail('That rung has not been sent yet, so it cannot be acknowledged.')
  if (entry.ackAt) return fail('That rung is already acknowledged.')
  if (p.ackChannel !== 'sms' && p.ackChannel !== 'phone') return fail('Choose how KFS acknowledged: SMS or phone.')
  const at = p.at === undefined || p.at === null || p.at === '' ? ctx.now : msOf(p.at)
  if (!isFiniteNumber(at)) return fail('Enter a valid acknowledgement time.')
  if (at > ctx.now) return fail('The acknowledgement time cannot be in the future.')
  if (at < msOf(entry.sentAt)) return fail('The acknowledgement cannot be earlier than the message it answers.')
  const kfsRef = trim(p.kfsRef)
  if (kfsRef.length > 60) return fail('Keep the KFS reference under 60 characters.')
  const note = trim(p.note)
  const next = {
    ...incident,
    status: incident.status === 'escalated' ? 'acknowledged' : incident.status,
    kfsRef: kfsRef || incident.kfsRef,
    escalations: incident.escalations.map((e) =>
      e.rung === p.rung ? { ...e, ackAt: isoOf(at), ackChannel: p.ackChannel, ackNote: note || null } : e,
    ),
  }
  return {
    state: { ...state, incidents: replace(state.incidents, 'incidentId', incident.incidentId, next) },
    result: { id: incident.incidentId, rung: p.rung },
    log: { event: `KFS acknowledgement recorded · ${INCIDENT_TYPE_LABEL[incident.type].toLowerCase()}`, record: incident.incidentId },
  }
}

function setIncidentStatus(state, p) {
  const incident = findIncident(state, p.incidentId)
  if (!incident) return fail('That incident was not found.')
  const step = statusStep(incident, p.to)
  if (!step.ok) return fail(step.reason)
  return {
    state: { ...state, incidents: replace(state.incidents, 'incidentId', incident.incidentId, { ...incident, status: p.to }) },
    result: { id: incident.incidentId, status: p.to },
    log: { event: `Incident status · ${INCIDENT_STATUS_LABEL[p.to].toLowerCase()}`, record: incident.incidentId },
  }
}

function closeIncident(state, p, ctx) {
  const incident = findIncident(state, p.incidentId)
  if (!incident) return fail('That incident was not found.')
  if (incident.status === 'closed') return fail('This incident is already closed.')
  if (p.kind !== 'resolved' && p.kind !== 'false_alarm') return fail('Choose resolved or false alarm.')
  if (p.kind === 'resolved' && incident.status !== 'controlled') {
    return fail('Only a controlled incident can be closed as resolved. If nothing was found, close it as a false alarm.')
  }
  const note = trim(p.note)
  if (note.length < POLICY.incidents.closeNoteMinChars) {
    return fail(`Add a closing note of at least ${POLICY.incidents.closeNoteMinChars} characters.`)
  }
  const givenArea = p.areaAffectedHa === undefined || p.areaAffectedHa === null || p.areaAffectedHa === ''
  const area = givenArea ? null : Number(p.areaAffectedHa)
  if (!givenArea && (!isFiniteNumber(area) || area < 0)) return fail('The area affected must be a number of hectares, 0 or more.')
  if (p.kind === 'resolved' && incident.type === 'fire' && area === null) {
    return fail('Enter the area burnt in hectares (0 if none).')
  }
  const outcome = {
    kind: p.kind,
    areaAffectedHa: p.kind === 'resolved' ? area : null,
    note,
    closedAt: isoOf(ctx.now),
  }
  const alerts =
    p.kind === 'resolved'
      ? state.alerts.map((a) =>
          a.status === 'confirmed' && (a.incidentId === incident.incidentId || incident.sourceRefs.includes(a.alertId))
            ? { ...a, status: 'resolved' }
            : a,
        )
      : state.alerts
  return {
    state: {
      ...state,
      alerts,
      incidents: replace(state.incidents, 'incidentId', incident.incidentId, { ...incident, status: 'closed', outcome }),
    },
    result: { id: incident.incidentId },
    log: { event: `Incident closed · ${OUTCOME_LABEL[p.kind].toLowerCase()}`, record: incident.incidentId },
  }
}

// ── Boundary alerts ─────────────────────────────────────────────────────────

const ALERT_NEXT = {
  new: ['under_review', 'confirmed', 'dismissed'],
  under_review: ['confirmed', 'dismissed'],
  confirmed: [],
  dismissed: [],
  resolved: [],
}

function triageAlert(state, p, ctx) {
  const alert = state.alerts.find((a) => a.alertId === p.alertId)
  if (!alert) return fail('That alert was not found.')
  if (alert.status === 'dismissed' || alert.status === 'resolved') {
    return fail(`This alert is already ${alert.status} and cannot change.`)
  }
  if (alert.status === 'confirmed') {
    return fail('A confirmed alert is resolved when its incident closes as resolved.')
  }
  if (!ALERT_NEXT[alert.status].includes(p.to)) return fail('That is not a valid step for this alert.')

  if (p.to === 'under_review') {
    return {
      state: { ...state, alerts: replace(state.alerts, 'alertId', alert.alertId, { ...alert, status: 'under_review' }) },
      result: { id: alert.alertId },
      log: { event: 'Alert marked under review', record: alert.alertId },
    }
  }

  if (p.to === 'confirmed') {
    if (!INCIDENT_TYPES.includes(p.incidentType)) return fail('Choose the type of incident to raise.')
    if (!alert.segmentId || !alert.zoneId) return fail('This alert has no segment, so it cannot be turned into an incident here.')
    const incident = nextIncident(
      state,
      {
        type: p.incidentType,
        zoneId: alert.zoneId,
        segmentId: alert.segmentId,
        plotId: alert.plotId,
        lat: alert.lat,
        lon: alert.lon,
        firstReportedAt: alert.detectedAt,
        channel: 'satellite',
        estAreaHa: alert.areaHa,
        sourceRefs: [alert.alertId],
      },
      ctx.now,
      state.seq.INC,
    )
    return {
      state: {
        ...state,
        incidents: [incident, ...state.incidents],
        alerts: replace(state.alerts, 'alertId', alert.alertId, { ...alert, status: 'confirmed', incidentId: incident.incidentId }),
        seq: { ...state.seq, INC: state.seq.INC + 1 },
      },
      result: { id: incident.incidentId, alertId: alert.alertId },
      log: { event: `Alert confirmed as incident · ${INCIDENT_TYPE_LABEL[p.incidentType].toLowerCase()}`, record: alert.alertId },
    }
  }

  // dismissed
  const given = p.dismissal ?? {}
  if (!DISMISSAL_REASONS.includes(given.reason)) return fail('Choose a reason for dismissing the alert.')
  const note = trim(given.note)
  let incidentId = null
  if (given.reason === 'known_incident') {
    const known = state.incidents.find((i) => i.incidentId === given.incidentId)
    if (!known || known.segmentId !== alert.segmentId) return fail('Choose an incident on the same segment as the alert.')
    incidentId = known.incidentId
  }
  if (given.reason === 'other' && note.length < POLICY.boundary.dismissNoteMinChars) {
    return fail(`Add a note of at least ${POLICY.boundary.dismissNoteMinChars} characters explaining the dismissal.`)
  }
  return {
    state: {
      ...state,
      alerts: replace(state.alerts, 'alertId', alert.alertId, {
        ...alert,
        status: 'dismissed',
        dismissal: { reason: given.reason, incidentId, note },
      }),
    },
    result: { id: alert.alertId },
    log: { event: `Alert dismissed · ${given.reason.replace(/_/g, ' ')}`, record: alert.alertId, tone: 'warn' },
  }
}

// ── Tree survival ───────────────────────────────────────────────────────────

function reviewCheck(state, p, ctx) {
  const check = state.survivalChecks.find((c) => c.checkId === p.checkId && isVisible(c, ctx.now))
  if (!check) return fail('That survival count was not found.')
  if (p.review !== 'accepted' && p.review !== 'recount_requested') return fail('Choose accept or recount.')
  if (check.review) return fail('This count has already been reviewed.')
  const claim = state.claims.find((c) => c.claimId === check.claimId)
  let nextState = {
    ...state,
    survivalChecks: replace(state.survivalChecks, 'checkId', check.checkId, { ...check, review: p.review }),
  }
  let taskId = null
  if (p.review === 'recount_requested') {
    if (state.tasks.some((t) => t.type === 'count_request' && t.linkedRef === check.checkId && isOpenTask(t))) {
      return fail('A recount is already requested for this count.')
    }
    const task = buildTask(
      nextState,
      {
        type: 'count_request',
        zoneId: claim?.zoneId ?? null,
        plotId: claim?.plotId ?? null,
        linkedRef: check.checkId,
        assigneeRole: zoneRole(ctx.ref, ctx.ref.roles.blockSupervisor, claim?.zoneId),
        quantity: POLICY.survival.sampleSize,
        note: `Recount of ${claim?.plotId ?? check.claimId}: the last count could not settle the verdict.`,
      },
      ctx.now,
    )
    nextState = withTask(nextState, task)
    taskId = task.taskId
  }
  return {
    state: nextState,
    result: { id: check.checkId, taskId },
    log: {
      event: p.review === 'accepted' ? 'Survival count accepted' : 'Survival recount requested',
      record: check.checkId,
    },
  }
}

// ── Tasks and patrols ───────────────────────────────────────────────────────

function createTask(state, p, ctx) {
  if (!TASK_TYPES.includes(p.type)) return fail('Choose the type of task.')
  const segment = p.segmentId ? segmentOf(ctx.ref, p.segmentId) : null
  if (p.segmentId && !segment) return fail('That segment was not found.')
  const plot = p.plotId ? plotOf(ctx.ref, p.plotId) : null
  if (p.plotId && !plot) return fail('That plot was not found.')
  const zoneId = p.zoneId ?? segment?.zoneId ?? plot?.zoneId ?? null
  if (p.zoneId && !zoneOf(ctx.ref, p.zoneId)) return fail('That zone was not found.')
  let assigneeRole = trim(p.assigneeRole)
  if (p.dueOn !== undefined && p.dueOn !== null && !isDateKey(p.dueOn)) {
    return fail('Enter the due date as a valid date.')
  }
  if (p.quantity !== undefined && p.quantity !== null && (!isFiniteNumber(p.quantity) || p.quantity < 0)) {
    return fail('The quantity must be a number, 0 or more.')
  }
  let quantity = p.quantity ?? null
  let linkedRef = p.linkedRef ?? null
  let note = trim(p.note)
  let taskZone = zoneId
  let taskPlot = p.plotId ?? null

  if (p.type === 'replanting') {
    const check = state.survivalChecks.find((c) => c.checkId === linkedRef && isVisible(c, ctx.now))
    if (!check) return fail('Order replanting against a survival count.')
    const claim = state.claims.find((c) => c.claimId === check.claimId)
    const all = checksOf(state, check.claimId, ctx.now)
    const latest = all[all.length - 1]
    if (latest.checkId !== check.checkId) return fail(`Order replanting against the latest count, ${latest.checkId}.`)
    const verdict = survivalOf(latest).verdict
    if (verdict === 'pass') return fail('Survival is at or above the threshold, so no replanting is needed.')
    if (verdict === 'borderline') return fail('A recount is needed before ordering replanting.')
    const plantingChecks = new Set(all.map((c) => c.checkId))
    const open = state.tasks.find((t) => t.type === 'replanting' && plantingChecks.has(t.linkedRef) && isOpenTask(t))
    if (open) return fail(`Order ${open.taskId} is open.`)
    quantity = replantingQuantity(claim.work.trees, latest)
    taskZone = claim.zoneId
    taskPlot = claim.plotId
    if (!assigneeRole) assigneeRole = zoneRole(ctx.ref, ctx.ref.roles.blockSupervisor, claim.zoneId)
    if (!note) note = `Replace about ${quantity} trees lost on ${claim.plotId}.`
  }

  if (!assigneeRole) return fail('Name the role the task is for.')

  if (p.type === 'count_request' && linkedRef) {
    const dup = state.tasks.find((t) => t.type === 'count_request' && t.linkedRef === linkedRef && isOpenTask(t))
    if (dup) return fail(`A count request, ${dup.taskId}, is already open.`)
  }

  const task = buildTask(
    state,
    {
      type: p.type,
      segmentId: segment?.segmentId ?? null,
      zoneId: taskZone,
      plotId: taskPlot,
      linkedRef,
      assigneeRole,
      dueOn: p.dueOn ?? undefined,
      quantity,
      note,
    },
    ctx.now,
  )
  return {
    state: withTask(state, task),
    result: { id: task.taskId, quantity: task.quantity },
    log: { event: `Task created · ${TASK_TYPE_LABEL[p.type].toLowerCase()}`, record: task.taskId },
  }
}

const LOG_KIND_OF_TASK = { fence_repair: 'fence', planting: 'planting', replanting: 'planting' }

function updateTask(state, p, ctx) {
  const task = state.tasks.find((t) => t.taskId === p.taskId)
  if (!task) return fail('That task was not found.')
  const set = (next, event, extra = {}) => ({
    state: { ...state, ...extra.state, tasks: replace(state.tasks, 'taskId', task.taskId, next) },
    result: { id: task.taskId, status: next.status, logRef: next.logRef },
    log: { event, record: task.taskId },
  })

  switch (p.action) {
    case 'start':
      if (task.status !== 'planned' && task.status !== 'blocked') return fail('Only a planned or blocked task can be started.')
      return set({ ...task, status: 'in_progress', blockedReason: null }, 'Task started')
    case 'block': {
      if (task.status !== 'planned' && task.status !== 'in_progress') return fail('Only a planned or in-progress task can be blocked.')
      const reason = trim(p.reason)
      if (reason.length < POLICY.tasks.blockReasonMinChars) {
        return fail(`Say why the task is blocked, in at least ${POLICY.tasks.blockReasonMinChars} characters.`)
      }
      return set({ ...task, status: 'blocked', blockedReason: reason }, 'Task blocked')
    }
    case 'complete': {
      if (task.status !== 'planned' && task.status !== 'in_progress') return fail('Only a planned or in-progress task can be completed.')
      const segment = task.segmentId ? segmentOf(ctx.ref, task.segmentId) : null
      const quantity = formatTaskQuantity(task)
      const log = {
        logId: makeBufferLogId(state.seq.BM),
        segmentId: task.segmentId,
        on: eatDateKey(ctx.now),
        kind: LOG_KIND_OF_TASK[task.type] ?? 'other',
        note: `${segment ? `${segment.name} — ` : ''}${TASK_TYPE_LABEL[task.type]}${quantity ? ` (${quantity})` : ''}`,
        issues: [],
      }
      return set({ ...task, status: 'done', blockedReason: null, logRef: log.logId }, 'Task completed', {
        state: { patrolLogs: [log, ...state.patrolLogs], seq: { ...state.seq, BM: state.seq.BM + 1 } },
      })
    }
    case 'reopen':
      if (task.status !== 'done') return fail('Only a completed task can be reopened.')
      return set({ ...task, status: 'in_progress' }, 'Task reopened')
    default:
      return fail('Choose start, block, complete or reopen.')
  }
}

function logPatrol(state, p, ctx) {
  const segment = segmentOf(ctx.ref, p.segmentId)
  if (!segment) return fail('Choose the segment that was patrolled.')
  if (!isDateKey(p.on)) return fail('Enter the patrol date.')
  if (p.on > eatDateKey(ctx.now)) return fail('A patrol cannot be dated in the future.')
  const note = trim(p.note)
  if (!note) return fail('Describe what the patrol found.')
  const issues = Array.isArray(p.issues) ? p.issues : []
  if (issues.some((issue) => !PATROL_ISSUES.includes(issue))) return fail('One of the issues is not recognised.')
  if (issues.includes('none') && issues.length > 1) return fail('“None” cannot be combined with other issues.')
  const log = {
    logId: makeBufferLogId(state.seq.BM),
    segmentId: segment.segmentId,
    on: p.on,
    kind: 'patrol',
    note: `${segment.name} — ${note}`,
    issues: issues.filter((issue) => issue !== 'none'),
  }
  return {
    state: { ...state, patrolLogs: [log, ...state.patrolLogs], seq: { ...state.seq, BM: state.seq.BM + 1 } },
    result: { id: log.logId },
    log: { event: `Patrol logged · ${segment.name.toLowerCase()}`, record: log.logId },
  }
}

// ── Exports ─────────────────────────────────────────────────────────────────

function generateExport(state, p, ctx) {
  let built
  try {
    built = buildExport({ template: p.template, period: p.period, scope: p.scope, now: ctx.now, state, ref: ctx.ref })
  } catch (error) {
    return fail(error.message)
  }
  const record = {
    exportId: makeExportId(state.seq.EXP),
    template: p.template,
    period: built.periodRecord,
    rows: built.rows,
    generatedAt: isoOf(ctx.now),
    hash: built.hash,
  }
  return {
    state: { ...state, exports: [record, ...state.exports], seq: { ...state.seq, EXP: state.seq.EXP + 1 } },
    result: { id: record.exportId, filename: built.filename, csv: built.csv, rows: built.rows, hash: built.hash },
    log: {
      event: `Export generated · ${built.templateSlug} · ${built.periodRecord} · ${built.rows} rows · ${built.hash}`,
      record: record.exportId,
    },
  }
}

// ── The reducer ─────────────────────────────────────────────────────────────

const HANDLERS = {
  DECIDE_CLAIM: decideClaim,
  REQUEST_EVIDENCE: requestEvidence,
  EVIDENCE_RECEIVED: evidenceReceived,
  COUNTERSIGN: countersign,
  LOG_INCIDENT: logIncident,
  SEND_ESCALATION: sendEscalation,
  RECORD_ACK: recordAck,
  SET_INCIDENT_STATUS: setIncidentStatus,
  CLOSE_INCIDENT: closeIncident,
  TRIAGE_ALERT: triageAlert,
  REVIEW_CHECK: reviewCheck,
  CREATE_TASK: createTask,
  UPDATE_TASK: updateTask,
  LOG_PATROL: logPatrol,
  GENERATE_EXPORT: generateExport,
}

/** Appends one activity entry, chained from the previous entry's check value, and advances the AL sequence. */
function appendActivity(next, log, now) {
  const previous = next.activity.length > 0 ? next.activity[0].hash : ''
  const entry = {
    ref: makeAuditLogId(next.seq.AL),
    when: formatEat(now, 'datetime'),
    who: log.who ?? OFFICER_ID,
    event: log.event,
    record: log.record,
  }
  const hash = chainHash(previous, entry)
  const full = log.tone ? { ...entry, hash, tone: log.tone } : { ...entry, hash }
  return { ...next, activity: [full, ...next.activity], seq: { ...next.seq, AL: next.seq.AL + 1 } }
}

/**
 * Applies one action. `ref` defaults to the seeded reference data. Returns
 * `{ state, result }`, or `{ state, error }` where `state` is the input object.
 */
export function reduce(state, action, now, ref = REF) {
  if (!action || typeof action.type !== 'string') return { state, error: 'Unknown action.' }
  if (action.type === 'RESET') return { state: SEED_STATE, result: null }
  const handler = HANDLERS[action.type]
  if (!handler) return { state, error: `Unknown action: ${action.type}.` }
  if (!isFiniteNumber(now)) return { state, error: 'The demo clock is not available.' }
  const out = handler(state, action.payload ?? {}, { now, ref, state })
  if (out.error) return { state, error: out.error }
  return { state: appendActivity(out.state, out.log, now), result: out.result }
}
