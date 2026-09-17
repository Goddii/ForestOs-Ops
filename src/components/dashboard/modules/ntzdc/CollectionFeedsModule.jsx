import { useState } from 'react'
import { ModuleHeader, Panel, StatTile, DataTable } from '../../DashboardKit'
import { NTZDC } from '../../../../lib/dashboard/ntzdc'
import NtzdcCentreBoard from './NtzdcCentreBoard'
import QualityAlertBanner from './QualityAlertBanner'

// Per-farmer collection grid.
const FEED_COLUMNS = [
  { key: 'farmerId', label: 'Farmer ID', mono: true, sortAccessor: (r) => r.farmerId },
  { key: 'centre', label: 'Collection Center', sortAccessor: (r) => r.centre },
  { key: 'totalKg', label: 'Total Kg', align: 'right', mono: true, sortAccessor: (r) => r.totalKg },
  { key: 'acceptedKg', label: 'Accepted Kg', align: 'right', mono: true, sortAccessor: (r) => r.acceptedKg },
  { key: 'rejectedKg', label: 'Rejected Kg', align: 'right', mono: true, sortAccessor: (r) => r.rejectedKg },
  { key: 'reason', label: 'Rejection Reason', align: 'right', sortAccessor: (r) => r.ratePct },
]

export default function CollectionFeedsModule() {
  const { centres, moistureBand, collectionRecords, quality } = NTZDC
  const [threshold, setThreshold] = useState(quality.alertThresholdPct)

  const active = centres.filter((c) => c.status === 'active')
  const totalKg = centres.reduce((s, c) => s + c.todayKg, 0)
  const totalTarget = centres.reduce((s, c) => s + c.targetKg, 0)
  const avgMoisture = Math.round(
    active.reduce((s, c) => s + c.moisturePct, 0) / (active.length || 1),
  )

  const feed = collectionRecords.map((r) => {
    const rejectedKg = r.totalKg - r.acceptedKg
    return { ...r, rejectedKg, ratePct: Math.round((rejectedKg / r.totalKg) * 100) }
  })
  const feedTotal = feed.reduce((s, r) => s + r.totalKg, 0)
  const feedRejected = feed.reduce((s, r) => s + r.rejectedKg, 0)
  const feedRatePct = ((feedRejected / feedTotal) * 100).toFixed(1)

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Operations & QC Hub"
        sub={`Kiptunga Block · ${active.length}/${centres.length} centres reporting · ${feed.length} deliveries logged`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Intake today"
          value={`${(totalKg / 1000).toFixed(1)}t`}
          unit={`of ${(totalTarget / 1000).toFixed(1)}t target`}
          tone="positive"
          share={totalKg / totalTarget}
        />
        <StatTile label="Centres reporting" value={active.length} unit={`of ${centres.length}`} share={active.length / centres.length} />
        <StatTile label="Avg moisture" value={`${avgMoisture}%`} unit={`band ${moistureBand.low}–${moistureBand.high}%`} />
        <StatTile
          label="Reject rate today"
          value={`${feedRatePct}%`}
          unit={`${feedRejected} kg of ${feedTotal} kg`}
          tone={Number(feedRatePct) >= 10 ? 'warn' : 'positive'}
        />
      </div>

      <QualityAlertBanner records={collectionRecords} threshold={threshold} onThreshold={setThreshold} />

      <Panel title="Centre board" lede="Today’s intake against target, moisture against the accepted band, and last pickup time.">
        <NtzdcCentreBoard centres={centres} band={moistureBand} />
      </Panel>

      <Panel
        title="Collection feed"
        lede="Every green-leaf delivery logged today, per farmer. Sort by any column."
      >
        <DataTable
          columns={FEED_COLUMNS}
          rows={feed}
          sortable
          csvName="ForestOS-collection-feed"
          renderCell={(key, row) => {
            if (key === 'totalKg') return `${row.totalKg} kg`
            if (key === 'acceptedKg') return `${row.acceptedKg} kg`
            if (key === 'rejectedKg')
              return (
                <span className={row.rejectedKg > 0 ? 'text-amber-700' : 'text-ink-muted'}>
                  {row.rejectedKg} kg
                </span>
              )
            if (key === 'reason')
              return row.reason ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-700/30 bg-amber-500/[0.10] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-amber-700">
                  {row.reason} · {row.ratePct}%
                </span>
              ) : (
                <span className="font-mono text-[11px] text-ink-faint">clean</span>
              )
            return row[key]
          }}
        />
      </Panel>
    </div>
  )
}
