import { useState } from 'react'
import { Flame, Footprints, MapPin, Sprout, TreePine } from 'lucide-react'
import { BarMeter, BulletBar, DataTable, ModuleHeader, Panel, StatTile, StatusPill } from '../../DashboardKit'
import { OPERATIONS, blockName } from '../../../../lib/dashboard/operationsManager'
import {
  activateFireWatch,
  allocateSeedlings,
  orderBeatUp,
  raiseBeaconRepair,
  raiseFirebreakOrder,
  schedulePatrol,
  scheduleSurvivalCheck,
  useOperations,
} from '../../../../lib/dashboard/operationsStore'
import { DoneNote, PrimaryButton, SecondaryButton, SelectField, inputClass } from './controls'

const PATROL_DAYS = ['Tue 8 Sep', 'Wed 9 Sep', 'Thu 10 Sep', 'Fri 11 Sep', 'Sat 12 Sep']
const PATROL_PARTNERS = ['NTZDC scouts', 'Joint with KFS rangers', 'Joint with the CFA']

function FireReadiness({ s }) {
  const { fireDanger } = OPERATIONS.conservation
  const breaks = s.conservation.firebreaks
  return (
    <Panel
      title="Fire readiness"
      lede={fireDanger.note}
      className={s.fireWatch ? '' : 'border-amber-700/25'}
      actions={
        s.fireWatch ? (
          <StatusPill status="Fire watch active" tone="positive" />
        ) : (
          <PrimaryButton onClick={activateFireWatch}>
            <Flame className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
            Activate fire watch
          </PrimaryButton>
        )
      }
    >
      <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
        Fire danger {fireDanger.rating} · {fireDanger.dryDays} dry days · {fireDanger.source}
      </p>
      <ul className="space-y-3.5">
        {breaks.map((f) => {
          const short = +(f.requiredKm - f.clearedKm).toFixed(1)
          return (
            <li key={f.block} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <BulletBar
                label={`${blockName(f.block)} firebreak · last cleared ${f.lastCleared}`}
                value={f.clearedKm}
                target={f.requiredKm}
                max={f.requiredKm}
                display={`${f.clearedKm} / ${f.requiredKm} km`}
                targetLabel={`${f.requiredKm} km required`}
              />
              <div className="sm:w-44 sm:text-right">
                {short > 0 &&
                  (f.orderId ? (
                    <DoneNote>{f.orderId} raised</DoneNote>
                  ) : (
                    <SecondaryButton onClick={() => raiseFirebreakOrder(f.block)}>Clear {short} km</SecondaryButton>
                  ))}
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function Patrols({ s }) {
  const [block, setBlock] = useState('TIN')
  const [day, setDay] = useState(PATROL_DAYS[0])
  const [partner, setPartner] = useState(PATROL_PARTNERS[1])
  const target = OPERATIONS.conservation.patrolsPerWeek
  return (
    <Panel title="Edge patrols · this week" lede={`Target ${target} patrols per block per week along the forest edge. Blocks with live logging or encroachment reports need more.`}>
      <ul className="space-y-3">
        {s.conservation.patrols.map((p) => {
          const planned = p.done + p.scheduled.length
          return (
            <li key={p.block}>
              <BarMeter label={blockName(p.block)} value={Math.min(planned, target)} max={target} display={`${p.done} done${p.scheduled.length ? ` + ${p.scheduled.length} scheduled` : ''} / ${target}`} tone={planned < target ? 'amber' : 'emerald'} />
              {p.scheduled.map((x, i) => (
                <p key={i} className="mt-1 text-[11px] text-ink-muted">
                  {x.day} · {x.partner}
                </p>
              ))}
            </li>
          )
        })}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          schedulePatrol(block, day, partner)
        }}
        className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_1.3fr_auto] sm:items-end"
      >
        <SelectField id="patrol-block" label="Block" value={block} onChange={setBlock} options={s.muster.map((m) => ({ value: m.block, label: m.name }))} />
        <SelectField id="patrol-day" label="Day" value={day} onChange={setDay} options={PATROL_DAYS.map((d) => ({ value: d, label: d }))} />
        <SelectField id="patrol-partner" label="With" value={partner} onChange={setPartner} options={PATROL_PARTNERS.map((d) => ({ value: d, label: d }))} />
        <PrimaryButton type="submit">
          <Footprints className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
          Schedule
        </PrimaryButton>
      </form>
    </Panel>
  )
}

function Planting({ s }) {
  const { nursery, planting } = s.conservation
  const [block, setBlock] = useState('TIN')
  const [species, setSpecies] = useState(nursery[0].species)
  const [qty, setQty] = useState('200')
  const stock = nursery.find((n) => n.species === species)
  const plan = planting.find((p) => p.block === block)
  const n = Number(qty)
  const isTea = species.startsWith('Tea')
  const room = plan.treeTarget - plan.allocated
  const error = !n || n < 1 ? 'Enter a quantity.' : n > stock.ready ? `Only ${stock.ready.toLocaleString()} ready in the nursery.` : !isTea && n > room ? `${blockName(block)} needs ${room.toLocaleString()} more trees to reach its target.` : null

  return (
    <Panel title="Nursery & short-rains planting" lede={`${OPERATIONS.conservation.season}. Allocate hardened-off seedlings to each block's planting target; tea clones go to infilling gaps in the tea rows and don't count toward the tree target.`}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">Zone nursery · Sururu</p>
          <ul className="divide-y divide-line">
            {nursery.map((sp) => (
              <li key={sp.species} className="flex items-baseline justify-between gap-3 py-2 text-[12.5px]">
                <span className="text-ink">{sp.species}</span>
                <span className="shrink-0 font-mono tabular-nums text-ink-muted">
                  <b className="font-semibold text-ink">{sp.ready.toLocaleString()}</b> ready · {sp.hardening.toLocaleString()} hardening
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">Tree planting target by block</p>
          <ul className="space-y-3">
            {planting.map((p) => (
              <li key={p.block}>
                <BulletBar
                  label={`${blockName(p.block)} · ${p.pitsDug} pits dug`}
                  value={p.allocated}
                  target={p.treeTarget}
                  max={p.treeTarget}
                  display={`${p.allocated.toLocaleString()} / ${p.treeTarget.toLocaleString()} allocated`}
                  targetLabel={`Target ${p.treeTarget}`}
                  behind={p.pitsDug < p.treeTarget * 0.5}
                />
                {p.pitsDug < p.treeTarget * 0.5 && <p className="mt-1 text-[11px] text-amber-700">Only {Math.round((p.pitsDug / p.treeTarget) * 100)}% of pits dug — seedlings can&rsquo;t go in without them</p>}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!error) allocateSeedlings(block, species, n)
        }}
        className="mt-5 space-y-2 border-t border-line pt-4"
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_1.6fr_7rem_auto] sm:items-end">
          <SelectField id="alloc-block" label="Block" value={block} onChange={setBlock} options={planting.map((p) => ({ value: p.block, label: blockName(p.block) }))} />
          <SelectField id="alloc-species" label="Species" value={species} onChange={setSpecies} options={nursery.map((x) => ({ value: x.species, label: x.species }))} />
          <div>
            <label htmlFor="alloc-qty" className="block text-[12px] font-medium text-ink-muted">
              Seedlings
            </label>
            <input id="alloc-qty" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className={inputClass + ' text-right font-mono tabular-nums'} />
          </div>
          <PrimaryButton type="submit" disabled={Boolean(error)}>
            <Sprout className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
            Allocate
          </PrimaryButton>
        </div>
        {error && <p className="text-[11.5px] text-amber-700">{error}</p>}
      </form>
    </Panel>
  )
}

const COHORT_COLUMNS = [
  { key: 'plot', label: 'Plot' },
  { key: 'planted', label: 'Planted', align: 'right' },
  { key: 'survivalPct', label: 'Surviving', align: 'right' },
  { key: 'nextCheck', label: 'Next check' },
  { key: 'action', label: '' },
]

function Survival({ s }) {
  const { cohorts, survivalTargetPct } = s.conservation
  return (
    <Panel title="Survival checks" lede={`A tree counts when it survives, not when it goes in. Each planting is counted at 3, 6 and 12 months. Under ${survivalTargetPct}%, the gaps are replanted ("beating up") in the next rains.`}>
      <DataTable
        columns={COHORT_COLUMNS}
        rows={cohorts}
        csvName="ForestOS-ops-survival-cohorts"
        renderCell={(key, c) => {
          if (key === 'plot')
            return (
              <span>
                <span className="font-mono font-semibold">{c.plot}</span>
                <span className="block text-[11px] text-ink-muted">{c.season}</span>
              </span>
            )
          if (key === 'planted') return <span className="font-mono tabular-nums">{c.planted}</span>
          if (key === 'survivalPct')
            return (
              <span className={'font-mono tabular-nums ' + (c.survivalPct < survivalTargetPct ? 'text-amber-700' : 'text-ink')}>
                {c.survivalPct}%<span className="block text-[10.5px] text-ink-faint">at {c.lastCheck}</span>
              </span>
            )
          if (key === 'nextCheck') return c.nextDue === '—' ? <span className="text-ink-muted">Checks complete</span> : `${c.nextCheck} · ${c.nextDue}`
          if (key === 'action')
            return (
              <div className="flex flex-wrap justify-end gap-1.5">
                {c.status === 'Due' && <PrimaryButton onClick={() => scheduleSurvivalCheck(c.id)}>Schedule check</PrimaryButton>}
                {c.checkOrder && <DoneNote>{c.checkOrder}</DoneNote>}
                {c.survivalPct < survivalTargetPct &&
                  (c.beatUp ? <DoneNote>Replanting {c.beatUp}</DoneNote> : <SecondaryButton onClick={() => orderBeatUp(c.id)}>Order replanting</SecondaryButton>)}
              </div>
            )
          return c[key]
        }}
      />
    </Panel>
  )
}

export default function BufferConservationModule() {
  const s = useOperations()
  const c = s.conservation
  const kmCleared = c.firebreaks.reduce((sum, f) => sum + f.clearedKm, 0)
  const kmRequired = c.firebreaks.reduce((sum, f) => sum + f.requiredKm, 0)
  const patrolTarget = OPERATIONS.conservation.patrolsPerWeek * c.patrols.length
  const patrolsPlanned = c.patrols.reduce((sum, p) => sum + Math.min(OPERATIONS.conservation.patrolsPerWeek, p.done + p.scheduled.length), 0)
  const allocated = c.planting.reduce((sum, p) => sum + p.allocated, 0)
  const target = c.planting.reduce((sum, p) => sum + p.treeTarget, 0)
  const below = c.cohorts.filter((x) => x.survivalPct < c.survivalTargetPct)

  return (
    <div className="space-y-5">
      <ModuleHeader title="Buffer & Conservation" sub={`${OPERATIONS.name} · the ground work behind the buffer: fire, patrols, planting, survival, boundaries`} prototype />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Firebreaks cleared" value={`${Math.round((kmCleared / kmRequired) * 100)}%`} unit={`${kmCleared.toFixed(1)} of ${kmRequired.toFixed(1)} km`} tone={kmCleared < kmRequired ? 'warn' : 'default'} share={kmCleared / kmRequired} icon={Flame} />
        <StatTile label="Edge patrols · week" value={`${patrolsPlanned} / ${patrolTarget}`} unit="done or scheduled" share={patrolsPlanned / patrolTarget} icon={Footprints} />
        <StatTile label="Short-rains trees allocated" value={allocated.toLocaleString()} unit={`of ${target.toLocaleString()} target`} share={allocated / target} icon={Sprout} />
        <StatTile label="Plantings under target" value={below.length} tone={below.length ? 'warn' : 'default'} note={below.map((x) => `${x.plot} ${x.survivalPct}%`).join(', ') || 'none'} icon={TreePine} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <FireReadiness s={s} />
        <Patrols s={s} />
      </div>

      <Planting s={s} />
      <Survival s={s} />

      <Panel
        title="Boundary beacons"
        lede="The concrete beacons that mark the buffer's legal edge. The registry's plot geometry, and every satellite check against it, is only as good as these."
        actions={c.beacons.orderId ? <DoneNote>{c.beacons.orderId} raised</DoneNote> : <PrimaryButton onClick={raiseBeaconRepair}><MapPin className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />Raise repair order</PrimaryButton>}
      >
        <BarMeter label="Inspected this quarter" value={c.beacons.inspectedThisQuarter} max={c.beacons.total} display={`${c.beacons.inspectedThisQuarter} / ${c.beacons.total}`} />
        <p className="mt-3 text-[12.5px] text-ink">
          <b>{c.beacons.missing} missing</b>, <b>{c.beacons.damaged} damaged</b> — {c.beacons.where}.
        </p>
      </Panel>
    </div>
  )
}
