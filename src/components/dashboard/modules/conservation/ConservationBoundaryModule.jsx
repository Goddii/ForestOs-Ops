import { useEffect, useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { BarMeter, DataTable, Panel, PrototypeTag, StatTile, StatusPill } from '../../DashboardKit'
import { useConservation } from '../../../../lib/conservation/context'
import { POLICY } from '../../../../lib/conservation/policy'
import {
  ALERT_STATUS_LABEL,
  ALERT_STATUS_TONE,
  formatCount,
  formatDay,
  formatEat,
  formatHa,
  formatPct,
} from '../../../../lib/conservation/labels'
import { alertDetail, alertRows, boundaryKpis, headerSub, segmentRows } from '../../../../lib/conservation/selectors'
import AgreementPill from './AgreementPill'
import AlertDetail from './AlertDetail'
import BoundaryMapPanel from './BoundaryMapPanel'
import GfwCandidatesPanel from './GfwCandidatesPanel'
import IntegrityBar from './IntegrityBar'
import Marker from './Marker'
import ScreenHeader from './ScreenHeader'
import SortableFrame from './SortableFrame'
import { useScrollOnOpen, useSelectedParam } from './hooks'
import { CAPTION } from './ui'

const B = POLICY.boundary

const SEGMENT_COLUMNS = [
  { key: 'name', label: 'Segment' },
  { key: 'zoneName', label: 'Zone' },
  { key: 'km', label: 'km', align: 'right', mono: true },
  { key: 'integrity', label: 'Integrity' },
  { key: 'fence', label: 'Fence continuity' },
  { key: 'canopy', label: 'Canopy intact' },
  { key: 'markers', label: 'Beacons & signs' },
  { key: 'openIncidents', label: 'Open incidents', align: 'right', mono: true },
  { key: 'lastPatrol', label: 'Last patrol' },
  { key: 'nextDue', label: 'Next due' },
]

/** A component bar in a table cell: neutral green, amber under the amber line. */
function ComponentBar({ value }) {
  return (
    <div className="min-w-[5.5rem]">
      <BarMeter label="" value={value} max={1} display={formatPct(value)} tone={value < B.amberBelow ? 'amber' : 'emerald'} />
    </div>
  )
}

export default function ConservationBoundaryModule() {
  const ctx = useConservation()
  const [alertId, openAlert, closeAlert] = useSelectedParam('alert')
  const [segmentId, selectSegment, clearSegment] = useSelectedParam('segment')

  const kpis = useMemo(() => boundaryKpis(ctx), [ctx])
  const segments = useMemo(
    () =>
      segmentRows(ctx).map((r) => ({
        id: r.id,
        name: r.segment.name,
        zoneName: r.zoneName,
        km: r.segment.lengthKm,
        integrity: r.integrity,
        band: r.band,
        fence: r.fenceContinuity,
        canopy: r.canopyIntact,
        markers: r.beaconsAndSigns,
        openIncidents: r.openIncidents,
        lastPatrol: r.lastPatrol,
        nextDue: r.nextDue,
        patrolState: r.patrolState,
        daysOverdue: r.daysOverdue,
      })),
    [ctx],
  )
  const alerts = useMemo(() => alertRows(ctx), [ctx])
  const detail = useMemo(() => (alertId ? alertDetail(ctx, alertId) : null), [ctx, alertId])
  const alertsRef = useScrollOnOpen(alertId)
  const sentinel = ctx.ref.sentinel

  // A deep link to a segment brings its row into view.
  useEffect(() => {
    if (segmentId) document.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'center' })
  }, [segmentId])

  const sub = `${headerSub(ctx)} · Sentinel-2 · last pass ${formatDay(sentinel.lastPass)} · next ${formatDay(sentinel.nextPass)} · ${formatPct(sentinel.cloudFraction, 1)} cloud · baseline ${formatDay(sentinel.baselineDate, true)}`

  const renderSegmentCell = (key, row) => {
    switch (key) {
      case 'name': {
        const selected = row.id === segmentId
        return (
          <button
            type="button"
            data-selected={selected}
            aria-pressed={selected}
            onClick={() => (selected ? clearSegment() : selectSegment(row.id))}
            className="min-h-11 text-left font-medium text-ink underline decoration-line-strong decoration-dotted underline-offset-4 hover:decoration-ink"
          >
            {row.name}
            {selected && <Marker>selected</Marker>}
          </button>
        )
      }
      case 'km':
        return row.km.toFixed(1)
      case 'integrity':
        return <IntegrityBar label="" value={row.integrity} band={row.band} className="min-w-[6rem]" />
      case 'fence':
      case 'canopy':
      case 'markers':
        return <ComponentBar value={row[key]} />
      case 'lastPatrol':
        return row.lastPatrol ? formatDay(row.lastPatrol) : <span className="text-ink-faint">Never</span>
      case 'nextDue':
        return (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {row.nextDue ? formatDay(row.nextDue) : '—'}
            {row.patrolState === 'overdue' && (
              <StatusPill status={row.daysOverdue === null ? 'Overdue' : `Overdue ${row.daysOverdue} d`} tone="critical" />
            )}
            {row.patrolState === 'due_today' && <StatusPill status="Due today" tone="neutral" />}
          </span>
        )
      default:
        return row[key]
    }
  }

  return (
    <div className="space-y-5">
      <ScreenHeader title="Boundary & Encroachment" sub={sub} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          label="Region integrity"
          value={formatPct(kpis.integrity)}
          share={kpis.integrity}
          tone={kpis.underAmber > 0 ? 'warn' : 'default'}
          unit="Length-weighted"
        />
        <StatTile
          label={`Segments under ${formatPct(B.amberBelow)}`}
          value={kpis.underAmber}
          tone={kpis.underAmber > 0 ? 'warn' : 'default'}
          unit={`of ${kpis.segmentCount} segments`}
        />
        <StatTile
          label="Alerts to review"
          value={kpis.alertsToReview}
          tone={kpis.newAlerts > 0 ? 'warn' : 'default'}
          note={`${kpis.newAlerts} new`}
          unit="New and under review"
        />
        <StatTile label="Belt monitored" value={kpis.beltKm.toFixed(1)} unit="km, derived pro rata" />
        <StatTile
          label="Beacons and signs missing"
          value={kpis.markersMissing}
          tone="warn"
          note={`${kpis.beaconsMissing} beacons and ${kpis.signsMissing} signs`}
        />
      </div>

      <Panel
        title="Segments"
        lede="Lowest integrity first. Segment lengths, beacon and sign counts are illustrative allocations, not surveyed."
        actions={<PrototypeTag label="Proposed weights" />}
      >
        <SortableFrame className="[&_tr:has([data-selected='true'])]:bg-emerald-600/[0.07]">
          <DataTable columns={SEGMENT_COLUMNS} rows={segments} renderCell={renderSegmentCell} sortable />
        </SortableFrame>
        {segmentId && !segments.some((s) => s.id === segmentId) && (
          <p role="alert" className="mt-3 text-[12.5px] text-critical">
            {segmentId} is not a segment in your region.
          </p>
        )}
      </Panel>

      <Panel title="How integrity is scored" actions={<PrototypeTag label="Proposed weights" />}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 text-[13px] leading-relaxed text-ink-muted">
            <p className="font-mono text-[12.5px] text-ink">
              Integrity = {formatPct(B.weights.fenceContinuity)} fence continuity + {formatPct(B.weights.canopyIntact)} canopy intact + {formatPct(B.weights.beaconsAndSigns)} beacons and signs
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Fence continuity is one less the length of gaps in the fence or hedge, as a share of the segment’s length.</li>
              <li>Canopy intact is the canopy now as a share of the canopy at the baseline survey, capped at {formatPct(1)}.</li>
              <li>Beacons and signs is those in place as a share of those planned.</li>
              <li>The region’s figure weights each segment by its length.</li>
            </ul>
          </div>
          <div className="space-y-2 text-[13px] leading-relaxed text-ink-muted">
            <p>
              A segment shows amber below {formatPct(B.amberBelow)} and red below {formatPct(B.criticalBelow)}. The weights and the lines are
              proposed and have not been signed off by NTZDC.
            </p>
            <p>
              Patrols are due every {B.patrolIntervalDays.normal} days, or every {B.patrolIntervalDays.high} days in a high-risk season or with an
              open fire, logging, charcoal or encroachment incident on the segment.
            </p>
          </div>
        </div>
      </Panel>

      <div ref={alertsRef} className="scroll-mt-24">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Panel title="Satellite alerts" lede="Changes the satellite saw near the belt edge. Each shows whether the ground report agrees.">
            <ul className="divide-y divide-line">
              {alerts.map((row) => {
                const selected = row.id === alertId
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => openAlert(row.id)}
                      className={
                        'group flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-2 py-3 text-left transition-colors hover:bg-paper-sunk/50 ' +
                        (selected ? 'bg-emerald-600/[0.07]' : '')
                      }
                    >
                      <div className="min-w-0 flex-1 basis-40">
                        <p className="text-[13px] text-ink">
                          <span className="font-mono text-[12px]">{row.id}</span>
                          <span className="ml-2">{row.segmentName ?? 'Not placed'}</span>
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                          {formatHa(row.alert.areaHa)} ha · {row.alert.distanceM} m from the belt edge
                          {row.alert.ndviDrop === null ? '' : ` · NDVI −${row.alert.ndviDrop.toFixed(2)}`} · {formatEat(row.alert.detectedAt, 'datetime')}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <AgreementPill value={row.agreement} />
                        <StatusPill status={ALERT_STATUS_LABEL[row.alert.status]} tone={ALERT_STATUS_TONE[row.alert.status]} />
                        <ChevronRight className="h-4 w-4 shrink-0 text-line-strong group-hover:text-ink-muted" strokeWidth={2} aria-hidden="true" />
                      </div>
                    </button>
                  </li>
                )
              })}
              {alerts.length === 0 && <li className="py-3 text-[13px] text-ink-muted">No satellite alerts in your region.</li>}
            </ul>
            <p className={CAPTION + ' mt-3'}>NDVI, a satellite greenness index</p>
          </Panel>

          <div>
            {detail ? (
              <AlertDetail key={detail.id} detail={detail} />
            ) : (
              <Panel title="Alert detail">
                <p className="text-[13px] text-ink-muted">
                  {alertId
                    ? `${alertId} is not in your region.`
                    : `Select an alert to triage it: confirm it as an incident, mark it under review, dismiss it with a reason, or schedule a patrol. ${formatCount(kpis.alertsToReview)} still need review.`}
                </p>
                {alertId && (
                  <button type="button" onClick={closeAlert} className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-emerald-700 underline underline-offset-4">
                    Clear selection
                  </button>
                )}
              </Panel>
            )}
          </div>
        </div>
      </div>

      <GfwCandidatesPanel />

      <BoundaryMapPanel />
    </div>
  )
}
