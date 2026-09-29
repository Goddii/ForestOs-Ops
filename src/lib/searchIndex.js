// Global search index. Scans the role's own module list plus the real record
// sets already used elsewhere in the app (batches, blocks, registry plots) —
// deliberately not a separate invented dataset, so a search result always
// opens a screen that actually shows that record. Illustrative only.

import { modulePath } from './dashboard/roles'
import { BATCH_CHAIN } from './batchChain'
import { ZONE } from './dashboard/zoneManager'
import { ADMIN } from './dashboard/systemAdmin'
import { CLOCK_START_MS, REF, SEED_STATE } from './dashboard/conservation'
import { CLAIM_TYPE_LABEL, INCIDENT_TYPE_LABEL, formatHa } from './conservation/labels'
import { alertsInScope, claimsInScope, incidentsInScope, segmentsInScope } from './conservation/selectors'

function moduleResults(role, query) {
  return role.modules
    .filter((m) => m.label.toLowerCase().includes(query))
    .map((m) => ({ id: `mod-${m.to}`, label: m.label, meta: role.label, to: modulePath(role, m.to) }))
}

function batchResults(role, query) {
  return BATCH_CHAIN.filter(
    (b) =>
      b.id.toLowerCase().includes(query) ||
      b.traceId?.toLowerCase().includes(query) ||
      b.brand?.toLowerCase().includes(query),
  ).map((b) => ({
    id: `batch-${b.id}`,
    label: `Batch #${b.id}`,
    meta: `${b.brand ?? 'Unbranded'} · ${b.block.name}`,
    to: role.id === 'buyer' ? modulePath(role, 'batches') + `?batch=${b.id}` : null,
  }))
}

// Zone Manager and the Operations Manager's SW Mau Zone Desk share the same
// six blocks; each opens them on its own block-level screen.
const BLOCK_SCREEN = { zone: 'blocks', operations: 'desk/teams' }

function blockResults(role, query) {
  if (!BLOCK_SCREEN[role.id]) return []
  return ZONE.blocks
    .filter((b) => b.name.toLowerCase().includes(query) || b.id.toLowerCase().includes(query))
    .map((b) => ({
      id: `block-${b.id}`,
      label: `${b.name} · ${b.id}`,
      meta: `${b.supervisor} · ${b.workers} workers`,
      to: modulePath(role, BLOCK_SCREEN[role.id]),
    }))
}

function plotResults(role, query) {
  if (role.id !== 'admin') return []
  return ADMIN.registry.plotsInKiptunga
    .filter((p) => p.id.toLowerCase().includes(query))
    .map((p) => ({
      id: `plot-${p.id}`,
      label: `Plot ${p.id}`,
      meta: `${p.ha} ha · Kiptunga`,
      to: modulePath(role, 'registry'),
    }))
}

const CONSERVATION_RESULT_LIMIT = 8

/**
 * Conservation Officer results, built from the seed and scoped to the account:
 * claims, incidents, satellite alerts and boundary segments, matched on ref,
 * name, type and zone name. Each opens the screen that shows the record
 * (`?claim=`, `?incident=`, `?alert=`, `?segment=`). Reporter and worker
 * identifiers are never indexed, and there are no plot results.
 */
function conservationResults(role, query) {
  if (role.id !== 'conservation') return []
  const ctx = { now: CLOCK_START_MS, scope: role.scope, state: SEED_STATE, ref: REF }
  const zoneName = (zoneId) => REF.zones.find((z) => z.zoneId === zoneId)?.name ?? ''
  const segmentName = (segmentId) => REF.segments.find((s) => s.segmentId === segmentId)?.name ?? ''
  const matches = (...fields) => fields.some((field) => String(field ?? '').toLowerCase().includes(query))
  const link = (module, param, id) => `${modulePath(role, module)}?${param}=${id}`

  const claims = claimsInScope(ctx)
    .filter((c) => matches(c.claimId, c.type, CLAIM_TYPE_LABEL[c.type], zoneName(c.zoneId)))
    .map((c) => ({
      id: `con-claim-${c.claimId}`,
      label: `${c.claimId} · ${CLAIM_TYPE_LABEL[c.type]}`,
      meta: zoneName(c.zoneId),
      to: link('verification', 'claim', c.claimId),
    }))
  const incidents = incidentsInScope(ctx)
    .filter((i) => matches(i.incidentId, i.type, INCIDENT_TYPE_LABEL[i.type], segmentName(i.segmentId), zoneName(i.zoneId)))
    .map((i) => ({
      id: `con-incident-${i.incidentId}`,
      label: `${i.incidentId} · ${INCIDENT_TYPE_LABEL[i.type]}`,
      meta: `${segmentName(i.segmentId)} · ${zoneName(i.zoneId)}`,
      to: link('incidents', 'incident', i.incidentId),
    }))
  const alerts = alertsInScope(ctx)
    .filter((a) => matches(a.alertId, segmentName(a.segmentId), zoneName(a.zoneId)))
    .map((a) => ({
      id: `con-alert-${a.alertId}`,
      label: `${a.alertId} · Satellite alert`,
      meta: `${segmentName(a.segmentId) || 'Not placed'} · ${formatHa(a.areaHa)} ha`,
      to: link('boundary', 'alert', a.alertId),
    }))
  const segments = segmentsInScope(ctx)
    .filter((s) => matches(s.segmentId, s.name, zoneName(s.zoneId)))
    .map((s) => ({
      id: `con-segment-${s.segmentId}`,
      label: `${s.name} · ${s.segmentId}`,
      meta: `${zoneName(s.zoneId)} · ${s.lengthKm} km`,
      to: link('boundary', 'segment', s.segmentId),
    }))

  return [
    { category: 'Claims', items: claims },
    { category: 'Incidents', items: incidents },
    { category: 'Alerts', items: alerts },
    { category: 'Segments', items: segments },
  ].map((group) => ({ ...group, items: group.items.slice(0, CONSERVATION_RESULT_LIMIT) }))
}

/** Categorized search results for the signed-in role's context. Empty query returns nothing. */
export function search(role, rawQuery) {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return []

  const groups = [
    { category: 'Screens', items: moduleResults(role, query) },
    { category: 'Batches', items: batchResults(role, query) },
    { category: 'Blocks', items: blockResults(role, query) },
    { category: 'Plots', items: plotResults(role, query) },
    ...conservationResults(role, query),
  ].filter((g) => g.items.length > 0)

  return groups
}
