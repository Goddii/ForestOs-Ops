import { useState } from 'react'
import { ArrowUpRight, Check, ClipboardList, Hammer, Package, Plus, X } from 'lucide-react'
import { BulletBar, DataTable, ModuleHeader, Panel, StatTile, StatusPill } from '../../DashboardKit'
import { OPERATIONS, blockName } from '../../../../lib/dashboard/operationsManager'
import { approveWorkOrder, createWorkOrder, decideRequisition, declineWorkOrder, referRequisition, requisitionValue, useOperations } from '../../../../lib/dashboard/operationsStore'
import { DoneNote, PrimaryButton, SecondaryButton, SelectField, inputClass } from './controls'

const WORK_TYPES = ['Pruning cycle', 'Weeding', 'Buffer planting', 'Survival check', 'Firebreak clearing', 'Nursery potting', 'Boundary patrol', 'Track repair']

const WO_TONE = { Requested: 'warn', Scheduled: 'neutral', 'In progress': 'positive', Overdue: 'critical', Declined: 'neutral' }
const REQ_TONE = { Pending: 'warn', Issued: 'positive', 'Part-issued': 'warn', Declined: 'neutral', Referred: 'neutral' }

const WO_COLUMNS = [
  { key: 'id', label: 'Order', mono: true },
  { key: 'type', label: 'Work' },
  { key: 'block', label: 'Block' },
  { key: 'crew', label: 'Crew', align: 'right' },
  { key: 'start', label: 'Start', mono: true },
  { key: 'status', label: 'Status' },
  { key: 'action', label: '' },
]

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

function NewWorkOrderForm({ blocks }) {
  const [type, setType] = useState(WORK_TYPES[0])
  const [block, setBlock] = useState(blocks[0].block)
  const [scope, setScope] = useState('')
  const [crew, setCrew] = useState('10')
  const [start, setStart] = useState('2026-09-10')
  const [priority, setPriority] = useState('Normal')
  const [raised, setRaised] = useState(false)
  const valid = scope.trim() && Number(crew) > 0 && start

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        createWorkOrder({ type, block, scope: scope.trim(), crew: Number(crew), start, priority })
        setScope('')
        setRaised(true)
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField id="wo-type" label="Work" value={type} onChange={setType} options={WORK_TYPES.map((t) => ({ value: t, label: t }))} />
        <SelectField id="wo-block" label="Block" value={block} onChange={setBlock} options={blocks.map((b) => ({ value: b.block, label: b.name }))} />
        <div className="sm:col-span-2">
          <label htmlFor="wo-scope" className="block text-[12px] font-medium text-ink-muted">
            Plots / scope
          </label>
          <input id="wo-scope" type="text" value={scope} onChange={(e) => { setScope(e.target.value); setRaised(false) }} placeholder="e.g. TIN-01 → TIN-05" className={inputClass} />
        </div>
        <div>
          <label htmlFor="wo-crew" className="block text-[12px] font-medium text-ink-muted">
            Crew size
          </label>
          <input id="wo-crew" type="number" min="1" value={crew} onChange={(e) => setCrew(e.target.value)} className={inputClass + ' text-right font-mono tabular-nums'} />
        </div>
        <div>
          <label htmlFor="wo-start" className="block text-[12px] font-medium text-ink-muted">
            Start
          </label>
          <input id="wo-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
        </div>
        <SelectField id="wo-priority" label="Priority" value={priority} onChange={setPriority} options={['Normal', 'High'].map((p) => ({ value: p, label: p }))} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton type="submit" disabled={!valid}>
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
          Raise work order
        </PrimaryButton>
        {raised && <DoneNote>Raised and scheduled (prototype) — it&rsquo;s at the top of the list.</DoneNote>}
      </div>
    </form>
  )
}

export default function WorkOrdersModule() {
  const s = useOperations()
  const requested = s.workOrders.filter((w) => w.status === 'Requested')
  const active = s.workOrders.filter((w) => w.status === 'Scheduled' || w.status === 'In progress')
  const overdue = s.workOrders.filter((w) => w.status === 'Overdue')
  const pendingReqs = s.requisitions.filter((r) => r.status === 'Pending')

  return (
    <div className="space-y-5">
      <ModuleHeader title="Work Orders & Stores" sub={`${OPERATIONS.name} · field work across ${s.muster.length} blocks, and the inputs it draws from zone stores`} prototype />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Awaiting approval" value={requested.length} tone={requested.length ? 'warn' : 'default'} note={requested.some((w) => w.priority === 'High') ? 'includes high priority' : undefined} icon={ClipboardList} />
        <StatTile label="Scheduled or running" value={active.length} unit="work orders" icon={Hammer} />
        <StatTile label="Overdue" value={overdue.length} tone={overdue.length ? 'critical' : 'default'} note={overdue.map((w) => `${w.type} · ${blockName(w.block)}`).join(', ') || 'none'} icon={ClipboardList} />
        <StatTile label="Requisitions pending" value={pendingReqs.length} tone={pendingReqs.length ? 'warn' : 'default'} icon={Package} />
      </div>

      <Panel title="Work orders" lede="Supervisors request block work; you approve it into the schedule. Approving commits the crew on that date.">
        <DataTable
          columns={WO_COLUMNS}
          rows={s.workOrders}
          sortable
          csvName="ForestOS-ops-work-orders"
          renderCell={(key, w) => {
            if (key === 'type')
              return (
                <span>
                  <span className="font-semibold">{w.type}</span>
                  {w.priority === 'High' && <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.1em] text-amber-700">high</span>}
                  <span className="block text-[11px] text-ink-muted">
                    {w.scope} · by {w.requestedBy}
                  </span>
                </span>
              )
            if (key === 'block') return blockName(w.block)
            if (key === 'start') return formatDate(w.start)
            if (key === 'status') return <StatusPill status={w.status} tone={WO_TONE[w.status]} />
            if (key === 'action')
              return w.status === 'Requested' ? (
                <div className="flex gap-1.5">
                  <PrimaryButton onClick={() => approveWorkOrder(w.id)} aria-label={`Approve ${w.id}`}>
                    <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                    Approve
                  </PrimaryButton>
                  <SecondaryButton onClick={() => declineWorkOrder(w.id)} aria-label={`Decline ${w.id}`}>
                    <X className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                  </SecondaryButton>
                </div>
              ) : null
            return w[key]
          }}
        />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <Panel title="Raise a work order" lede="For work the ops desk initiates, like a survival check or firebreak. It goes straight into the schedule.">
          <NewWorkOrderForm blocks={s.muster} />
        </Panel>

        <Panel
          title="Stores requisitions"
          lede={`You approve up to KES ${OPERATIONS.approvalLimitKes.toLocaleString()} per requisition; above that it goes up to HQ Operations. Issuing more than stores hold sends what there is and records the shortfall.`}
        >
          <ul className="divide-y divide-line">
            {s.requisitions.map((r) => {
              const pending = r.status === 'Pending'
              const short = pending && r.qty > r.onHand
              const value = requisitionValue(r)
              const overLimit = value > OPERATIONS.approvalLimitKes
              return (
                <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink">{r.item}</p>
                      <p className="text-[11px] text-ink-muted">
                        <span className="font-mono">{r.id}</span> · {r.block ? blockName(r.block) : 'Zone-wide'} · {r.requestedBy}
                        {r.forOrder && ` · for ${r.forOrder}`}
                      </p>
                    </div>
                    <StatusPill status={r.status === 'Referred' ? 'Referred to HQ' : r.status} tone={REQ_TONE[r.status]} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-[11.5px] tabular-nums text-ink">
                      {pending || r.status === 'Referred'
                        ? `${r.qty.toLocaleString()} ${r.unit} asked · ${r.onHand.toLocaleString()} in stores · ${value ? `KES ${value.toLocaleString()}` : 'own nursery stock'}`
                        : `${(r.issued ?? 0).toLocaleString()} of ${r.qty.toLocaleString()} ${r.unit} issued · ${r.onHand.toLocaleString()} left`}
                      {pending && overLimit && <span className="block text-amber-700">Above your KES {OPERATIONS.approvalLimitKes.toLocaleString()} limit — refer it up</span>}
                      {short && !overLimit && <span className="block text-amber-700">Only {r.onHand} on hand — issuing now sends part</span>}
                    </p>
                    {pending && (
                      <div className="flex gap-1.5">
                        {overLimit ? (
                          <PrimaryButton onClick={() => referRequisition(r.id)}>
                            <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                            Refer to HQ
                          </PrimaryButton>
                        ) : (
                          <PrimaryButton onClick={() => decideRequisition(r.id, true)}>{short ? 'Issue part' : 'Issue'}</PrimaryButton>
                        )}
                        <SecondaryButton onClick={() => decideRequisition(r.id, false)}>Decline</SecondaryButton>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>

      <Panel
        title={`Operating budget · ${OPERATIONS.budget.month}`}
        lede="The zone's field running costs, by line. Issuing a requisition charges its line. Worker pay is its own run, not a line here."
      >
        <div className="grid gap-x-8 gap-y-3.5 md:grid-cols-2">
          {s.budget.map((line) => (
            <BulletBar
              key={line.id}
              label={line.label}
              value={line.spentKes}
              target={line.budgetKes}
              max={Math.max(line.budgetKes, line.spentKes) * 1.05}
              display={`KES ${(line.spentKes / 1000).toFixed(0)}k / ${(line.budgetKes / 1000).toFixed(0)}k`}
              targetLabel={`Budget KES ${line.budgetKes.toLocaleString()}`}
              behind={line.spentKes > line.budgetKes * 0.85}
            />
          ))}
        </div>
        <p className="mt-4 text-[11.5px] text-ink-muted">Amber is past 85% of the line with the month not yet over. Fleet &amp; scale maintenance is the one to watch: two lorry services and two weighbridge re-verifications are still to come.</p>
      </Panel>
    </div>
  )
}
