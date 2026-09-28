import { useState } from 'react'
import { AlertTriangle, ArrowUpRight, CheckCircle2, Flame, UserPlus, Users } from 'lucide-react'
import { ModuleHeader, Panel, StatTile, StatusPill } from '../../DashboardKit'
import { OPERATIONS, responderName } from '../../../../lib/dashboard/operationsManager'
import { assignIncident, escalateIncident, fileStatutoryReport, resolveIncident, useOperations } from '../../../../lib/dashboard/operationsStore'
import { DoneNote, PrimaryButton, SecondaryButton, SelectField, inputClass } from './controls'

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2 }
const SEVERITY_TONE = { Critical: 'critical', High: 'warn', Medium: 'neutral' }
const STATUS_TONE = { Open: 'warn', Escalated: 'warn', Responding: 'positive', 'In progress': 'positive', Resolved: 'neutral' }
// Which responder kind a given incident type calls for first — the default
// in the assign picker, not a restriction.
const FIRST_RESPONDER = {
  Fire: 'RSP-FIRE-KIP',
  'Illegal logging': 'RSP-SCOUT-TIN',
  'Pest · Helopeltis': 'RSP-AGRO',
  'Scale fault': 'RSP-TECH',
  Injury: 'RSP-FIRSTAID',
  'Wildlife · buffalo': 'RSP-KWS',
  'Grievance · late pay': 'RSP-CLO',
}

function slaLabel(mins) {
  return mins < 60 ? `${mins} min` : mins < 1440 ? `${mins / 60} h` : `${mins / 1440} days`
}

function IncidentCard({ incident }) {
  const [responder, setResponder] = useState(FIRST_RESPONDER[incident.type] ?? OPERATIONS.responders[0].id)
  const [closing, setClosing] = useState(false)
  const [note, setNote] = useState('')
  const open = incident.status !== 'Resolved'
  const unassigned = open && !incident.assigned && !incident.assignedLabel
  const tone = incident.severity === 'Critical' && unassigned ? 'border-critical/25 bg-critical-soft' : unassigned ? 'border-amber-700/25 bg-[#fdf4e7]' : 'border-line bg-card'

  return (
    <li className={'rounded-xl border p-4 ' + tone}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={incident.severity} tone={SEVERITY_TONE[incident.severity]} />
            <p className="text-[13.5px] font-semibold text-ink">{incident.type}</p>
            <span className="text-[12.5px] text-ink-muted">· {incident.location}</span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-ink-faint">
            {incident.id} · reported {incident.reported} · {incident.source}
            {open && ` · acknowledge within ${slaLabel(OPERATIONS.slaMins[incident.severity])}`}
          </p>
        </div>
        <StatusPill status={incident.status} tone={STATUS_TONE[incident.status]} />
      </div>

      <p className="mt-2 text-[12.5px] leading-relaxed text-ink">{incident.note}</p>
      {incident.resolution && <p className="mt-1 text-[12px] text-emerald-700">Closed: {incident.resolution}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink-muted">
        <span>
          Assigned: <b className="font-semibold text-ink">{incident.assignedLabel ?? (incident.assigned ? responderName(incident.assigned) : 'nobody')}</b>
        </span>
        {incident.escalatedToZone && <span className="text-amber-700">Escalated to Zone Manager · David Kemei</span>}
      </div>

      {incident.statutory && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-paper/70 px-3 py-2">
          <p className="text-[12px] text-ink">
            <b>Statutory:</b> {incident.statutory.label}
          </p>
          {incident.statutory.filed ? (
            <DoneNote>Filed {incident.statutory.filed} (prototype)</DoneNote>
          ) : (
            <PrimaryButton onClick={() => fileStatutoryReport(incident.id)}>File report</PrimaryButton>
          )}
        </div>
      )}

      {open && (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-line/70 pt-3">
          <SelectField
            id={`assign-${incident.id}`}
            label={`Responder for ${incident.id}`}
            hideLabel
            value={responder}
            onChange={setResponder}
            options={OPERATIONS.responders.map((r) => ({ value: r.id, label: r.name }))}
            className="min-w-[14rem]"
          />
          <PrimaryButton onClick={() => assignIncident(incident.id, responder)}>
            <UserPlus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
            {incident.assigned ? 'Reassign' : 'Assign'}
          </PrimaryButton>
          {!incident.escalatedToZone && (
            <SecondaryButton onClick={() => escalateIncident(incident.id)}>
              <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
              Escalate to Zone Manager
            </SecondaryButton>
          )}
          <SecondaryButton onClick={() => setClosing((v) => !v)} aria-expanded={closing}>
            <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
            Close…
          </SecondaryButton>
        </div>
      )}

      {open && closing && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (note.trim()) resolveIncident(incident.id, note.trim())
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-[16rem] flex-1">
            <label htmlFor={`close-${incident.id}`} className="block text-[12px] font-medium text-ink-muted">
              What was done (required — this is the record)
            </label>
            <input id={`close-${incident.id}`} type="text" value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder="e.g. Fire contained 11:20, 0.3 ha scorched, KFS on site" />
          </div>
          <PrimaryButton type="submit" disabled={!note.trim()}>
            Close incident
          </PrimaryButton>
        </form>
      )}
    </li>
  )
}

export default function IncidentsModule() {
  const s = useOperations()
  const [showResolved, setShowResolved] = useState(false)
  const open = s.incidents.filter((i) => i.status !== 'Resolved')
  const unassigned = open.filter((i) => !i.assigned && !i.assignedLabel)
  const critical = open.filter((i) => i.severity === 'Critical')
  const listed = [...(showResolved ? s.incidents : open)].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  const busy = (id) => open.filter((i) => i.assigned === id).length

  return (
    <div className="space-y-5">
      <ModuleHeader title="Incident Response" sub={`${OPERATIONS.name} · fire, forest crime, wildlife, pests, equipment, injuries and grievances — assign, escalate, close`} prototype />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Open incidents" value={open.length} icon={AlertTriangle} />
        <StatTile label="Critical" value={critical.length} tone={critical.length ? 'critical' : 'default'} note={critical.map((i) => i.type).join(', ') || 'none'} icon={Flame} />
        <StatTile label="Nobody assigned" value={unassigned.length} tone={unassigned.length ? 'warn' : 'default'} icon={UserPlus} />
        <StatTile label="Responders deployed" value={OPERATIONS.responders.filter((r) => busy(r.id)).length} unit={`of ${OPERATIONS.responders.length} teams`} icon={Users} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_17rem]">
        <Panel
          title="Incidents"
          lede="Worst first. Closing an incident needs a note of what was done. That note is what the Zone Manager signs off against."
          actions={
            <label className="flex items-center gap-2 text-[12px] text-ink-muted">
              <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="accent-emerald-700" />
              Show closed
            </label>
          }
        >
          <ul className="space-y-3">
            {listed.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </ul>
        </Panel>

        <div className="space-y-5">
          <Panel title="Response teams">
            <ul className="divide-y divide-line">
              {OPERATIONS.responders.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-ink">{r.name}</p>
                    <p className="text-[11px] text-ink-muted">
                      {r.kind}
                      {r.size ? ` · ${r.size} ${r.size === 1 ? 'person' : 'people'}` : ''}
                    </p>
                  </div>
                  <StatusPill status={busy(r.id) ? `${busy(r.id)} active` : 'Free'} tone={busy(r.id) ? 'warn' : 'positive'} />
                </li>
              ))}
            </ul>
          </Panel>
          <div className="rounded-xl border border-[#c3dcda] bg-[#dfeceb] p-4">
            <p className="text-[11.5px] leading-relaxed text-[#3d6b67]">
              <b>KFS and KWS are requests, not commands.</b> The ops desk crews NTZDC&rsquo;s own fire, scout, first-aid and
              liaison staff. Kenya Forest Service rangers and Kenya Wildlife Service act on their own authority, so assigning
              them logs that they were asked, and their acknowledgement is tracked separately.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
