import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapPinned } from 'lucide-react'
import { Panel, StatusPill } from '../../DashboardKit'
import { useConservation } from '../../../../lib/conservation/context'
import {
  INCIDENT_STATUS_LABEL,
  INCIDENT_STATUS_TONE,
  INCIDENT_TYPE_LABEL,
  REPORT_CHANNEL_LABEL,
  SEVERITY_LABEL,
  SEVERITY_TONE,
  formatCoord,
  formatEat,
  formatHa,
} from '../../../../lib/conservation/labels'
import { incidentDetail } from '../../../../lib/conservation/selectors'
import AgreementPill from './AgreementPill'
import BackLink from './BackLink'
import Callout from './Callout'
import DeadlineChip from './DeadlineChip'
import DemoClock from './DemoClock'
import EscalationLadder from './EscalationLadder'
import IncidentAckForm from './IncidentAckForm'
import IncidentStatusPanel from './IncidentStatusPanel'
import IncidentTaskPanel from './IncidentTaskPanel'
import Marker from './Marker'
import Timeline from './Timeline'
import { useFocusOn } from './hooks'
import { INCIDENT_ICON } from './incidentIcons'
import { conPath } from './paths'
import { CAPTION } from './ui'

function Fact({ label, children }) {
  return (
    <div>
      <dt className={CAPTION}>{label}</dt>
      <dd className="mt-1 text-[13px] text-ink">{children}</dd>
    </div>
  )
}

/** `3 merged: Mobile app ×2, USSD ×1`. A channel each, never an identity. */
function reportsSummary(incident) {
  const byChannel = new Map()
  for (const report of incident.reports) byChannel.set(report.channel, (byChannel.get(report.channel) ?? 0) + 1)
  const parts = [...byChannel].map(([channel, n]) => `${REPORT_CHANNEL_LABEL[channel] ?? channel} ×${n}`)
  return `${incident.reports.length} merged: ${parts.join(', ')}`
}

export default function ConservationIncidentDetail({ incidentId, onBack }) {
  const ctx = useConservation()
  const detail = useMemo(() => incidentDetail(ctx, incidentId), [ctx, incidentId])
  const headingRef = useFocusOn(incidentId)

  if (!detail) {
    return (
      <div className="space-y-5">
        <BackLink onClick={onBack}>Back to incidents</BackLink>
        <Callout tone="warn" role="alert" title="Incident not found">
          <span ref={headingRef} tabIndex={-1}>
            {incidentId} is not in your region.
          </span>
        </Callout>
      </div>
    )
  }

  const { incident, zone, segment, county, severity } = detail
  const Icon = INCIDENT_ICON[incident.type]
  const hasGps = incident.lat !== null && incident.lon !== null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink onClick={onBack}>Back to incidents</BackLink>
        <div className="flex flex-wrap items-center gap-2">
          <DeadlineChip deadline={detail.deadline} />
          <StatusPill status={INCIDENT_STATUS_LABEL[incident.status]} tone={INCIDENT_STATUS_TONE[incident.status]} />
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <header>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="flex flex-wrap items-center gap-x-3 font-sans text-2xl font-bold tracking-tight text-emerald-950 focus:outline-none sm:text-3xl"
          >
            <Icon className="h-6 w-6 shrink-0 text-ink-muted" strokeWidth={2} aria-hidden="true" />
            {incident.incidentId} · {INCIDENT_TYPE_LABEL[incident.type]}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusPill status={`${SEVERITY_LABEL[severity]} severity`} tone={SEVERITY_TONE[severity]} />
            <AgreementPill value={detail.satellite} />
            {segment && (
              <Link
                to={conPath(`boundary?segment=${segment.segmentId}`)}
                className="inline-flex min-h-11 items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-emerald-700 underline decoration-emerald-700/30 underline-offset-4 hover:text-emerald-800"
              >
                <MapPinned className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                View {segment.name} on Boundary
              </Link>
            )}
          </div>
        </header>
        <DemoClock />
      </div>

      <Panel title="Where and what" lede="Reports merged into one incident carry a channel and a time, never an identity.">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Fact label="Segment">{segment?.name ?? incident.segmentId}</Fact>
          <Fact label="Zone">{zone?.name ?? incident.zoneId}</Fact>
          <Fact label="County">
            {county ?? 'Not set'}
            {county && <Marker title="The county is inferred from the place name, not confirmed by NTZDC.">inferred</Marker>}
          </Fact>
          <Fact label="GPS">
            {hasGps ? `${formatCoord(incident.lat)}, ${formatCoord(incident.lon)}` : 'No position recorded'}
          </Fact>
          <Fact label="Plot">{incident.plotId ?? '—'}</Fact>
          <Fact label="Estimated area">
            {incident.estAreaHa === null ? 'Not estimated' : `${formatHa(incident.estAreaHa)} ha`}
          </Fact>
          <Fact label="First reported">{formatEat(incident.firstReportedAt, 'datetime')} EAT</Fact>
          <Fact label="Reports">{reportsSummary(incident)}</Fact>
          <Fact label="KFS reference">{incident.kfsRef ?? <span className="text-ink-faint">None yet</span>}</Fact>
        </dl>
        {incident.note && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="max-w-[68ch] text-[13px] leading-relaxed text-ink-muted">{incident.note}</p>
          </div>
        )}
      </Panel>

      <Panel title="Timeline" lede="Times are East Africa Time. KFS messages in this prototype are simulated.">
        <Timeline events={detail.events} sessionActions={detail.sessionActions} />
      </Panel>

      <EscalationLadder detail={detail} />
      <IncidentAckForm detail={detail} />
      <IncidentStatusPanel detail={detail} />
      <IncidentTaskPanel detail={detail} />
    </div>
  )
}
