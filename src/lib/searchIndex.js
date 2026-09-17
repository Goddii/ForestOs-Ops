// Global search index. Scans the role's own module list plus the real record
// sets already used elsewhere in the app (batches, blocks, registry plots) —
// deliberately not a separate invented dataset, so a search result always
// opens a screen that actually shows that record. Illustrative only.

import { modulePath } from './dashboard/roles'
import { BATCH_CHAIN } from './batchChain'
import { ZONE } from './dashboard/zoneManager'
import { ADMIN } from './dashboard/systemAdmin'

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

function blockResults(role, query) {
  if (role.id !== 'zone') return []
  return ZONE.blocks
    .filter((b) => b.name.toLowerCase().includes(query) || b.id.toLowerCase().includes(query))
    .map((b) => ({
      id: `block-${b.id}`,
      label: `${b.name} · ${b.id}`,
      meta: `${b.supervisor} · ${b.workers} workers`,
      to: modulePath(role, 'blocks'),
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

/** Categorized search results for the signed-in role's context. Empty query returns nothing. */
export function search(role, rawQuery) {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return []

  const groups = [
    { category: 'Screens', items: moduleResults(role, query) },
    { category: 'Batches', items: batchResults(role, query) },
    { category: 'Blocks', items: blockResults(role, query) },
    { category: 'Plots', items: plotResults(role, query) },
  ].filter((g) => g.items.length > 0)

  return groups
}
