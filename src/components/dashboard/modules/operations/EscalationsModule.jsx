import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Flame, LifeBuoy, ShieldAlert } from 'lucide-react'
import { DataTable, ModuleHeader, Panel, StatTile, StatusPill } from '../../DashboardKit'
import { NATIONAL } from '../../../../lib/dashboard/operationsNational'
import { allEscalations, closeEscalation, nationalKpis, supportEscalation, useOperations, zoneName } from '../../../../lib/dashboard/operationsStore'
import { PrimaryButton, SecondaryButton, SelectField, inputClass } from './controls'

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2 }
const SEVERITY_TONE = { Critical: 'critical', High: 'warn', Medium: 'neutral' }
// The HQ unit a given incident type usually needs first — a default, not a rule.
const DEFAULT_SUPPORT = { Fire: 'HQ-SEC', 'Illegal charcoal kilns': 'HQ-SEC', 'Grievance · late pay': 'HQ-HR', Injury: 'HQ-HS', 'Road washout': 'HQ-ENG', 'Wildlife · elephants': 'HQ-LEGAL' }

function EscalationCard({ e }) {
  const [picked, setPicked] = useState(DEFAULT_SUPPORT[e.type] ?? NATIONAL.hqSupport[0].id)
  const [closing, setClosing] = useState(false)
  const [note, setNote] = useState('')
  const needsHq = !e.hq
  const tone = e.severity === 'Critical' && needsHq ? 'border-critical/25 bg-critical-soft' : needsHq && e.severity === 'High' ? 'border-amber-700/25 bg-[#fdf4e7]' : 'border-line bg-card'
  return (
    <li className={'rounded-xl border p-4 ' + tone}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={e.severity} tone={SEVERITY_TONE[e.severity]} />
            <p className="text-[13.5px] font-semibold text-ink">{e.type}</p>
            <span className="text-[12.5px] text-ink-muted">· {zoneName(e.zone)} · {e.location}</span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-ink-faint">
            {e.id} · reported {e.reported}
          </p>
        </div>
        <StatusPill status={e.status} tone={e.hq ? 'positive' : 'warn'} />
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink">{e.note}</p>
      <p className="mt-2 text-[11.5px] text-ink-muted">
        HQ support: <b className="font-semibold text-ink">{e.hq ?? 'none yet'}</b>
        {e.fromDesk && (
          <>
            {' '}
            ·{' '}
            <Link to="/app/operations/desk/incidents" className="text-emerald-700 hover:text-emerald-800">
              zone crew on the SW Mau desk →
            </Link>
          </>
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-line/70 pt-3">
        <SelectField id={`hq-${e.id}`} label={`HQ support for ${e.id}`} hideLabel value={picked} onChange={setPicked} options={NATIONAL.hqSupport.map((h) => ({ value: h.id, label: h.name }))} className="min-w-[15rem]" />
        <PrimaryButton onClick={() => supportEscalation(e.id, picked)}>
          <LifeBuoy className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
          {e.hq ? 'Send more support' : 'Send support'}
        </PrimaryButton>
        <SecondaryButton onClick={() => setClosing((v) => !v)} aria-expanded={closing}>
          Close…
        </SecondaryButton>
      </div>
      {closing && (
        <form
          onSubmit={(ev) => {
            ev.preventDefault()
            if (note.trim()) closeEscalation(e.id, note.trim())
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-[16rem] flex-1">
            <label htmlFor={`close-${e.id}`} className="block text-[12px] font-medium text-ink-muted">
              Outcome (required — this is the record)
            </label>
            <input id={`close-${e.id}`} type="text" value={note} onChange={(ev) => setNote(ev.target.value)} className={inputClass} placeholder="e.g. Joint KFS operation destroyed 4 kilns; 3 arrests; site replanting ordered" />
          </div>
          <PrimaryButton type="submit" disabled={!note.trim()}>
            Close
          </PrimaryButton>
        </form>
      )}
    </li>
  )
}

const ZONE_COLUMNS = [
  { key: 'name', label: 'Zone' },
  { key: 'incidentsOpen', label: 'Open', align: 'right' },
  { key: 'incidentsCritical', label: 'Critical', align: 'right' },
  { key: 'injuriesMtd', label: 'Injuries · month', align: 'right' },
  { key: 'grievances', label: 'Grievances', align: 'right' },
]

export default function EscalationsModule() {
  const s = useOperations()
  const { zones } = nationalKpis(s)
  const open = allEscalations(s)
    .filter((e) => e.status !== 'Closed')
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  const closed = s.national.escalations.filter((e) => e.status === 'Closed')
  const critical = open.filter((e) => e.severity === 'Critical')
  const unsupported = open.filter((e) => !e.hq)

  return (
    <div className="space-y-5">
      <ModuleHeader title="Incidents & Escalations" sub={`${NATIONAL.today} · what zones have escalated to head office, and what's open everywhere else`} prototype />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Escalated to HQ" value={open.length} icon={ShieldAlert} />
        <StatTile label="Critical" value={critical.length} tone={critical.length ? 'critical' : 'default'} note={critical.map((e) => zoneName(e.zone)).join(', ') || 'none'} icon={Flame} />
        <StatTile label="Waiting on HQ" value={unsupported.length} tone={unsupported.length ? 'warn' : 'default'} unit="no HQ support yet" icon={LifeBuoy} />
        <StatTile label="Open in all zones" value={zones.reduce((sum, z) => sum + z.incidentsOpen, 0)} unit="including zone-handled" icon={AlertTriangle} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Panel title="Escalations" lede="HQ brings what a zone can't: security liaison with KFS and police, HR, legal, engineering, health & safety, communications. The zone keeps running its own crews.">
          <ul className="space-y-3">
            {open.map((e) => (
              <EscalationCard key={e.id} e={e} />
            ))}
          </ul>
          {closed.length > 0 && (
            <ul className="mt-4 space-y-1 border-t border-line pt-3 text-[12px] text-ink-muted">
              {closed.map((e) => (
                <li key={e.id}>
                  <span className="font-mono">{e.id}</span> closed — {e.resolution}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="By zone">
          <DataTable
            columns={ZONE_COLUMNS}
            rows={zones}
            renderCell={(key, z) => {
              if (key === 'name') return <span className="font-semibold">{z.name}</span>
              const v = z[key]
              return <span className={'font-mono tabular-nums ' + (v && key !== 'incidentsOpen' ? (key === 'incidentsCritical' ? 'text-critical' : 'text-amber-700') : '')}>{v || '—'}</span>
            }}
          />
        </Panel>
      </div>
    </div>
  )
}
