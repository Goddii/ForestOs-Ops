// Session state for the Operations Manager's actions. Every other role's
// interactive screen keeps its changes in local component state, which is
// enough when an action only matters on the screen that took it. The ops
// desk is different: sending a standby lorry on Leaf Logistics has to clear
// the same item from the Overview's "needs action" queue, and every action
// belongs in one running log — so the role's screens share this one small
// store instead.
//
// Still a prototype: plain in-memory state behind `useSyncExternalStore`,
// seeded from `OPERATIONS`, never written anywhere. A reload (or "Reset
// demo") puts everything back. Where a real backend lands, each action below
// is the call it would make.

import { useSyncExternalStore } from 'react'
import { OPERATIONS, blockName, centreName, responderName } from './operationsManager'
import { NATIONAL } from './operationsNational'

const clone = (value) => structuredClone(value)

function initialState() {
  return {
    centres: clone(OPERATIONS.centres),
    lorries: clone(OPERATIONS.lorries),
    muster: clone(OPERATIONS.muster),
    workOrders: clone(OPERATIONS.workOrders),
    requisitions: clone(OPERATIONS.requisitions),
    budget: clone(OPERATIONS.budget.lines),
    incidents: clone(OPERATIONS.incidents),
    payrollBlocks: clone(OPERATIONS.payroll.blocks),
    plucking: clone(OPERATIONS.plucking.blocks),
    assets: clone(OPERATIONS.assets),
    conservation: clone(OPERATIONS.conservation),
    fireWatch: false,
    released: null, // { at, blocks, amountKes, workers, batchRef }
    reportSentAt: null,
    reminders: {}, // `${block}:${kind}` → time sent
    redeployments: [],
    woSeq: 416,
    log: [],
    deskZone: 'SWM', // which zone the Zone Desk is looking at
    national: {
      escalations: clone(NATIONAL.escalations),
      referrals: clone(NATIONAL.referrals),
      zoneFireWatch: {}, // zone id → true, for zones HQ ordered onto fire watch
      partnerDone: {}, // partner id → time the next action was taken
      contacts: [], // { partnerId, note, at }
      diversions: [],
      lorryLoans: [],
      seedlingMoves: [],
      chased: {}, // `${zone}:${kind}` → time
      floatRequested: null,
      mdReportSentAt: null,
    },
  }
}

let state = initialState()
const listeners = new Set()

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function nowHHMM() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function update(recipe, entry) {
  const next = recipe(state)
  if (entry) {
    next.log = [{ id: `LOG-${next.log.length + 1}`, at: nowHHMM(), ...entry }, ...next.log]
  }
  state = next
  listeners.forEach((listener) => listener())
}

const patchById = (list, id, patch, key = 'id') => list.map((item) => (item[key] === id ? { ...item, ...patch } : item))

/** The Operations Manager's session state, re-rendering on every action. */
export function useOperations() {
  return useSyncExternalStore(subscribe, () => state)
}

// Work orders raised from anywhere in the role go through here, so an order
// raised from Buffer & Conservation or Field Teams lands on Work Orders too.
function nextWorkOrderId() {
  return `WO-SWM-${String(state.woSeq).padStart(4, '0')}`
}

function withWorkOrder(s, id, fields) {
  return {
    ...s,
    woSeq: s.woSeq + 1,
    workOrders: [{ id, priority: 'Normal', status: 'Scheduled', requestedBy: 'Ops desk · you', ...fields }, ...s.workOrders],
  }
}

// ── Leaf logistics ────────────────────────────────────────────────────────

/** Send a standby lorry to take over a broken-down lorry's load and remaining run. */
export function coverBreakdown(standbyId, brokenId) {
  const broken = state.lorries.find((l) => l.id === brokenId)
  if (!broken) return
  const remaining = broken.route.filter((c) => state.centres.find((x) => x.id === c)?.awaitingKg > 0)
  update(
    (s) => ({
      ...s,
      lorries: s.lorries.map((l) => {
        if (l.id === standbyId)
          return {
            ...l,
            status: 'En route',
            route: remaining,
            loadKg: broken.loadKg,
            leafAgeHrs: broken.leafAgeHrs,
            eta: 'Transfer ~09:50 · then Tinet',
            note: `Covering ${brokenId} — collecting its ${broken.loadKg} kg at Kaptagich junction first`,
          }
        if (l.id === brokenId)
          return { ...l, status: 'Recovery', loadKg: 0, note: `Load transferred to ${standbyId} · awaiting tow` }
        return l
      }),
      centres: s.centres.map((c) => (remaining.includes(c.id) ? { ...c, assignedLorry: standbyId } : c)),
      incidents: s.incidents.map((i) =>
        i.type === 'Lorry breakdown' && i.location.startsWith(brokenId)
          ? { ...i, status: 'In progress', assignedLabel: `Transport · ${standbyId}`, note: `${standbyId} sent to recover the load and finish the run` }
          : i,
      ),
    }),
    { text: `Sent ${standbyId} to cover ${brokenId}'s run`, to: 'desk/logistics' },
  )
}

/** Send an available lorry to a centre with leaf waiting. */
export function dispatchToCentre(lorryId, centreId) {
  update(
    (s) => ({
      ...s,
      lorries: patchById(s.lorries, lorryId, { status: 'En route', route: [centreId], eta: 'Pickup ~40 min', note: `Dispatched to ${centreName(centreId)} centre` }),
      centres: patchById(s.centres, centreId, { assignedLorry: lorryId }),
    }),
    { text: `Dispatched ${lorryId} to ${centreName(centreId)} centre`, to: 'desk/logistics' },
  )
}

const BOOKING_TEXT = {
  service: 'garage service',
  inspection: 'motor-vehicle inspection',
  calibration: 'Weights & Measures re-verification',
}

/** Book a lorry service / inspection, or a weighbridge re-verification. */
export function bookAsset(kind, id) {
  const group = kind === 'calibration' ? 'scales' : 'fleet'
  const label = kind === 'calibration' ? `${state.assets.scales.find((x) => x.id === id)?.centre} weighbridge` : id
  update(
    (s) => ({
      ...s,
      assets: {
        ...s.assets,
        [group]: s.assets[group].map((a) => (a.id === id ? { ...a, booked: { ...(a.booked ?? {}), [kind]: 'Booked · Thu 10 Sep' } } : a)),
      },
    }),
    { text: `Booked ${BOOKING_TEXT[kind]} · ${label} · Thu 10 Sep`, to: 'desk/logistics' },
  )
}

// ── Field teams ──────────────────────────────────────────────────────────

const REMINDER_TEXT = {
  sync: 'sync their device',
  muster: 'close the muster',
  payroll: 'review and approve this week’s payroll',
}

/** SMS a block supervisor a nudge. `kind`: 'sync' | 'muster' | 'payroll'. */
export function sendReminder(block, kind) {
  const supervisor = state.muster.find((m) => m.block === block)?.supervisor ?? block
  update(
    (s) => ({ ...s, reminders: { ...s.reminders, [`${block}:${kind}`]: nowHHMM() } }),
    { text: `SMS to ${supervisor} (${blockName(block)}) — ${REMINDER_TEXT[kind]}`, to: kind === 'payroll' ? 'desk/payroll' : 'desk/teams' },
  )
}

/** Move part of one block's mustered crew to another block for the day. */
export function redeployCrew(from, to, count, reason) {
  update(
    (s) => ({
      ...s,
      muster: s.muster.map((m) => {
        if (m.block === from) return { ...m, present: m.present - count, lent: (m.lent ?? 0) + count }
        if (m.block === to) return { ...m, present: m.present + count, borrowed: (m.borrowed ?? 0) + count }
        return m
      }),
      redeployments: [{ from, to, count, reason, at: nowHHMM() }, ...s.redeployments],
    }),
    { text: `Redeployed ${count} workers ${blockName(from)} → ${blockName(to)} · ${reason}`, to: 'desk/teams' },
  )
}

/** Put an overdue block's plucking round into the schedule as a work order. */
export function schedulePluckingRound(block) {
  const id = nextWorkOrderId()
  const crew = state.muster.find((m) => m.block === block)?.present ?? 0
  update(
    (s) => ({
      ...withWorkOrder(s, id, { type: 'Plucking round', block, scope: 'Whole block · fine plucking standard', crew, start: '2026-09-08', priority: 'High' }),
      plucking: patchById(s.plucking, block, { scheduled: id }, 'block'),
    }),
    { text: `Scheduled ${blockName(block)} plucking round for Tue 8 Sep (${id})`, to: 'desk/teams' },
  )
}

// ── Work orders & stores ─────────────────────────────────────────────────

export function approveWorkOrder(id) {
  update((s) => ({ ...s, workOrders: patchById(s.workOrders, id, { status: 'Scheduled' }) }), {
    text: `Approved and scheduled ${id}`,
    to: 'desk/work',
  })
}

export function declineWorkOrder(id) {
  update((s) => ({ ...s, workOrders: patchById(s.workOrders, id, { status: 'Declined' }) }), {
    text: `Declined ${id}`,
    to: 'desk/work',
  })
}

export function createWorkOrder({ type, block, scope, crew, start, priority }) {
  const id = nextWorkOrderId()
  update((s) => withWorkOrder(s, id, { type, block, scope, crew, start, priority }), {
    text: `Raised ${id} · ${type} · ${blockName(block)}`,
    to: 'desk/work',
  })
}

/** Requested value of a requisition, which is what delegated authority is judged on. */
export const requisitionValue = (r) => r.qty * r.unitKes

/**
 * Approve or decline a stores requisition. Approving more than is on hand
 * issues what there is and records the shortfall rather than pretending the
 * whole quantity went out; the issued value is charged to its budget line.
 * Anything over the ops desk's approval limit can only be referred up.
 */
export function decideRequisition(id, approve) {
  const req = state.requisitions.find((r) => r.id === id)
  if (!req) return
  if (approve && requisitionValue(req) > OPERATIONS.approvalLimitKes) return
  const issued = approve ? Math.min(req.qty, req.onHand) : 0
  const costKes = issued * req.unitKes
  const status = !approve ? 'Declined' : issued < req.qty ? 'Part-issued' : 'Issued'
  update(
    (s) => ({
      ...s,
      requisitions: patchById(s.requisitions, id, { status, issued, onHand: req.onHand - issued }),
      budget: s.budget.map((line) => (line.id === req.line ? { ...line, spentKes: line.spentKes + costKes } : line)),
    }),
    {
      text: approve
        ? `${status} ${id} · ${issued.toLocaleString()} of ${req.qty.toLocaleString()} ${req.unit}${issued < req.qty ? ` — ${(req.qty - issued).toLocaleString()} short` : ''}${costKes ? ` · KES ${costKes.toLocaleString()}` : ''}`
        : `Declined ${id}`,
      to: 'desk/work',
    },
  )
}

/** Refer a requisition above the zone desk's limit up to HQ Operations. */
export function referRequisition(id) {
  update((s) => ({ ...s, requisitions: patchById(s.requisitions, id, { status: 'Referred' }) }), {
    text: `Referred ${id} up to HQ Operations — above the zone desk's KES ${OPERATIONS.approvalLimitKes.toLocaleString()} limit`,
    to: 'desk/work',
  })
}

// ── Buffer & conservation ────────────────────────────────────────────────

/** Start the dry-season fire-watch rota (lookouts on the forest edge, dawn and dusk). */
export function activateFireWatch() {
  update((s) => ({ ...s, fireWatch: true }), {
    text: 'Activated dry-season fire-watch rota — edge lookouts dawn and dusk, all blocks',
    to: 'desk/conservation',
  })
}

/** Raise a work order to clear a block's outstanding firebreak. */
export function raiseFirebreakOrder(block) {
  const fb = state.conservation.firebreaks.find((f) => f.block === block)
  const km = +(fb.requiredKm - fb.clearedKm).toFixed(1)
  const id = nextWorkOrderId()
  update(
    (s) => ({
      ...withWorkOrder(s, id, { type: 'Firebreak clearing', block, scope: `${km} km outstanding on the forest edge`, crew: Math.ceil(km * 8), start: '2026-09-09', priority: 'High' }),
      conservation: { ...s.conservation, firebreaks: patchById(s.conservation.firebreaks, block, { orderId: id }, 'block') },
    }),
    { text: `Raised ${id} · clear ${km} km of firebreak · ${blockName(block)}`, to: 'desk/conservation' },
  )
}

/** Schedule an extra edge patrol this week. */
export function schedulePatrol(block, day, partner) {
  update(
    (s) => ({
      ...s,
      conservation: {
        ...s.conservation,
        patrols: s.conservation.patrols.map((p) => (p.block === block ? { ...p, scheduled: [...p.scheduled, { day, partner }] } : p)),
      },
    }),
    { text: `Scheduled ${partner.toLowerCase()} patrol · ${blockName(block)} edge · ${day}`, to: 'desk/conservation' },
  )
}

/** Allocate plantable seedlings from the zone nursery to a block's short-rains planting. */
export function allocateSeedlings(block, species, qty) {
  update(
    (s) => ({
      ...s,
      conservation: {
        ...s.conservation,
        nursery: s.conservation.nursery.map((n) => (n.species === species ? { ...n, ready: n.ready - qty } : n)),
        planting: s.conservation.planting.map((p) => (p.block === block ? { ...p, allocated: p.allocated + qty } : p)),
      },
    }),
    { text: `Allocated ${qty.toLocaleString()} ${species.split(' (')[0]} seedlings to ${blockName(block)}`, to: 'desk/conservation' },
  )
}

/** Put a cohort's due survival check into the schedule. */
export function scheduleSurvivalCheck(cohortId) {
  const c = state.conservation.cohorts.find((x) => x.id === cohortId)
  const id = nextWorkOrderId()
  update(
    (s) => ({
      ...withWorkOrder(s, id, { type: 'Survival check', block: c.plot.slice(0, 3), scope: `${c.plot} · ${c.nextCheck} count of ${c.planted} trees`, crew: 4, start: '2026-09-10' }),
      conservation: { ...s.conservation, cohorts: patchById(s.conservation.cohorts, cohortId, { status: 'Check scheduled', checkOrder: id }) },
    }),
    { text: `Scheduled ${c.nextCheck} survival check · ${c.plot} (${id})`, to: 'desk/conservation' },
  )
}

/** Order replacement planting ("beating up") for a cohort below the survival target. */
export function orderBeatUp(cohortId) {
  const c = state.conservation.cohorts.find((x) => x.id === cohortId)
  const gaps = Math.round(c.planted * (1 - c.survivalPct / 100))
  const id = nextWorkOrderId()
  update(
    (s) => ({
      ...withWorkOrder(s, id, { type: 'Beating up (replanting)', block: c.plot.slice(0, 3), scope: `${c.plot} · replant ~${gaps} dead seedlings`, crew: 6, start: '2026-10-15' }),
      conservation: { ...s.conservation, cohorts: patchById(s.conservation.cohorts, cohortId, { beatUp: id }) },
    }),
    { text: `Ordered replanting of ~${gaps} gaps · ${c.plot} for the short rains (${id})`, to: 'desk/conservation' },
  )
}

/** Raise a work order to replace missing and damaged boundary beacons. */
export function raiseBeaconRepair() {
  const b = state.conservation.beacons
  const id = nextWorkOrderId()
  update(
    (s) => ({
      ...withWorkOrder(s, id, { type: 'Beacon repair', block: 'TIN', scope: `${b.missing} missing + ${b.damaged} damaged beacons · ${b.where}`, crew: 4, start: '2026-09-15' }),
      conservation: { ...s.conservation, beacons: { ...s.conservation.beacons, orderId: id } },
    }),
    { text: `Raised ${id} · replace ${b.missing} missing and repair ${b.damaged} damaged boundary beacons`, to: 'desk/conservation' },
  )
}

// ── Incidents ────────────────────────────────────────────────────────────

export function assignIncident(id, responderId) {
  update(
    (s) => ({
      ...s,
      incidents: patchById(s.incidents, id, { assigned: responderId, assignedLabel: null, status: 'Responding' }),
    }),
    { text: `Assigned ${responderName(responderId)} to ${id}`, to: 'desk/incidents' },
  )
}

export function escalateIncident(id) {
  update(
    (s) => ({ ...s, incidents: s.incidents.map((i) => (i.id === id ? { ...i, status: 'Escalated', escalatedToZone: true } : i)) }),
    { text: `Escalated ${id} to the Zone Manager`, to: 'desk/incidents' },
  )
}

export function resolveIncident(id, note) {
  update(
    (s) => ({ ...s, incidents: patchById(s.incidents, id, { status: 'Resolved', resolution: note }) }),
    { text: `Closed ${id}${note ? ` — ${note}` : ''}`, to: 'desk/incidents' },
  )
}

/** File the statutory report an incident carries (e.g. a work-injury report). */
export function fileStatutoryReport(id) {
  const inc = state.incidents.find((i) => i.id === id)
  update(
    (s) => ({ ...s, incidents: s.incidents.map((i) => (i.id === id ? { ...i, statutory: { ...i.statutory, filed: nowHHMM() } } : i)) }),
    { text: `Filed ${inc.statutory.label} for ${id}`, to: 'desk/incidents' },
  )
}

// ── Payroll ──────────────────────────────────────────────────────────────

/**
 * Release the supervisor-approved blocks to M-Pesa, minus held lines. The ops
 * desk is the checker, never the maker — an unapproved block is excluded, not
 * approved on its supervisor's behalf.
 */
export function releasePayroll(blockIds) {
  const blocks = state.payrollBlocks.filter((b) => blockIds.includes(b.block) && b.approved && !b.releasedAt)
  if (blocks.length === 0) return
  const heldKes = OPERATIONS.payroll.held
    .filter((h) => blocks.some((b) => b.block === h.block))
    .reduce((sum, h) => sum + h.amountKes, 0)
  const amountKes = blocks.reduce((sum, b) => sum + b.grossKes, 0) - heldKes
  const workers = blocks.reduce((sum, b) => sum + b.workers, 0)
  const at = nowHHMM()
  const batchRef = `B2C-SWM-W36-${String(state.log.length + 1).padStart(3, '0')}`
  update(
    (s) => ({
      ...s,
      payrollBlocks: s.payrollBlocks.map((b) => (blocks.some((x) => x.block === b.block) ? { ...b, releasedAt: at, batchRef } : b)),
      released: { at, blocks: blocks.map((b) => b.block), amountKes, workers, batchRef },
    }),
    { text: `Released ${batchRef} · KES ${amountKes.toLocaleString()} to ${workers.toLocaleString()} workers (${blocks.map((b) => b.name).join(', ')})`, to: 'desk/payroll' },
  )
}

// ── Reporting ────────────────────────────────────────────────────────────

/** The day's ops report as plain lines, composed from current state. */
export function dailyReportLines(s) {
  const k = opsKpis(s)
  const openInc = s.incidents.filter(OPEN)
  const approved = s.payrollBlocks.filter((b) => b.approved).length
  const breakdown = s.lorries.filter((l) => l.status === 'Breakdown' || l.status === 'Recovery').map((l) => l.id)
  return [
    `Leaf: ${k.collectedKg.toLocaleString()} kg collected of ${k.planKg.toLocaleString()} kg plan (${Math.round((k.collectedKg / k.planKg) * 100)}%). Oldest leaf not yet at ${OPERATIONS.factory}: ${k.maxLeafAgeHrs} h.`,
    `Crews: ${k.present.toLocaleString()} of ${k.rostered.toLocaleString()} mustered (${k.turnoutPct}%). ${s.muster.filter((m) => !m.syncOk).length} supervisor device(s) offline.`,
    `Fleet: ${k.lorriesMoving} of ${k.lorriesTotal} lorries moving${breakdown.length ? `; ${breakdown.join(', ')} off the road` : ''}.`,
    `Incidents: ${openInc.length} open, ${openInc.filter((i) => i.severity === 'Critical').length} critical, ${openInc.filter((i) => !i.assigned && !i.assignedLabel).length} unassigned.`,
    `Fire: danger ${OPERATIONS.conservation.fireDanger.rating.toLowerCase()}, fire watch ${s.fireWatch ? 'active' : 'not yet active'}.`,
    s.released
      ? `Payroll: ${s.released.batchRef} released, KES ${s.released.amountKes.toLocaleString()} to ${s.released.workers.toLocaleString()} workers.`
      : `Payroll: ${approved} of ${s.payrollBlocks.length} blocks supervisor-approved; batch not yet released.`,
    `Actions from the ops desk today: ${s.log.length}.`,
  ]
}

export function sendDailyReport() {
  update((s) => ({ ...s, reportSentAt: nowHHMM() }), {
    text: 'Sent the South West Mau daily report to the Zone Manager (David Kemei)',
    to: 'desk',
  })
}

/** Switch the Zone Desk to another zone (a view change, not logged). */
export function setDeskZone(zoneId) {
  update((s) => ({ ...s, deskZone: zoneId }))
}

export function resetOperationsDemo() {
  state = initialState()
  listeners.forEach((listener) => listener())
}

// ── Derived ──────────────────────────────────────────────────────────────

const OPEN = (i) => i.status !== 'Resolved'

/**
 * The ops desk's "needs action" queue, derived from current state so taking
 * an action anywhere in the role clears its card here. Ordered by severity.
 */
export function needsAction(s) {
  const items = []
  const c = s.conservation
  for (const lorry of s.lorries.filter((l) => l.status === 'Breakdown')) {
    items.push({ id: `lorry-${lorry.id}`, tone: 'critical', tag: 'Now', title: `${lorry.id} broken down with ${lorry.loadKg} kg on board`, detail: `Leaf ${lorry.leafAgeHrs} h old · ${lorry.note}`, to: 'logistics', cta: 'Send standby' })
  }
  for (const inc of s.incidents.filter((i) => OPEN(i) && i.severity === 'Critical' && !i.assigned)) {
    items.push({ id: `inc-${inc.id}`, tone: 'critical', tag: 'Now', title: `${inc.type} · ${inc.location}`, detail: `${inc.note} · no crew assigned`, to: 'incidents', cta: 'Assign crew' })
  }
  const breakShort = c.firebreaks.filter((f) => f.clearedKm < f.requiredKm && !f.orderId)
  if (!s.fireWatch || breakShort.length) {
    const km = breakShort.reduce((sum, f) => sum + f.requiredKm - f.clearedKm, 0)
    items.push({ id: 'fire', tone: 'warn', tag: 'Fire risk', title: `Fire danger ${c.fireDanger.rating.toLowerCase()} · ${c.fireDanger.dryDays} dry days`, detail: [!s.fireWatch && 'Fire watch not active', breakShort.length && `${km.toFixed(1)} km of firebreak uncleared across ${breakShort.length} blocks`].filter(Boolean).join(' · '), to: 'conservation', cta: 'Fire readiness' })
  }
  for (const cn of s.centres.filter((x) => x.awaitingKg > 0 && !x.assignedLorry)) {
    items.push({ id: `centre-${cn.id}`, tone: 'warn', tag: 'Leaf waiting', title: `${cn.awaitingKg} kg waiting at ${cn.name} centre`, detail: `Oldest leaf ${cn.oldestLeafHrs} h · no lorry assigned`, to: 'logistics', cta: 'Dispatch' })
  }
  const unapproved = s.payrollBlocks.filter((b) => !b.approved)
  if (unapproved.length && !s.released) {
    items.push({ id: 'payroll', tone: 'warn', tag: 'Pay Tue', title: `Week 36 payroll — ${unapproved.map((b) => b.name).join(', ')} not approved`, detail: `${unapproved[0].supervisor} · ${unapproved[0].note ?? 'awaiting supervisor'}`, to: 'payroll', cta: 'Review run' })
  }
  for (const inc of s.incidents.filter((i) => OPEN(i) && i.statutory && !i.statutory.filed)) {
    items.push({ id: `stat-${inc.id}`, tone: 'warn', tag: 'Report due', title: `${inc.statutory.label} not filed`, detail: `${inc.id} · ${inc.location}`, to: 'incidents', cta: 'File' })
  }
  for (const p of s.plucking.filter((x) => x.daysSince > OPERATIONS.plucking.intervalDays && !x.scheduled)) {
    items.push({ id: `pluck-${p.block}`, tone: 'warn', tag: 'Plucking', title: `${blockName(p.block)} plucking round ${p.daysSince} days old`, detail: `Target every ${OPERATIONS.plucking.intervalDays} days · fine leaf ${p.fineLeafPct}% (factory wants ≥ ${OPERATIONS.plucking.fineLeafTargetPct}%)`, to: 'teams', cta: 'Schedule' })
  }
  for (const sc of s.assets.scales.filter((x) => !x.ok && !x.booked?.calibration)) {
    items.push({ id: `scale-${sc.id}`, tone: 'warn', tag: 'Scale', title: `${sc.centre} weighbridge certificate · ${sc.certificate.toLowerCase()}`, detail: 'Kilos weighed on an uncertified scale are weak evidence for pay and for the export chain', to: 'logistics', cta: 'Book' })
  }
  for (const m of s.muster.filter((x) => !x.syncOk && !s.reminders[`${x.block}:sync`])) {
    items.push({ id: `sync-${m.block}`, tone: 'warn', tag: 'Offline', title: `${m.name} supervisor device ${m.sync.toLowerCase()}`, detail: m.note, to: 'teams', cta: 'Chase' })
  }
  for (const inc of s.incidents.filter((i) => OPEN(i) && i.severity !== 'Critical' && !i.assigned && !i.assignedLabel)) {
    items.push({ id: `inc-${inc.id}`, tone: inc.severity === 'High' ? 'warn' : 'default', tag: 'Assign', title: `${inc.type} · ${inc.location}`, detail: inc.note, to: 'incidents', cta: 'Assign' })
  }
  for (const co of c.cohorts.filter((x) => x.survivalPct < c.survivalTargetPct && !x.beatUp)) {
    items.push({ id: `coh-${co.id}`, tone: 'default', tag: 'Survival', title: `${co.plot} survival ${co.survivalPct}% — under the ${c.survivalTargetPct}% target`, detail: `${co.planted} planted in the ${co.season.toLowerCase()} · replant the gaps in the short rains`, to: 'conservation', cta: 'Order replanting' })
  }
  if (!s.released) {
    items.push({ id: 'payroll-release', tone: 'default', tag: 'Release', title: `Release ${OPERATIONS.payroll.ref} to M-Pesa`, detail: `${s.payrollBlocks.filter((b) => b.approved).length} of ${s.payrollBlocks.length} blocks approved · pay date ${OPERATIONS.payroll.payDate}`, to: 'payroll', cta: 'Open run' })
  }
  const woRequested = s.workOrders.filter((w) => w.status === 'Requested').length
  const reqPending = s.requisitions.filter((r) => r.status === 'Pending').length
  if (woRequested + reqPending > 0) {
    items.push({ id: 'approvals', tone: 'default', tag: 'Approve', title: `${woRequested} work orders · ${reqPending} stores requisitions awaiting you`, detail: 'Firebreak clearing on the Kiptunga north edge is marked high priority', to: 'work', cta: 'Review' })
  }
  return items
}

/** Headline figures for the Overview KPI row. */
export function opsKpis(s) {
  const collectedKg = s.centres.reduce((sum, c) => sum + c.collectedKg, 0)
  const planKg = s.centres.reduce((sum, c) => sum + c.planKg, 0)
  const rostered = s.muster.reduce((sum, m) => sum + m.rostered, 0)
  const present = s.muster.reduce((sum, m) => sum + m.present, 0)
  const loaded = s.lorries.filter((l) => l.loadKg > 0)
  const maxLeafAgeHrs = Math.max(0, ...loaded.map((l) => l.leafAgeHrs), ...s.centres.filter((c) => c.awaitingKg > 0).map((c) => c.oldestLeafHrs))
  const openIncidents = s.incidents.filter(OPEN)
  return {
    collectedKg,
    planKg,
    rostered,
    present,
    turnoutPct: Math.round((present / rostered) * 100),
    maxLeafAgeHrs,
    lorriesMoving: s.lorries.filter((l) => l.status === 'En route' || l.status === 'At factory').length,
    lorriesTotal: s.lorries.length,
    openIncidents: openIncidents.length,
    criticalIncidents: openIncidents.filter((i) => i.severity === 'Critical').length,
  }
}

// ── National (HQ) ────────────────────────────────────────────────────────
// The Operations Manager's own desk: every zone, every kind of operation.
// Actions here act on the national slice; South West Mau's row is computed
// from the desk state above, so desk actions roll up automatically.

const patchNational = (recipe) => (s) => ({ ...s, national: recipe(s.national) })

const zoneName = (id) => (id === 'SWM' ? 'South West Mau' : (NATIONAL.zones.find((z) => z.id === id)?.name ?? id))
export { zoneName }

/**
 * Acknowledge an escalation and send HQ support. Escalations from the SW Mau
 * desk are the desk's own incidents, so the HQ response lands there too.
 */
export function supportEscalation(id, supportId) {
  const support = NATIONAL.hqSupport.find((h) => h.id === supportId)?.name ?? supportId
  const fromDesk = state.incidents.some((i) => i.id === id)
  update(
    (s) =>
      fromDesk
        ? { ...s, incidents: patchById(s.incidents, id, { hq: support }) }
        : { ...s, national: { ...s.national, escalations: patchById(s.national.escalations, id, { status: 'HQ responding', hq: support }) } },
    { text: `Sent ${support} to ${id}`, to: 'incidents' },
  )
}

export function closeEscalation(id, note) {
  const fromDesk = state.incidents.some((i) => i.id === id)
  update(
    (s) =>
      fromDesk
        ? { ...s, incidents: patchById(s.incidents, id, { status: 'Resolved', resolution: note }) }
        : { ...s, national: { ...s.national, escalations: patchById(s.national.escalations, id, { status: 'Closed', resolution: note }) } },
    { text: `Closed ${id} — ${note}`, to: 'incidents' },
  )
}

/**
 * Decide a spending referral from a zone. `decision`: 'Approved' |
 * 'Declined' | 'Sent to MD'. Referrals from the SW Mau desk are its own
 * requisitions, so the decision lands back on the desk too.
 */
export function decideReferral(id, decision) {
  const fromDesk = state.requisitions.some((r) => r.id === id)
  if (decision === 'Approved') {
    const value = fromDesk ? requisitionValue(state.requisitions.find((r) => r.id === id)) : state.national.referrals.find((r) => r.id === id)?.valueKes
    if (value > NATIONAL.approvalLimitKes) return
  }
  update(
    (s) =>
      fromDesk
        ? { ...s, requisitions: patchById(s.requisitions, id, { status: `HQ: ${decision}` }) }
        : { ...s, national: { ...s.national, referrals: patchById(s.national.referrals, id, { status: decision }) } },
    { text: `${decision === 'Sent to MD' ? 'Sent to the Managing Director with recommendation' : decision} · ${id}`, to: 'approvals' },
  )
}

/** Take a partnership's next action. */
export function partnerAction(id) {
  const p = NATIONAL.partners.find((x) => x.id === id)
  update(patchNational((n) => ({ ...n, partnerDone: { ...n.partnerDone, [id]: nowHHMM() } })), {
    text: `${p.action} · ${p.partner}`,
    to: 'partnerships',
  })
}

export function logPartnerContact(partnerId, note) {
  const p = NATIONAL.partners.find((x) => x.id === partnerId)
  update(patchNational((n) => ({ ...n, contacts: [{ partnerId, note, at: nowHHMM() }, ...n.contacts] })), {
    text: `Logged contact · ${p.partner} — ${note}`,
    to: 'partnerships',
  })
}

/** Order a zone onto dry-season fire watch. SW Mau's is the desk's own switch. */
export function orderZoneFireWatch(zoneId) {
  if (zoneId === 'SWM') {
    update((s) => ({ ...s, fireWatch: true }), { text: 'Ordered fire watch · South West Mau', to: 'conservation' })
    return
  }
  update(patchNational((n) => ({ ...n, zoneFireWatch: { ...n.zoneFireWatch, [zoneId]: true } })), {
    text: `Ordered fire watch · ${zoneName(zoneId)}`,
    to: 'conservation',
  })
}

/** Divert a zone's overflow leaf from one factory to another for the week. */
export function divertLeaf(fromId, toId, tPerDay) {
  const name = (id) => NATIONAL.factories.find((f) => f.id === id)?.name
  update(patchNational((n) => ({ ...n, diversions: [...n.diversions, { fromId, toId, tPerDay }] })), {
    text: `Diverted ${tPerDay} t/day from ${name(fromId)} to ${name(toId)} for the week`,
    to: 'tea',
  })
}

export function lendLorry(lorryId, toZone) {
  update(patchNational((n) => ({ ...n, lorryLoans: [...n.lorryLoans, { lorryId, toZone }] })), {
    text: `Lent ${lorryId} to ${zoneName(toZone)} for the week`,
    to: 'tea',
  })
}

export function moveSeedlings(fromZone, toZone, qty) {
  update(patchNational((n) => ({ ...n, seedlingMoves: [...n.seedlingMoves, { fromZone, toZone, qty }] })), {
    text: `Moved ${qty.toLocaleString()} seedlings ${zoneName(fromZone)} → ${zoneName(toZone)}`,
    to: 'conservation',
  })
}

const CHASE_TEXT = { payroll: 'get the outstanding blocks approved and released', grievance: 'respond to the late-pay grievances', devices: 'get offline supervisor devices synced' }

/** Chase a zone lead about something outstanding. */
export function chaseZone(zoneId, kind) {
  const lead = zoneId === 'SWM' ? 'David Kemei' : NATIONAL.zones.find((z) => z.id === zoneId)?.lead
  update(patchNational((n) => ({ ...n, chased: { ...n.chased, [`${zoneId}:${kind}`]: nowHHMM() } })), {
    text: `Chased ${lead} (${zoneName(zoneId)}) to ${CHASE_TEXT[kind]}`,
    to: 'people',
  })
}

export function requestFloatTopUp(amountKes) {
  update(patchNational((n) => ({ ...n, floatRequested: { amountKes, at: nowHHMM() } })), {
    text: `Asked Finance to top up the M-Pesa B2C float by KES ${amountKes.toLocaleString()}`,
    to: 'people',
  })
}

export function sendMdReport() {
  update(patchNational((n) => ({ ...n, mdReportSentAt: nowHHMM() })), {
    text: 'Sent the national operations report to the Managing Director',
    to: '',
  })
}

/** South West Mau's national row, computed from the live desk state. */
function swmRow(s) {
  const k = opsKpis(s)
  const c = s.conservation
  const released = s.payrollBlocks.filter((b) => b.releasedAt)
  const unapproved = s.payrollBlocks.filter((b) => !b.approved).length
  const unreleasedGross = s.payrollBlocks.filter((b) => !b.releasedAt).reduce((sum, b) => sum + b.grossKes, 0)
  const kmCleared = c.firebreaks.reduce((sum, f) => sum + f.clearedKm, 0)
  const kmRequired = c.firebreaks.reduce((sum, f) => sum + f.requiredKm, 0)
  const planted = c.cohorts.reduce((sum, x) => sum + x.planted, 0)
  const openInc = s.incidents.filter(OPEN)
  const top = needsAction(s)[0]
  return {
    id: 'SWM',
    name: 'South West Mau',
    lead: 'David Kemei',
    factory: OPERATIONS.factory,
    county: 'Nakuru',
    desk: true,
    leafKg: k.collectedKg,
    planKg: k.planKg,
    maxLeafAgeHrs: k.maxLeafAgeHrs,
    fleet: { moving: k.lorriesMoving, total: k.lorriesTotal, down: s.lorries.filter((l) => l.status === 'Breakdown').length },
    rejectionPct: 4.2,
    fineLeafPct: Math.round(s.plucking.reduce((sum, p) => sum + p.fineLeafPct, 0) / s.plucking.length),
    pluckingOverdue: s.plucking.filter((p) => p.daysSince > OPERATIONS.plucking.intervalDays && !p.scheduled).length,
    rostered: k.rostered,
    present: k.present,
    devicesOffline: s.muster.filter((m) => !m.syncOk).length,
    payroll: {
      status: released.length === s.payrollBlocks.length ? 'Released' : released.length ? `Released · ${s.payrollBlocks.length - released.length} block held` : unapproved ? `Awaiting ${unapproved} block` : 'Ready to release',
      grossKes: s.payrollBlocks.reduce((sum, b) => sum + b.grossKes, 0),
      unreleasedKes: unreleasedGross,
      workers: s.payrollBlocks.reduce((sum, b) => sum + b.workers, 0),
      settleDays: 7,
      unapproved,
    },
    disputes: OPERATIONS.payroll.held.length,
    grievances: openInc.filter((i) => i.type.startsWith('Grievance') && !i.assigned).length,
    injuriesMtd: 1,
    incidentsOpen: openInc.length,
    incidentsCritical: openInc.filter((i) => i.severity === 'Critical').length,
    fire: { danger: c.fireDanger.rating, watch: s.fireWatch, firebreakPct: Math.round((kmCleared / kmRequired) * 100) },
    patrols: { done: c.patrols.reduce((sum, p) => sum + p.done + p.scheduled.length, 0), target: OPERATIONS.conservation.patrolsPerWeek * c.patrols.length },
    planting: { allocatedPct: Math.round((c.planting.reduce((sum, p) => sum + p.allocated, 0) / c.planting.reduce((sum, p) => sum + p.treeTarget, 0)) * 100) },
    survivalPct: Math.round(c.cohorts.reduce((sum, x) => sum + x.survivalPct * x.planted, 0) / planted),
    beaconsMissing: c.beacons.orderId ? 0 : c.beacons.missing,
    headline: top ? top.title : 'Nothing waiting on the desk.',
    status: k.criticalIncidents || s.lorries.some((l) => l.status === 'Breakdown') ? 'flagged' : 'clear',
  }
}

/** Every zone's operational row, SW Mau live, with HQ's own actions applied. */
export function allZones(s) {
  const n = s.national
  const statics = NATIONAL.zones.map((z) => {
    const released = z.payroll.status === 'Released'
    return {
      ...z,
      fire: { ...z.fire, watch: z.fire.watch || Boolean(n.zoneFireWatch[z.id]) },
      fleet: { ...z.fleet, moving: z.fleet.moving + n.lorryLoans.filter((l) => l.toZone === z.id).length },
      payroll: { ...z.payroll, unreleasedKes: released ? 0 : z.payroll.grossKes },
    }
  })
  return [swmRow(s), ...statics]
}

/** Open escalations HQ sees: the static zones' plus SW Mau's escalated/critical ones. */
export function allEscalations(s) {
  const fromDesk = s.incidents
    .filter((i) => OPEN(i) && (i.severity === 'Critical' || i.escalatedToZone))
    .map((i) => ({ ...i, zone: 'SWM', fromDesk: true, status: i.hq ? 'HQ responding' : i.escalatedToZone ? 'Escalated by zone' : i.status }))
  return [...fromDesk, ...s.national.escalations]
}

/** Referrals HQ must decide: the static zones' plus any SW Mau desk referrals. */
export function allReferrals(s) {
  const fromDesk = s.requisitions
    .filter((r) => r.status === 'Referred' || r.status.startsWith('HQ:'))
    .map((r) => ({ id: r.id, zone: 'SWM', item: `${r.item} · ${r.qty} ${r.unit}`, valueKes: requisitionValue(r), line: 'Agro-inputs', requestedBy: r.requestedBy, status: r.status === 'Referred' ? 'Pending' : r.status.replace('HQ: ', ''), fromDesk: true }))
  return [...fromDesk, ...s.national.referrals]
}

/** Float needed for payrolls not yet released, against the float held. */
export function floatPosition(s) {
  const neededKes = allZones(s).reduce((sum, z) => sum + z.payroll.unreleasedKes, 0)
  const floatKes = NATIONAL.mpesa.floatKes + (s.national.floatRequested?.amountKes ?? 0)
  return { neededKes, floatKes, shortKes: Math.max(0, neededKes - floatKes) }
}

export function nationalKpis(s) {
  const zones = allZones(s)
  const sum = (pick) => zones.reduce((acc, z) => acc + pick(z), 0)
  return {
    zones,
    leafKg: sum((z) => z.leafKg),
    planKg: sum((z) => z.planKg),
    rostered: sum((z) => z.rostered),
    present: sum((z) => z.present),
    incidentsOpen: sum((z) => z.incidentsOpen),
    incidentsCritical: sum((z) => z.incidentsCritical),
    payrollReleased: zones.filter((z) => z.payroll.status === 'Released').length,
    fireHighNoWatch: zones.filter((z) => z.fire.danger === 'High' && !z.fire.watch),
    fleetMoving: sum((z) => z.fleet.moving),
    fleetTotal: sum((z) => z.fleet.total),
  }
}

/** The national "needs action" queue — HQ decisions only; zone detail lives on each desk. */
export function nationalQueue(s) {
  const items = []
  const n = s.national
  for (const e of allEscalations(s).filter((x) => x.severity === 'Critical' && !x.hq && x.status !== 'Closed' && !x.assigned)) {
    items.push({ id: `esc-${e.id}`, tone: 'critical', tag: zoneName(e.zone), title: `${e.type} · ${e.location}`, detail: e.note, to: 'incidents', cta: 'Send support' })
  }
  const float = floatPosition(s)
  if (float.shortKes > 0) {
    items.push({ id: 'float', tone: 'critical', tag: 'Pay Tue', title: `M-Pesa float KES ${(float.shortKes / 1e6).toFixed(2)}M short of Tuesday’s payrolls`, detail: `KES ${(float.neededKes / 1e6).toFixed(2)}M still to release across zones against KES ${(float.floatKes / 1e6).toFixed(2)}M held`, to: 'people', cta: 'Top up' })
  }
  const over = NATIONAL.factories.filter((f) => f.intakeT && f.intakeT > f.capacityT && !n.diversions.some((d) => d.fromId === f.id))
  for (const f of over) {
    items.push({ id: `fac-${f.id}`, tone: 'warn', tag: 'Factory', title: `${f.name} at ${Math.round((f.intakeT / f.capacityT) * 100)}% of capacity`, detail: f.note, to: 'tea', cta: 'Divert leaf' })
  }
  const zones = allZones(s)
  for (const z of zones.filter((x) => x.fleet.down >= 2 && !n.lorryLoans.some((l) => l.toZone === x.id))) {
    items.push({ id: `fleet-${z.id}`, tone: 'warn', tag: z.name, title: `${z.fleet.down} lorries down · leaf ${Math.round((z.leafKg / z.planKg) * 100)}% of plan, oldest ${z.maxLeafAgeHrs} h`, detail: 'A spare lorry is free in another zone', to: 'tea', cta: 'Lend lorry' })
  }
  for (const z of zones.filter((x) => x.fire.danger === 'High' && !x.fire.watch)) {
    items.push({ id: `fire-${z.id}`, tone: 'warn', tag: 'Fire risk', title: `${z.name}: fire danger high, no fire watch`, detail: `Firebreaks ${z.fire.firebreakPct}% cleared`, to: 'conservation', cta: 'Order watch' })
  }
  const pendingRefs = allReferrals(s).filter((r) => r.status === 'Pending')
  if (pendingRefs.length) {
    items.push({ id: 'refs', tone: 'default', tag: 'Approve', title: `${pendingRefs.length} spending referrals from zones`, detail: `KES ${(pendingRefs.reduce((sum, r) => sum + r.valueKes, 0) / 1e6).toFixed(2)}M in total · largest: ${pendingRefs.sort((a, b) => b.valueKes - a.valueKes)[0].item}`, to: 'approvals', cta: 'Review' })
  }
  const partnersDue = NATIONAL.partners.filter((p) => (p.state === 'Overdue' || p.state === 'At risk') && !n.partnerDone[p.id])
  if (partnersDue.length) {
    items.push({ id: 'partners', tone: 'warn', tag: 'Partners', title: `${partnersDue.length} partner obligations overdue or at risk`, detail: partnersDue.map((p) => p.partner.split(' (')[0]).join(' · '), to: 'partnerships', cta: 'Open' })
  }
  const swmItems = needsAction(s).length
  if (swmItems) {
    items.push({ id: 'desk', tone: 'default', tag: 'SW Mau desk', title: `${swmItems} items waiting on the South West Mau desk`, detail: needsAction(s)[0].title, to: 'desk', cta: 'Open desk' })
  }
  return items
}

/** Weekly national report to the Managing Director, composed from current state. */
export function mdReportLines(s) {
  const k = nationalKpis(s)
  const float = floatPosition(s)
  const behind = k.zones.filter((z) => z.leafKg < z.planKg * 0.85).map((z) => z.name)
  const esc = allEscalations(s).filter((e) => e.status !== 'Closed')
  return [
    `Tea: ${(k.leafKg / 1000).toFixed(1)} t green leaf collected today across ${k.zones.length} zones, ${Math.round((k.leafKg / k.planKg) * 100)}% of plan.${behind.length ? ` Behind: ${behind.join(', ')}.` : ''} Fleet ${k.fleetMoving} of ${k.fleetTotal} moving.`,
    `People: ${k.present.toLocaleString()} of ${k.rostered.toLocaleString()} buffer workers mustered (${Math.round((k.present / k.rostered) * 100)}%). Payroll released in ${k.payrollReleased} of ${k.zones.length} zones${float.shortKes ? `; M-Pesa float short by KES ${(float.shortKes / 1e6).toFixed(2)}M` : '; float covers the rest'}.`,
    `Conservation: ${k.fireHighNoWatch.length ? `${k.fireHighNoWatch.map((z) => z.name).join(', ')} at high fire danger without fire watch` : 'every high-fire-danger zone on fire watch'}. ${k.zones.filter((z) => z.survivalPct < 80).map((z) => `${z.name} survival ${z.survivalPct}%`).join(', ') || 'Tree survival at or above 80% everywhere'}.`,
    `Incidents: ${k.incidentsOpen} open across zones, ${k.incidentsCritical} critical; ${esc.length} escalated to HQ.`,
    `Partnerships: ${NATIONAL.partners.filter((p) => (p.state === 'Overdue' || p.state === 'At risk') && !s.national.partnerDone[p.id]).length} obligations overdue or at risk.`,
    `Decisions taken from the operations desk this session: ${s.log.length}.`,
  ]
}
