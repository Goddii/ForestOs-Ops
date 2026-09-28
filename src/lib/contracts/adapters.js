// ── Contract ⇄ UI adapters ──────────────────────────────────────────────────
// The swap seam between the API contracts in `./shapes.js` and the shapes the
// UI modules consume today. Each `toX` projects the current internal mock to the
// contract (what a backend dev should produce); each `fromX` maps a contract
// payload back to the props a module already renders.
//
// Modules keep consuming their current shapes. When a real endpoint lands the
// change is one line at the data source, and component props never change.

// ── Batch record ───────────────────────────────────────────────────────────

export function toBatchRecord(record) {
  return {
    batchId: record.traceId ?? record.id,
    originZone: record.land?.region ?? record.land?.name ?? null,
    blockId: record.block?.id ?? null,
    collectionCentre: (record.plot?.centre ?? '').replace(' Collection Centre', '') || null,
    harvestDate: record.harvest?.window?.split(' – ')[0] ?? record.batch?.sealedAt ?? null,
    quantityKg: record.batch?.madeTeaKg ?? record.volumeKg ?? 0,
    channel: record.channel,
    conservationStatus:
      record.verification?.status === 'Verified'
        ? 'verified'
        : record.verification?.status === 'Not tracked'
          ? 'flagged'
          : 'pending',
    verificationMethod: ['field', 'satellite'].filter(
      (m) => record.verification?.[m]?.status === 'Verified',
    ),
    // internal-only: present on the internal payload, dropped for buyer/consumer
    farmerId: null,
  }
}

// A `fromBatchRecord` is intentionally omitted — the console reads batch
// provenance straight from `batchChain.js`'s canonical records, which is
// already the single shared source.
