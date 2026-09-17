// ── Contract ⇄ UI adapters ──────────────────────────────────────────────────
// The swap seam between the API contracts in `./shapes.js` and the shapes the
// UI modules consume today. Each `toX` projects the current internal mock to the
// contract (what a backend dev should produce); each `fromX` maps a contract
// payload back to the props a module already renders.
//
// Modules keep consuming their current shapes. When a real endpoint lands the
// change is one line at the data source:
//   const claims = (await api.verificationClaims()).map(fromVerificationClaim)
// Component props never change.

// ── enum ⇄ label maps ──────────────────────────────────────────────────────
const CLAIM_TYPE_LABEL = {
  tree_planting: 'Tree planting',
  buffer_maintenance: 'Buffer maintenance',
  erosion_control: 'Erosion control',
  invasive_removal: 'Invasive removal',
  fire_report: 'Fire report',
}
const CLAIM_STAGE_LABEL = {
  reported: 'Reported',
  field_verified: 'Field verified',
  evidence_attached: 'Evidence attached',
  satellite_checked: 'Satellite cross-check',
  verified: 'Verified',
  rejected: 'Rejected',
}
const PROBLEM_TYPE_LABEL = {
  pest: 'Pest',
  disease: 'Disease',
  poor_growth: 'Poor growth',
  drought: 'Drought',
  flooding: 'Flooding',
  weeds: 'Weeds',
  erosion: 'Erosion',
  fire: 'Fire',
  other: 'Other',
}
const PROBLEM_STATUS_LABEL = {
  received: 'Received',
  officer_notified: 'Officer notified',
  field_verification: 'Field verification',
  intervention: 'Intervention',
  outcome_recorded: 'Outcome recorded',
}
const SEVERITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' }

const invert = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [v.toLowerCase(), k]))
const CLAIM_TYPE_TOKEN = invert(CLAIM_TYPE_LABEL)
const CLAIM_STAGE_TOKEN = invert(CLAIM_STAGE_LABEL)
const PROBLEM_TYPE_TOKEN = invert(PROBLEM_TYPE_LABEL)
const PROBLEM_STATUS_TOKEN = invert(PROBLEM_STATUS_LABEL)
const SEVERITY_TOKEN = invert(SEVERITY_LABEL)

const isoDay = (d) => (d && d.length === 10 ? `${d}T00:00:00Z` : d)
const day = (iso) => (iso ? String(iso).slice(0, 10) : null)

// ── Verification claim ─────────────────────────────────────────────────────

/** internal claim → VerificationClaim contract (with the PROPOSED extras the UI needs). */
export function toVerificationClaim(c) {
  const [lat, lng] = (c.attachments?.gps ?? '').split(',').map((n) => parseFloat(n))
  return {
    claimId: c.id,
    type: CLAIM_TYPE_TOKEN[String(c.type).toLowerCase()] ?? 'tree_planting',
    plotId: c.plotId,
    blockId: c.centre ?? null,
    reportedBy: c.reportedBy ?? null,
    reportedAt: isoDay(c.reportedDate),
    stage: CLAIM_STAGE_TOKEN[String(c.stage).toLowerCase()] ?? 'reported',
    officerNote: c.observations ?? null,
    photoUrl: null,
    gpsCoords: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
    ndviDelta:
      c.ndvi && c.ndvi.current != null && c.ndvi.baseline != null
        ? +(c.ndvi.current - c.ndvi.baseline).toFixed(2)
        : null,
    verifiedAt: c.stage === 'Verified' ? isoDay(c.reportedDate) : null,
    // PROPOSED extensions
    reportedWork: c.quantity ?? null,
    submissionNote: c.note ?? null,
    assignedOfficer: c.officer ?? null,
    ndviBaseline: c.ndvi?.baseline ?? null,
    ndviCurrent: c.ndvi?.current ?? null,
    photoCount: c.attachments?.photos ?? 0,
    flagged: Boolean(c.flagged),
  }
}

/** VerificationClaim contract → the props VerificationQueueModule renders. */
export function fromVerificationClaim(v) {
  return {
    id: v.claimId,
    type: CLAIM_TYPE_LABEL[v.type] ?? v.type,
    plotId: v.plotId,
    centre: v.blockId ?? '—',
    reportedDate: day(v.reportedAt),
    stage: CLAIM_STAGE_LABEL[v.stage] ?? v.stage,
    reportedBy: v.reportedBy ?? null,
    officer: v.assignedOfficer ?? null,
    quantity: v.reportedWork ?? '—',
    note: v.submissionNote ?? '',
    observations: v.officerNote ?? null,
    ndvi: {
      baseline: v.ndviBaseline ?? 0,
      current: v.ndviCurrent ?? (v.ndviBaseline != null && v.ndviDelta != null ? v.ndviBaseline + v.ndviDelta : 0),
    },
    attachments: {
      photos: v.photoCount ?? (v.photoUrl ? 1 : 0),
      gps: v.gpsCoords ? `${v.gpsCoords.lat}, ${v.gpsCoords.lng}` : null,
    },
    ...(v.flagged ? { flagged: true } : {}),
  }
}

// ── Problem report ─────────────────────────────────────────────────────────

export function toProblemReport(r) {
  return {
    reportId: r.id,
    farmerId: r.farmerId ?? null,
    centre: r.centre,
    problemType: PROBLEM_TYPE_TOKEN[String(r.type).toLowerCase()] ?? 'other',
    severity: SEVERITY_TOKEN[String(r.severity).toLowerCase()] ?? 'low',
    status: PROBLEM_STATUS_TOKEN[String(r.status).toLowerCase()] ?? 'received',
    assignedOfficer: r.officer ?? null,
    reportedAt: isoDay(r.reportedDate),
    outcome: r.outcome ?? null,
    overdue: Boolean(r.overdue), // PROPOSED
  }
}

export function fromProblemReport(p) {
  return {
    id: p.reportId,
    farmerId: p.farmerId ?? null,
    centre: p.centre,
    type: PROBLEM_TYPE_LABEL[p.problemType] ?? p.problemType,
    severity: SEVERITY_LABEL[p.severity] ?? p.severity,
    status: PROBLEM_STATUS_LABEL[p.status] ?? p.status,
    officer: p.assignedOfficer ?? null,
    reportedDate: day(p.reportedAt),
    overdue: Boolean(p.overdue),
  }
}

// ── Zone comparison row ────────────────────────────────────────────────────

export function toZoneComparisonRow(z) {
  const pay = z.pay ?? {}
  const total = (pay.baseKesPerKg ?? 0) + (pay.qualityPremiumKesPerKg ?? 0) + (pay.conservationPremiumKesPerKg ?? 0)
  return {
    zoneId: z.code ?? z.id,
    zoneName: z.name,
    baseRateKes: pay.baseKesPerKg ?? 0,
    qualityPremiumKes: pay.qualityPremiumKesPerKg ?? 0,
    conservationPremiumKes: pay.conservationPremiumKesPerKg ?? 0,
    totalPayoutKes: +total.toFixed(1),
    rejectionRate: +(((z.rejectionRatePct ?? 0) / 100).toFixed(4)),
    trainingCoverage: +(((z.trainingCoveragePct ?? 0) / 100).toFixed(4)),
  }
}

export function fromZoneComparisonRow(r) {
  return {
    id: r.zoneId,
    code: r.zoneId,
    name: r.zoneName,
    pay: {
      baseKesPerKg: r.baseRateKes,
      qualityPremiumKesPerKg: r.qualityPremiumKes,
      conservationPremiumKesPerKg: r.conservationPremiumKes,
    },
    rejectionRatePct: +(r.rejectionRate * 100).toFixed(1),
    trainingCoveragePct: Math.round(r.trainingCoverage * 100),
  }
}

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
