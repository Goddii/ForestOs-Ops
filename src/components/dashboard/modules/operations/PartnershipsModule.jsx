import { useState } from 'react'
import { AlertTriangle, CalendarClock, Handshake, MessageSquare } from 'lucide-react'
import { ModuleHeader, Panel, StatTile, StatusPill } from '../../DashboardKit'
import { NATIONAL } from '../../../../lib/dashboard/operationsNational'
import { logPartnerContact, partnerAction, useOperations } from '../../../../lib/dashboard/operationsStore'
import { DoneNote, PrimaryButton, SecondaryButton, SelectField, inputClass } from './controls'

const STATE_TONE = { Overdue: 'critical', 'At risk': 'warn', 'Due soon': 'warn', 'On track': 'positive' }
const STATE_ORDER = { Overdue: 0, 'At risk': 1, 'Due soon': 2, 'On track': 3 }

function ContactForm({ contacts }) {
  const [partnerId, setPartnerId] = useState(NATIONAL.partners[0].id)
  const [note, setNote] = useState('')
  return (
    <Panel title="Log a partner contact" lede="Calls, meetings and letters. The record of who was told what, and when, if a relationship goes wrong.">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!note.trim()) return
          logPartnerContact(partnerId, note.trim())
          setNote('')
        }}
        className="space-y-3"
      >
        <SelectField id="contact-partner" label="Partner" value={partnerId} onChange={setPartnerId} options={NATIONAL.partners.map((p) => ({ value: p.id, label: p.partner }))} />
        <div>
          <label htmlFor="contact-note" className="block text-[12px] font-medium text-ink-muted">
            What was agreed
          </label>
          <input id="contact-note" type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. KFS Kiptunga station agreed joint patrol Thu 10 Sep, 2 rangers" className={inputClass} />
        </div>
        <PrimaryButton type="submit" disabled={!note.trim()}>
          <MessageSquare className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
          Log contact
        </PrimaryButton>
      </form>
      {contacts.length > 0 && (
        <ul className="mt-4 divide-y divide-line border-t border-line pt-2">
          {contacts.map((c, i) => (
            <li key={i} className="py-2 text-[12px]">
              <span className="font-mono text-[11px] text-ink-faint">{c.at}</span> <b>{NATIONAL.partners.find((p) => p.id === c.partnerId).partner}</b>
              <span className="block text-ink-muted">{c.note}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export default function PartnershipsModule() {
  const s = useOperations()
  const done = s.national.partnerDone
  const effective = (p) => (done[p.id] ? 'On track' : p.state)
  const partners = [...NATIONAL.partners].sort((a, b) => STATE_ORDER[effective(a)] - STATE_ORDER[effective(b)])
  const count = (state) => NATIONAL.partners.filter((p) => effective(p) === state).length

  return (
    <div className="space-y-5">
      <ModuleHeader title="Partnerships" sub={`${NATIONAL.partners.length} external relationships the operation runs on — government, community, processing, buyers, funders, certification, payment and data rails`} prototype />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Partners" value={NATIONAL.partners.length} unit="active agreements" icon={Handshake} />
        <StatTile label="Overdue" value={count('Overdue')} tone={count('Overdue') ? 'critical' : 'default'} icon={AlertTriangle} />
        <StatTile label="At risk" value={count('At risk')} tone={count('At risk') ? 'warn' : 'default'} icon={AlertTriangle} />
        <StatTile label="Due soon" value={count('Due soon')} unit="within the month" icon={CalendarClock} />
      </div>

      <Panel title="Obligations, worst first" lede="What each relationship needs next, from either side, and the action that moves it.">
        <ul className="divide-y divide-line">
          {partners.map((p) => (
            <li key={p.id} className="grid gap-3 py-3.5 first:pt-0 last:pb-0 md:grid-cols-[1.1fr_1.4fr_auto] md:items-center">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink">{p.partner}</p>
                <p className="text-[11px] text-ink-muted">
                  {p.kind} · {p.zones}
                </p>
                <p className="text-[11px] text-ink-faint">{p.agreement}</p>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={effective(p)} tone={STATE_TONE[effective(p)]} />
                  <span className="font-mono text-[11px] text-ink-faint">due {p.due}</span>
                </div>
                <p className="mt-1 text-[12.5px] leading-snug text-ink">{p.obligation}</p>
              </div>
              <div className="md:w-52 md:text-right">
                {done[p.id] ? (
                  <DoneNote>
                    {p.action} · {done[p.id]}
                  </DoneNote>
                ) : p.state === 'On track' ? (
                  <SecondaryButton onClick={() => partnerAction(p.id)}>{p.action}</SecondaryButton>
                ) : (
                  <PrimaryButton onClick={() => partnerAction(p.id)}>{p.action}</PrimaryButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <ContactForm contacts={s.national.contacts} />
    </div>
  )
}
