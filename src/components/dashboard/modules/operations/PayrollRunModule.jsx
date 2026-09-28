import { useState } from 'react'
import { Banknote, CheckCircle2, PauseCircle, Users } from 'lucide-react'
import { ModuleHeader, Panel, StatTile, StatusPill } from '../../DashboardKit'
import { OPERATIONS, blockName } from '../../../../lib/dashboard/operationsManager'
import { releasePayroll, sendReminder, useOperations } from '../../../../lib/dashboard/operationsStore'
import { DoneNote, SecondaryButton } from './controls'

const kes = (n) => `KES ${n.toLocaleString()}`

export default function PayrollRunModule() {
  const s = useOperations()
  const { payroll } = OPERATIONS
  const releasable = s.payrollBlocks.filter((b) => b.approved && !b.releasedAt)
  const [excluded, setExcluded] = useState([])
  const [confirming, setConfirming] = useState(false)

  const selected = releasable.filter((b) => !excluded.includes(b.block))
  const heldInSelection = payroll.held.filter((h) => selected.some((b) => b.block === h.block))
  const heldKes = heldInSelection.reduce((sum, h) => sum + h.amountKes, 0)
  const netKes = selected.reduce((sum, b) => sum + b.grossKes, 0) - heldKes
  const workers = selected.reduce((sum, b) => sum + b.workers, 0)
  const grossAll = s.payrollBlocks.reduce((sum, b) => sum + b.grossKes, 0)
  const workersAll = s.payrollBlocks.reduce((sum, b) => sum + b.workers, 0)
  const approvedCount = s.payrollBlocks.filter((b) => b.approved).length
  const pending = s.payrollBlocks.filter((b) => !b.approved)

  const toggle = (block) => {
    setConfirming(false)
    setExcluded((prev) => (prev.includes(block) ? prev.filter((b) => b !== block) : [...prev, block]))
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Payroll Run"
        sub={`${payroll.ref} · ${payroll.week} · pay date ${payroll.payDate} · ${payroll.rail}`}
        actions={<StatusPill status={s.released ? 'Released' : 'Awaiting release'} tone={s.released ? 'positive' : 'warn'} />}
        prototype
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Workers in run" value={workersAll.toLocaleString()} unit={`${s.payrollBlocks.length} blocks`} icon={Users} />
        <StatTile label="Gross this week" value={(grossAll / 1e6).toFixed(2)} unit="KES million" icon={Banknote} />
        <StatTile
          label="Supervisor-approved"
          value={`${approvedCount} / ${s.payrollBlocks.length}`}
          tone={pending.length ? 'warn' : 'positive'}
          note={pending.length ? `${pending.map((b) => b.name).join(', ')} outstanding` : 'all blocks'}
          share={approvedCount / s.payrollBlocks.length}
          icon={CheckCircle2}
        />
        <StatTile label="Lines held" value={payroll.held.length} unit={kes(payroll.held.reduce((sum, h) => sum + h.amountKes, 0))} icon={PauseCircle} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          <Panel title="Blocks in this run" lede="Each supervisor approves their own block. You check it and choose which approved blocks go in this batch.">
            <ul className="divide-y divide-line">
              {s.payrollBlocks.map((b) => {
                const canPick = b.approved && !b.releasedAt
                return (
                  <li key={b.block} className="flex flex-wrap items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <input
                      type="checkbox"
                      id={`pay-${b.block}`}
                      checked={canPick && !excluded.includes(b.block)}
                      disabled={!canPick || Boolean(s.released)}
                      onChange={() => toggle(b.block)}
                      className="mt-1 accent-emerald-700"
                    />
                    <label htmlFor={`pay-${b.block}`} className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-ink">
                        {b.name} <span className="font-normal text-ink-muted">· {b.supervisor}</span>
                      </span>
                      <span className="block font-mono text-[11px] tabular-nums text-ink-muted">
                        {b.workers} workers · {b.tickets.toLocaleString()} tickets · {kes(b.grossKes)}
                      </span>
                      {b.note && <span className={'block text-[11px] ' + (b.approved ? 'text-amber-700' : 'text-ink-muted')}>{b.note}</span>}
                    </label>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {b.releasedAt ? (
                        <StatusPill status={`Released ${b.releasedAt}`} tone="positive" />
                      ) : b.approved ? (
                        <StatusPill status={`Approved ${b.approved}`} tone="positive" />
                      ) : (
                        <StatusPill status="Not approved" tone="warn" />
                      )}
                      {!b.approved &&
                        (s.reminders[`${b.block}:payroll`] ? (
                          <DoneNote>SMS sent {s.reminders[`${b.block}:payroll`]}</DoneNote>
                        ) : (
                          <SecondaryButton onClick={() => sendReminder(b.block, 'payroll')}>Chase {b.supervisor}</SecondaryButton>
                        ))}
                    </div>
                  </li>
                )
              })}
            </ul>
          </Panel>

          <Panel title="Held lines" lede="Held out of the batch, never cancelled. Each pays in the next run once it's resolved.">
            <ul className="divide-y divide-line">
              {payroll.held.map((h) => (
                <li key={h.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-mono text-[12px] text-ink">
                      {h.id} · {h.worker} · {blockName(h.block)}
                    </p>
                    <p className="text-[11px] text-ink-muted">{h.reason}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[12.5px] tabular-nums text-ink">{kes(h.amountKes)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-emerald-950 p-[18px] shadow-card">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-400/80">Release to {payroll.rail}</p>
            {s.released ? (
              <div aria-live="polite">
                <p className="mt-2.5 font-display text-[17px] leading-[1.4] text-bone">
                  {kes(s.released.amountKes)} sent to {s.released.workers.toLocaleString()} workers&rsquo; phones.
                </p>
                <dl className="mt-3.5 space-y-1.5 border-t border-emerald-900 pt-3 text-[11.5px] text-emerald-100/80">
                  <div className="flex justify-between gap-3">
                    <dt>Batch</dt>
                    <dd className="font-mono text-bone">{s.released.batchRef}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Released</dt>
                    <dd className="font-mono text-bone">{s.released.at} · by you</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Blocks</dt>
                    <dd className="text-right font-mono text-bone">{s.released.blocks.map(blockName).join(', ')}</dd>
                  </div>
                </dl>
                {pending.length > 0 && (
                  <p className="mt-3 text-[11.5px] leading-relaxed text-emerald-100/80">
                    {pending.map((b) => b.name).join(', ')} goes in a follow-up batch once {pending.map((b) => b.supervisor).join(', ')} approves.
                  </p>
                )}
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-emerald-400/70">Prototype — no money moved</p>
              </div>
            ) : (
              <>
                <dl className="mt-3 space-y-1.5 text-[11.5px] text-emerald-100/80">
                  <div className="flex justify-between gap-3">
                    <dt>Blocks selected</dt>
                    <dd className="font-mono text-bone">{selected.length ? selected.map((b) => b.name).join(', ') : 'none'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Workers</dt>
                    <dd className="font-mono text-bone">{workers.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Held lines excluded</dt>
                    <dd className="font-mono text-bone">
                      {heldInSelection.length} · {kes(heldKes)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-emerald-900 pt-2 text-[13px]">
                    <dt className="text-bone">Net to release</dt>
                    <dd className="font-mono font-semibold text-bone">{kes(netKes)}</dd>
                  </div>
                </dl>
                {confirming ? (
                  <div className="mt-4 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3">
                    <p className="text-[12px] leading-relaxed text-bone">
                      Send {kes(netKes)} to {workers.toLocaleString()} workers now? M-Pesa payouts can&rsquo;t be pulled back once
                      they land.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => releasePayroll(selected.map((b) => b.block))}
                        className="flex-1 rounded-[10px] bg-amber-400 py-2.5 text-[13px] font-semibold text-forest-950 transition-colors hover:bg-amber-500"
                      >
                        Confirm release
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(false)}
                        className="rounded-[10px] border border-emerald-800 px-3 text-[12px] text-emerald-100/80 transition-colors hover:text-bone"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    disabled={!selected.length}
                    className="mt-4 w-full rounded-[10px] bg-amber-400 py-3 text-[13px] font-semibold text-forest-950 transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Release batch…
                  </button>
                )}
              </>
            )}
          </div>

          <div className="rounded-xl border border-[#c3dcda] bg-[#dfeceb] p-4">
            <p className="text-[11.5px] leading-relaxed text-[#3d6b67]">
              <b>Why you can&rsquo;t approve a block yourself.</b> The supervisor who watched the kilos go on the scale approves
              them (maker); the ops desk checks and releases (checker). If one person could do both, payroll fraud would take
              only one person. You can only chase an unapproved block, never approve it on the supervisor&rsquo;s behalf.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
