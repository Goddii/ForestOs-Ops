import { useState } from 'react'
import { Flame, Footprints, Sprout, TreePine } from 'lucide-react'
import { DataTable, MiniSparkline, ModuleHeader, Panel, StatTile, StatusPill } from '../../DashboardKit'
import { NATIONAL } from '../../../../lib/dashboard/operationsNational'
import { moveSeedlings, nationalKpis, orderZoneFireWatch, useOperations, zoneName } from '../../../../lib/dashboard/operationsStore'
import { DoneNote, PrimaryButton, SelectField, inputClass } from './controls'

const SURVIVAL_TARGET = 80
const ndviFor = (id) => NATIONAL.ndvi[id] ?? []

const COLUMNS = [
  { key: 'name', label: 'Zone' },
  { key: 'fire', label: 'Fire readiness', sortAccessor: (z) => z.fire.firebreakPct },
  { key: 'patrols', label: 'Patrols · week', align: 'right', sortAccessor: (z) => z.patrols.done / z.patrols.target },
  { key: 'planting', label: 'Planting ready', align: 'right', sortAccessor: (z) => z.planting.allocatedPct },
  { key: 'survivalPct', label: 'Survival', align: 'right' },
  { key: 'beaconsMissing', label: 'Beacons missing', align: 'right' },
  { key: 'ndvi', label: 'Canopy (NDVI)', sortAccessor: (z) => ndviFor(z.id).at(-1) },
]

function SeedlingTransfer({ moves }) {
  const { surplus, deficit } = NATIONAL.seedlings
  const left = (zone) => surplus.find((x) => x.zone === zone).qty - moves.filter((m) => m.fromZone === zone).reduce((sum, m) => sum + m.qty, 0)
  const need = (zone) => deficit.find((x) => x.zone === zone).qty - moves.filter((m) => m.toZone === zone).reduce((sum, m) => sum + m.qty, 0)
  const [from, setFrom] = useState(surplus[0].zone)
  const [to, setTo] = useState(deficit[0].zone)
  const [qty, setQty] = useState('1000')
  const n = Number(qty)
  const error = !n || n < 1 ? 'Enter a quantity.' : n > left(from) ? `${zoneName(from)} has ${left(from).toLocaleString()} spare.` : n > need(to) ? `${zoneName(to)} is short ${need(to).toLocaleString()}.` : null
  return (
    <Panel title="Move seedlings between zones" lede="Nurseries with more hardened-off seedlings than their own short-rains target can fill zones that are short. It costs a lorry trip, not a season.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">Spare</p>
          {surplus.map((x) => (
            <p key={x.zone} className="text-[12.5px] text-ink">
              {zoneName(x.zone)} · <b className="font-mono">{left(x.zone).toLocaleString()}</b> <span className="text-ink-muted">{x.species}</span>
            </p>
          ))}
        </div>
        <div>
          <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">Short</p>
          {deficit.map((x) => (
            <p key={x.zone} className="text-[12.5px] text-ink">
              {zoneName(x.zone)} · <b className={'font-mono ' + (need(x.zone) > 0 ? 'text-amber-700' : 'text-emerald-700')}>{Math.max(0, need(x.zone)).toLocaleString()}</b>
            </p>
          ))}
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!error) moveSeedlings(from, to, n)
        }}
        className="mt-4 space-y-2 border-t border-line pt-4"
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_7rem_auto] sm:items-end">
          <SelectField id="seed-from" label="From" value={from} onChange={setFrom} options={surplus.map((x) => ({ value: x.zone, label: zoneName(x.zone) }))} />
          <SelectField id="seed-to" label="To" value={to} onChange={setTo} options={deficit.map((x) => ({ value: x.zone, label: zoneName(x.zone) }))} />
          <div>
            <label htmlFor="seed-qty" className="block text-[12px] font-medium text-ink-muted">
              Seedlings
            </label>
            <input id="seed-qty" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className={inputClass + ' text-right font-mono tabular-nums'} />
          </div>
          <PrimaryButton type="submit" disabled={Boolean(error)}>
            <Sprout className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
            Move
          </PrimaryButton>
        </div>
        {error && <p className="text-[11.5px] text-amber-700">{error}</p>}
      </form>
    </Panel>
  )
}

export default function ConservationOperationsModule() {
  const s = useOperations()
  const { zones } = nationalKpis(s)
  const high = zones.filter((z) => z.fire.danger === 'High')
  const patrols = zones.reduce((sum, z) => sum + z.patrols.done, 0)
  const patrolTarget = zones.reduce((sum, z) => sum + z.patrols.target, 0)
  const under = zones.filter((z) => z.survivalPct < SURVIVAL_TARGET)
  const beacons = zones.reduce((sum, z) => sum + z.beaconsMissing, 0)

  return (
    <div className="space-y-5">
      <ModuleHeader title="Conservation Operations" sub={`${NATIONAL.today} · the buffer's ground work in every zone — fire, patrols, planting, survival, boundaries`} prototype />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="High fire danger" value={high.length} unit={`zones · ${high.filter((z) => z.fire.watch).length} on fire watch`} tone={high.some((z) => !z.fire.watch) ? 'warn' : 'default'} icon={Flame} />
        <StatTile label="Edge patrols · week" value={`${patrols} / ${patrolTarget}`} unit="done or scheduled" share={patrols / patrolTarget} icon={Footprints} />
        <StatTile label="Tree survival under 80%" value={under.length} unit="zones" tone={under.length ? 'warn' : 'default'} note={under.map((z) => `${z.name} ${z.survivalPct}%`).join(', ') || undefined} icon={TreePine} />
        <StatTile label="Boundary beacons missing" value={beacons} unit="across zones" tone={beacons ? 'warn' : 'default'} icon={Sprout} />
      </div>

      <Panel title="Zones" lede="The satellite column is the outcome; everything left of it is the work that produces it.">
        <DataTable
          columns={COLUMNS}
          rows={zones}
          sortable
          csvName="ForestOS-national-conservation-operations"
          renderCell={(key, z) => {
            if (key === 'name') return <span className="font-semibold">{z.name}</span>
            if (key === 'fire')
              return (
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={z.fire.danger} tone={z.fire.danger === 'High' ? 'warn' : 'neutral'} />
                  <span className={'font-mono text-[11.5px] tabular-nums ' + (z.fire.firebreakPct < 75 ? 'text-amber-700' : 'text-ink-muted')}>{z.fire.firebreakPct}% breaks</span>
                  {z.fire.watch ? (
                    <span className="text-[11px] text-emerald-700">watch on</span>
                  ) : z.fire.danger === 'High' ? (
                    <PrimaryButton onClick={() => orderZoneFireWatch(z.id)}>Order fire watch</PrimaryButton>
                  ) : null}
                </div>
              )
            if (key === 'patrols') return <span className={'font-mono tabular-nums ' + (z.patrols.done < z.patrols.target * 0.75 ? 'text-amber-700' : '')}>{z.patrols.done} / {z.patrols.target}</span>
            if (key === 'planting') return <span className={'font-mono tabular-nums ' + (z.planting.allocatedPct < 50 ? 'text-amber-700' : '')}>{z.planting.allocatedPct}%</span>
            if (key === 'survivalPct') return <span className={'font-mono tabular-nums ' + (z.survivalPct < SURVIVAL_TARGET ? 'text-amber-700' : '')}>{z.survivalPct}%</span>
            if (key === 'beaconsMissing') return <span className={'font-mono tabular-nums ' + (z.beaconsMissing ? 'text-amber-700' : 'text-ink-faint')}>{z.beaconsMissing || '—'}</span>
            if (key === 'ndvi')
              return (
                <span className="flex items-center gap-2">
                  <MiniSparkline values={ndviFor(z.id)} tone="emerald" />
                  <span className="font-mono text-[11.5px] tabular-nums">{ndviFor(z.id).at(-1)}</span>
                </span>
              )
            return null
          }}
        />
        <p className="mt-3 text-[11px] text-ink-muted">
          NDVI is the zone-mean Sentinel-2 quarterly composite, {NATIONAL.ndviQuarters[0]}–{NATIONAL.ndviQuarters.at(-1)}. The same scene Zone Manager&rsquo;s Buffer Map reads for South West Mau.
        </p>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <SeedlingTransfer moves={s.national.seedlingMoves} />
        <Panel title="Why survival, not planting" className="border-emerald-900/10">
          <p className="text-[12.5px] leading-relaxed text-ink">
            The ESG partner&rsquo;s second tranche depends on survival-adjusted tree counts, not trees planted. Carbon and
            reforestation projects have been caught counting the second number. Every zone under {SURVIVAL_TARGET}% replants
            its gaps in the short rains, and the Q3 evidence pack reports what survived.
          </p>
          {s.national.seedlingMoves.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-line pt-3">
              {s.national.seedlingMoves.map((m, i) => (
                <li key={i}>
                  <DoneNote>
                    {m.qty.toLocaleString()} seedlings · {zoneName(m.fromZone)} → {zoneName(m.toZone)}
                  </DoneNote>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
