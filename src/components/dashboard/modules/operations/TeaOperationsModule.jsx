import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Factory, Leaf, Scale, Truck } from 'lucide-react'
import { BulletBar, DataTable, ModuleHeader, Panel, StatTile } from '../../DashboardKit'
import { NATIONAL } from '../../../../lib/dashboard/operationsNational'
import { divertLeaf, lendLorry, nationalKpis, useOperations, zoneName } from '../../../../lib/dashboard/operationsStore'
import { DoneNote, PrimaryButton, SelectField, inputClass } from './controls'

const COLUMNS = [
  { key: 'name', label: 'Zone' },
  { key: 'leaf', label: 'Leaf vs plan', sortAccessor: (z) => z.leafKg / z.planKg },
  { key: 'maxLeafAgeHrs', label: 'Oldest leaf', align: 'right' },
  { key: 'rejectionPct', label: 'Rejected', align: 'right' },
  { key: 'fineLeafPct', label: 'Fine leaf', align: 'right' },
  { key: 'pluckingOverdue', label: 'Rounds late', align: 'right' },
  { key: 'factory', label: 'Factory' },
]

function factoryRows(s, zones) {
  const swm = zones.find((z) => z.id === 'SWM')
  return NATIONAL.factories.map((f) => {
    const baseIntake = f.intakeT ?? +(swm.leafKg / 1000).toFixed(2)
    const out = s.national.diversions.filter((d) => d.fromId === f.id).reduce((sum, d) => sum + d.tPerDay, 0)
    const inn = s.national.diversions.filter((d) => d.toId === f.id).reduce((sum, d) => sum + d.tPerDay, 0)
    return { ...f, intake: +(baseIntake - out + inn).toFixed(2), divertedOut: out, divertedIn: inn }
  })
}

function DivertForm({ from, targets }) {
  const overflow = +(from.intake - from.capacityT).toFixed(2)
  const [picked, setPicked] = useState('')
  const to = targets.some((t) => t.id === picked) ? picked : (targets[0]?.id ?? '')
  const [t, setT] = useState(String(Math.max(0.1, +(overflow + 0.2).toFixed(1))))
  const target = targets.find((x) => x.id === to)
  const headroom = target ? +(target.capacityT - target.intake).toFixed(2) : 0
  const n = Number(t)
  const error = !target ? 'No factory has headroom.' : !n || n <= 0 ? 'Enter tonnes per day.' : n > headroom ? `${target.name} only has ${headroom} t/day of headroom.` : null
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!error) divertLeaf(from.id, to, n)
      }}
      className="mt-2 space-y-2 rounded-lg border border-amber-700/25 bg-[#fdf4e7] p-3"
    >
      <p className="text-[12px] text-ink">
        {from.name} is {overflow} t/day over. Divert the overflow for the rest of the flush. Leaf travels further, so it
        needs the earliest pickups.
      </p>
      <div className="grid gap-2 sm:grid-cols-[1.6fr_7rem_auto] sm:items-end">
        <SelectField id={`divert-${from.id}`} label="Divert to" value={to} onChange={setPicked} options={targets.map((x) => ({ value: x.id, label: `${x.name} · ${(x.capacityT - x.intake).toFixed(1)} t headroom` }))} />
        <div>
          <label htmlFor={`divert-t-${from.id}`} className="block text-[12px] font-medium text-ink-muted">
            t / day
          </label>
          <input id={`divert-t-${from.id}`} type="number" step="0.1" min="0.1" value={t} onChange={(e) => setT(e.target.value)} className={inputClass + ' text-right font-mono tabular-nums'} />
        </div>
        <PrimaryButton type="submit" disabled={Boolean(error)}>
          Divert
        </PrimaryButton>
      </div>
      {error && <p className="text-[11.5px] text-amber-700">{error}</p>}
    </form>
  )
}

function LendLorry({ lorry, zones, loans }) {
  const needy = zones.filter((z) => z.fleet.down > 0 && z.id !== lorry.zone)
  const [picked, setPicked] = useState('')
  const to = needy.some((z) => z.id === picked) ? picked : (needy.sort((a, b) => b.fleet.down - a.fleet.down)[0]?.id ?? '')
  const loan = loans.find((l) => l.lorryId === lorry.id)
  return (
    <li className="flex flex-wrap items-end justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="font-mono text-[13px] font-semibold text-ink">{lorry.id}</p>
        <p className="text-[11px] text-ink-muted">
          {zoneName(lorry.zone)} · {lorry.capacityKg.toLocaleString()} kg · {lorry.note}
        </p>
      </div>
      {loan ? (
        <DoneNote>On loan to {zoneName(loan.toZone)} this week</DoneNote>
      ) : (
        <div className="flex items-end gap-2">
          <SelectField id={`lend-${lorry.id}`} label={`Zone to lend ${lorry.id} to`} hideLabel value={to} onChange={setPicked} options={needy.map((z) => ({ value: z.id, label: `${z.name} · ${z.fleet.down} down` }))} className="w-52" />
          <PrimaryButton onClick={() => lendLorry(lorry.id, to)} disabled={!to}>
            <Truck className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
            Lend for the week
          </PrimaryButton>
        </div>
      )}
    </li>
  )
}

export default function TeaOperationsModule() {
  const s = useOperations()
  const k = nationalKpis(s)
  const factories = factoryRows(s, k.zones)
  const over = factories.filter((f) => f.intake > f.capacityT)
  const weightedRejection = k.zones.reduce((sum, z) => sum + z.rejectionPct * z.leafKg, 0) / k.leafKg

  return (
    <div className="space-y-5">
      <ModuleHeader title="Tea Operations" sub={`${NATIONAL.today} · green leaf from ${k.zones.length} zones to ${factories.length} factories, and the fleet between them`} prototype />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Green leaf · today" value={(k.leafKg / 1000).toFixed(1)} unit={`t of ${(k.planKg / 1000).toFixed(1)} t plan`} share={k.leafKg / k.planKg} icon={Leaf} />
        <StatTile label="Fleet moving" value={`${k.fleetMoving} / ${k.fleetTotal}`} tone={k.zones.some((z) => z.fleet.down) ? 'warn' : 'default'} note={`${k.zones.reduce((sum, z) => sum + z.fleet.down, 0)} lorries down`} icon={Truck} />
        <StatTile label="Leaf rejected" value={`${weightedRejection.toFixed(1)}%`} unit="intake-weighted, all zones" icon={Scale} />
        <StatTile label="Factories over capacity" value={over.length} tone={over.length ? 'warn' : 'default'} note={over.map((f) => f.name.replace(' Tea Factory', '')).join(', ') || 'none'} icon={Factory} />
      </div>

      <Panel title="Leaf by zone" lede="Late plucking rounds show up here first: fine leaf falls and rejections rise before the tonnage does.">
        <DataTable
          columns={COLUMNS}
          rows={k.zones}
          sortable
          csvName="ForestOS-national-tea-operations"
          renderCell={(key, z) => {
            if (key === 'name') return <span className="font-semibold">{z.name}</span>
            if (key === 'leaf')
              return (
                <div className="min-w-[10rem]">
                  <BulletBar label="" value={z.leafKg} target={z.planKg} max={Math.max(z.planKg, z.leafKg) * 1.08} display={`${(z.leafKg / 1000).toFixed(1)} / ${(z.planKg / 1000).toFixed(1)} t`} targetLabel="Plan" behind={z.leafKg < z.planKg * 0.85} />
                </div>
              )
            if (key === 'maxLeafAgeHrs') return <span className={'font-mono tabular-nums ' + (z.maxLeafAgeHrs >= 4 ? 'text-critical' : z.maxLeafAgeHrs >= 3 ? 'text-amber-700' : '')}>{z.maxLeafAgeHrs} h</span>
            if (key === 'rejectionPct') return <span className={'font-mono tabular-nums ' + (z.rejectionPct >= 6 ? 'text-amber-700' : '')}>{z.rejectionPct}%</span>
            if (key === 'fineLeafPct') return <span className={'font-mono tabular-nums ' + (z.fineLeafPct < 70 ? 'text-amber-700' : '')}>{z.fineLeafPct}%</span>
            if (key === 'pluckingOverdue') return <span className={'font-mono tabular-nums ' + (z.pluckingOverdue ? 'text-amber-700' : 'text-ink-faint')}>{z.pluckingOverdue || '—'}</span>
            if (key === 'factory') return <span className="text-[12px] text-ink-muted">{z.factory.replace(' Tea Factory', '')}</span>
            return z[key]
          }}
        />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Panel title="Factory capacity" lede="Green-leaf intake today against what each factory can wither and process in a day (tick).">
          <ul className="space-y-4">
            {factories.map((f) => (
              <li key={f.id}>
                <BulletBar label={f.name} value={f.intake} target={f.capacityT} max={Math.max(f.capacityT, f.intake) * 1.1} display={`${f.intake} / ${f.capacityT} t`} targetLabel={`Capacity ${f.capacityT} t`} behind={f.intake > f.capacityT} />
                <p className="mt-1 text-[11px] text-ink-muted">
                  {f.zones.map(zoneName).join(' + ')} · {f.note}
                  {f.divertedIn > 0 && <span className="text-emerald-700"> · receiving {f.divertedIn} t/day diverted</span>}
                  {f.divertedOut > 0 && <span className="text-emerald-700"> · {f.divertedOut} t/day diverted out</span>}
                </p>
                {f.intake > f.capacityT && <DivertForm from={f} targets={factories.filter((x) => x.id !== f.id && x.capacityT - x.intake > 0.1)} />}
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-5">
          <Panel title="Fleet sharing" lede="A zone with a spare lorry can cover one with lorries off the road. Leaf that sits past 5 hours gets graded down at the factory.">
            <ul className="divide-y divide-line">
              {NATIONAL.spareLorries.map((l) => (
                <LendLorry key={l.id} lorry={l} zones={k.zones} loans={s.national.lorryLoans} />
              ))}
            </ul>
          </Panel>

          <Panel title="Offtake">
            <ul className="space-y-2 text-[12.5px] text-ink">
              {NATIONAL.partners
                .filter((p) => p.kind === 'Offtaker')
                .map((p) => (
                  <li key={p.id}>
                    <b>{p.partner}</b>
                    <span className="block text-[11.5px] text-ink-muted">
                      {p.obligation} · {p.due}
                    </span>
                  </li>
                ))}
            </ul>
            <Link to="/app/operations/partnerships" className="mt-3 inline-block font-mono text-[11px] uppercase tracking-[0.12em] text-emerald-700 hover:text-emerald-800">
              All partnerships →
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  )
}
