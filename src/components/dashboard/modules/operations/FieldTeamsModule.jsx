import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightLeft, MessageSquare, Smartphone, UserCheck, Users } from 'lucide-react'
import { BarMeter, ModuleHeader, Panel, StatTile, StatusPill } from '../../DashboardKit'
import { OPERATIONS, blockName } from '../../../../lib/dashboard/operationsManager'
import { opsKpis, redeployCrew, schedulePluckingRound, sendReminder, useOperations } from '../../../../lib/dashboard/operationsStore'
import { DoneNote, PrimaryButton, SecondaryButton, SelectField, inputClass } from './controls'

const REASONS = ['Firebreak support · Kiptunga north edge', 'Cover low turnout', 'Plucking round catch-up', 'Planting / nursery push']
const TURNOUT_FLOOR = 0.75

function ReminderButton({ block, kind, label, reminders }) {
  const sentAt = reminders[`${block}:${kind}`]
  if (sentAt) return <DoneNote>SMS sent {sentAt}</DoneNote>
  return (
    <SecondaryButton onClick={() => sendReminder(block, kind)}>
      <MessageSquare className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
      {label}
    </SecondaryButton>
  )
}

function RedeployForm({ muster }) {
  const [from, setFrom] = useState('NES')
  const [to, setTo] = useState('KIP')
  const [count, setCount] = useState('15')
  const [reason, setReason] = useState(REASONS[0])
  const source = muster.find((m) => m.block === from)
  const n = Number(count)
  // Never strip a block below its own turnout floor to cover another.
  const maxMovable = Math.max(0, source.present - Math.ceil(source.rostered * TURNOUT_FLOOR))
  const error =
    from === to ? 'Pick two different blocks.' : !n || n < 1 ? 'Enter how many workers.' : n > maxMovable ? `${source.name} can spare at most ${maxMovable} without dropping below ${TURNOUT_FLOOR * 100}% turnout.` : null
  const options = muster.map((m) => ({ value: m.block, label: `${m.name} · ${m.present} present` }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!error) redeployCrew(from, to, n, reason)
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField id="redeploy-from" label="From block" value={from} onChange={setFrom} options={options} />
        <SelectField id="redeploy-to" label="To block" value={to} onChange={setTo} options={options} />
        <div>
          <label htmlFor="redeploy-count" className="block text-[12px] font-medium text-ink-muted">
            Workers
          </label>
          <input id="redeploy-count" type="number" min="1" value={count} onChange={(e) => setCount(e.target.value)} className={inputClass + ' text-right font-mono tabular-nums'} />
        </div>
        <SelectField id="redeploy-reason" label="Reason" value={reason} onChange={setReason} options={REASONS.map((r) => ({ value: r, label: r }))} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton type="submit" disabled={Boolean(error)}>
          <ArrowRightLeft className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
          Redeploy for today
        </PrimaryButton>
        {error ? <p className="text-[11.5px] text-amber-700">{error}</p> : <p className="text-[11.5px] text-ink-muted">Both supervisors get an SMS; tickets are weighed under the receiving block.</p>}
      </div>
    </form>
  )
}

export default function FieldTeamsModule() {
  const s = useOperations()
  const kpis = opsKpis(s)
  const openMusters = s.muster.filter((m) => !m.musterClosed)
  const offline = s.muster.filter((m) => !m.syncOk)
  const lowTurnout = s.muster.filter((m) => m.musterClosed && m.present / m.rostered < TURNOUT_FLOOR)
  const moved = s.redeployments.reduce((sum, r) => sum + r.count, 0)

  return (
    <div className="space-y-5">
      <ModuleHeader title="Field Teams" sub={`${OPERATIONS.today} · muster, supervisor devices and crew deployment across ${s.muster.length} blocks`} prototype />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Present today" value={kpis.present.toLocaleString()} unit={`of ${kpis.rostered.toLocaleString()} rostered · ${kpis.turnoutPct}%`} share={kpis.present / kpis.rostered} icon={Users} />
        <StatTile label="Musters still open" value={openMusters.length} tone={openMusters.length ? 'warn' : 'default'} note={openMusters.map((m) => m.name).join(', ') || 'all closed'} icon={UserCheck} />
        <StatTile label="Devices offline > 24 h" value={offline.length} tone={offline.length ? 'warn' : 'default'} note={offline.map((m) => m.name).join(', ') || 'all synced'} icon={Smartphone} />
        <StatTile label="Redeployed today" value={moved} unit="workers" icon={ArrowRightLeft} />
      </div>

      <Panel title="Muster by block" lede={`Turnout against each block's roster, as each supervisor's device reports it. Amber is under ${TURNOUT_FLOOR * 100}%.`}>
        <ul className="divide-y divide-line">
          {s.muster.map((m) => {
            const share = m.present / m.rostered
            return (
              <li key={m.block} className="grid gap-3 py-3.5 first:pt-0 last:pb-0 md:grid-cols-[12rem_1fr_auto] md:items-center">
                <div>
                  <p className="text-[13px] font-semibold text-ink">
                    {m.name} · {m.block}
                  </p>
                  <p className="text-[11px] text-ink-muted">{m.supervisor}</p>
                </div>
                <div className="min-w-0">
                  <BarMeter
                    label={m.musterClosed ? `Muster closed ${m.musterClosed}` : 'Muster open'}
                    value={m.present}
                    max={m.rostered}
                    display={`${m.present} / ${m.rostered}`}
                    tone={share < TURNOUT_FLOOR ? 'amber' : 'emerald'}
                  />
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                    <StatusPill status={m.sync} tone={m.syncOk ? 'neutral' : 'warn'} />
                    {m.lent ? <span className="text-ink-muted">{m.lent} lent out</span> : null}
                    {m.borrowed ? <span className="text-ink-muted">{m.borrowed} borrowed in</span> : null}
                  </div>
                  {m.note && <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{m.note}</p>}
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {!m.musterClosed && <ReminderButton block={m.block} kind="muster" label="Close muster" reminders={s.reminders} />}
                  {!m.syncOk && <ReminderButton block={m.block} kind="sync" label="Sync device" reminders={s.reminders} />}
                </div>
              </li>
            )
          })}
        </ul>
      </Panel>

      <Panel
        title="Plucking rounds"
        lede={`Each block should be plucked through every ${OPERATIONS.plucking.intervalDays} days. Stretch a round and the shoots grow past two leaves and a bud: fine leaf falls, rejections rise at the centre, and the factory grades the leaf down.`}
      >
        <ul className="divide-y divide-line">
          {s.plucking.map((p) => {
            const late = p.daysSince > OPERATIONS.plucking.intervalDays
            const coarse = p.fineLeafPct < OPERATIONS.plucking.fineLeafTargetPct
            return (
              <li key={p.block} className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[10rem_1fr_1fr_auto] sm:items-center">
                <p className="text-[13px] font-semibold text-ink">{blockName(p.block)}</p>
                <BarMeter label={`Last round ${p.lastRound}`} value={Math.min(p.daysSince, 20)} max={20} display={`${p.daysSince} days`} tone={late ? 'amber' : 'emerald'} />
                <BarMeter label="Fine leaf" value={p.fineLeafPct} max={100} display={`${p.fineLeafPct}%`} tone={coarse ? 'amber' : 'emerald'} />
                <div className="sm:w-36 sm:text-right">
                  {p.scheduled ? (
                    <DoneNote>{p.scheduled} · Tue</DoneNote>
                  ) : late ? (
                    <PrimaryButton onClick={() => schedulePluckingRound(p.block)}>Schedule round</PrimaryButton>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Panel title="Redeploy crew for the day" lede="Lend mustered workers from one block to another. A block is never stripped below its own turnout floor.">
          <RedeployForm muster={s.muster} />
          {s.redeployments.length > 0 && (
            <ul className="mt-4 divide-y divide-line border-t border-line pt-2">
              {s.redeployments.map((r, i) => (
                <li key={i} className="flex justify-between gap-3 py-2 text-[12px]">
                  <span className="text-ink">
                    {r.count} · {blockName(r.from)} → {blockName(r.to)}
                    <span className="block text-[11px] text-ink-muted">{r.reason}</span>
                  </span>
                  <span className="font-mono text-[11px] text-ink-faint">{r.at}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {lowTurnout.length > 0 && (
          <Panel title="Turnout is a pay signal" className="border-amber-700/25">
            {lowTurnout.map((m) => (
              <p key={m.block} className="text-[12.5px] leading-relaxed text-ink">
                <b>{m.name}</b> mustered {m.present} of {m.rostered}. {m.note}. Workers who aren&rsquo;t sure they&rsquo;ll be paid
                on time stop turning up, so it&rsquo;s worth fixing before anyone is disciplined.
              </p>
            ))}
            <Link to="/app/operations/desk/payroll" className="mt-3 inline-block font-mono text-[11px] uppercase tracking-[0.12em] text-emerald-700 hover:text-emerald-800">
              This week&rsquo;s payroll run →
            </Link>
          </Panel>
        )}
      </div>
    </div>
  )
}
