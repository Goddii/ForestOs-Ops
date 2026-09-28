import { useState } from 'react'
import { Clock, Scale, Sprout, Truck } from 'lucide-react'
import { BulletBar, DataTable, ModuleHeader, Panel, StatTile, StatusPill } from '../../DashboardKit'
import { OPERATIONS, centreName } from '../../../../lib/dashboard/operationsManager'
import { bookAsset, coverBreakdown, dispatchToCentre, opsKpis, useOperations } from '../../../../lib/dashboard/operationsStore'
import { DoneNote, PrimaryButton, SecondaryButton, SelectField } from './controls'

const LORRY_TONE = { 'At factory': 'positive', 'En route': 'positive', Scheduled: 'neutral', Standby: 'neutral', Breakdown: 'critical', Recovery: 'warn' }

function LeafAge({ hrs }) {
  const { warnHrs, limitHrs } = OPERATIONS.leafAge
  if (!hrs) return <span className="font-mono text-[11px] text-ink-faint">no leaf on board</span>
  return (
    <BulletBar
      label="Oldest leaf"
      value={hrs}
      target={limitHrs}
      max={6}
      display={`${hrs} h`}
      targetLabel={`${limitHrs} hour limit`}
      behind={hrs >= warnHrs - 1}
    />
  )
}

function BreakdownPanel({ broken, standbys }) {
  const [picked, setPicked] = useState('')
  const standby = standbys.some((l) => l.id === picked) ? picked : (standbys[0]?.id ?? '')
  return (
    <Panel
      title={`${broken.id} broken down`}
      lede={`${broken.note}. ${broken.loadKg} kg on board, oldest leaf ${broken.leafAgeHrs} h — ${(OPERATIONS.leafAge.limitHrs - broken.leafAgeHrs).toFixed(1)} h before it's past the factory's limit.`}
      className="border-critical/25"
    >
      {standbys.length ? (
        <div className="flex flex-wrap items-end gap-3">
          <SelectField
            id={`cover-${broken.id}`}
            label="Send a standby lorry to take the load and finish the run"
            value={standby}
            onChange={setPicked}
            options={standbys.map((l) => ({ value: l.id, label: `${l.id} · ${l.driver} · ${l.capacityKg.toLocaleString()} kg · ${l.note ?? l.status}` }))}
            className="min-w-[18rem] flex-1"
          />
          <PrimaryButton onClick={() => coverBreakdown(standby, broken.id)} disabled={!standby}>
            <Truck className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
            Send to cover
          </PrimaryButton>
        </div>
      ) : (
        <p className="text-[12.5px] text-ink-muted">No standby lorry free. Hire in or reroute a lorry once it has unloaded.</p>
      )}
    </Panel>
  )
}

const CENTRE_COLUMNS = [
  { key: 'name', label: 'Centre' },
  { key: 'collected', label: 'Collected vs plan', sortAccessor: (r) => r.collectedKg / r.planKg },
  { key: 'awaitingKg', label: 'Awaiting pickup', align: 'right' },
  { key: 'oldestLeafHrs', label: 'Oldest leaf', align: 'right' },
  { key: 'lastPickup', label: 'Last pickup', mono: true },
  { key: 'action', label: '' },
]

function DispatchCell({ centre, available }) {
  const [picked, setPicked] = useState('')
  const lorry = available.some((l) => l.id === picked) ? picked : (available[0]?.id ?? '')
  if (centre.assignedLorry) return <StatusPill status={`${centre.assignedLorry} assigned`} tone="positive" />
  if (!centre.awaitingKg) return null
  if (!available.length) return <span className="text-[11px] text-amber-700">no lorry free</span>
  return (
    <div className="flex items-center gap-2">
      <SelectField
        id={`dispatch-${centre.id}`}
        label={`Lorry to send to ${centre.name}`}
        hideLabel
        value={lorry}
        onChange={setPicked}
        options={available.map((l) => ({ value: l.id, label: l.id }))}
        className="w-28"
      />
      <PrimaryButton onClick={() => dispatchToCentre(lorry, centre.id)}>Dispatch</PrimaryButton>
    </div>
  )
}

export default function LeafLogisticsModule() {
  const s = useOperations()
  const kpis = opsKpis(s)
  const standbys = s.lorries.filter((l) => l.status === 'Standby')
  const broken = s.lorries.filter((l) => l.status === 'Breakdown')
  const inTransitKg = s.lorries.filter((l) => l.status === 'En route').reduce((sum, l) => sum + l.loadKg, 0)
  const awaitingKg = s.centres.reduce((sum, c) => sum + (c.assignedLorry ? 0 : c.awaitingKg), 0)

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Leaf Logistics"
        sub={`${OPERATIONS.today} · collection centres → ${OPERATIONS.factory} · leaf limit ${OPERATIONS.leafAge.limitHrs} h`}
        prototype
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Collected at centres" value={kpis.collectedKg.toLocaleString()} unit={`kg of ${kpis.planKg.toLocaleString()} plan`} share={kpis.collectedKg / kpis.planKg} icon={Sprout} />
        <StatTile label="On lorries en route" value={inTransitKg.toLocaleString()} unit="kg" icon={Truck} />
        <StatTile
          label="Waiting, no lorry"
          value={awaitingKg.toLocaleString()}
          unit="kg at centres"
          tone={awaitingKg ? 'warn' : 'default'}
          icon={Scale}
        />
        <StatTile
          label="Fleet moving"
          value={`${kpis.lorriesMoving} / ${kpis.lorriesTotal}`}
          tone={broken.length ? 'critical' : 'default'}
          note={broken.length ? `${broken.length} broken down` : `${standbys.length} on standby`}
          icon={Clock}
        />
      </div>

      {broken.map((lorry) => (
        <BreakdownPanel key={lorry.id} broken={lorry} standbys={standbys} />
      ))}

      <Panel title="Fleet" lede="Every leaf lorry in the zone. The bar is the oldest leaf on board against the factory's limit (tick).">
        <ul className="grid gap-3 md:grid-cols-2">
          {s.lorries.map((l) => (
            <li key={l.id} className="rounded-lg border border-line bg-paper/60 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[13px] font-semibold text-ink">{l.id}</p>
                  <p className="text-[11px] text-ink-muted">
                    {l.driver} · {l.route.length ? l.route.map(centreName).join(' → ') : 'no run assigned'}
                  </p>
                </div>
                <StatusPill status={l.status} tone={LORRY_TONE[l.status]} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-[11.5px]">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">Load</p>
                  <p className="font-mono tabular-nums text-ink">
                    {l.loadKg.toLocaleString()} / {l.capacityKg.toLocaleString()} kg
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">ETA</p>
                  <p className="font-mono text-ink">{l.eta}</p>
                </div>
              </div>
              <div className="mt-3">
                <LeafAge hrs={l.leafAgeHrs} />
              </div>
              {l.note && <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">{l.note}</p>}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="Fleet & weighbridge upkeep"
        lede="What keeps the lorries legal and the scales honest. Kilos weighed on a scale without a current Weights & Measures certificate are weak evidence for pay and for the export chain."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <ul className="divide-y divide-line">
            {s.assets.fleet.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-mono text-[12.5px] font-semibold text-ink">{a.id}</p>
                  <p className="text-[11px] text-ink-muted">
                    Service <span className={a.serviceOk ? '' : 'text-amber-700'}>{a.serviceDue}</span> · inspection{' '}
                    <span className={a.inspectionOk ? '' : 'text-amber-700'}>{a.inspection}</span> · {a.fuelL100km} L/100 km
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {!a.serviceOk && a.serviceDue !== 'gearbox repair' && (a.booked?.service ? <DoneNote>{a.booked.service}</DoneNote> : <SecondaryButton onClick={() => bookAsset('service', a.id)}>Book service</SecondaryButton>)}
                  {!a.inspectionOk && (a.booked?.inspection ? <DoneNote>{a.booked.inspection}</DoneNote> : <SecondaryButton onClick={() => bookAsset('inspection', a.id)}>Book inspection</SecondaryButton>)}
                </div>
              </li>
            ))}
          </ul>
          <ul className="divide-y divide-line">
            {s.assets.scales.map((sc) => (
              <li key={sc.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-ink">{sc.centre} weighbridge</p>
                  <p className={'text-[11px] ' + (sc.ok ? 'text-ink-muted' : 'text-amber-700')}>Certificate · {sc.certificate}</p>
                </div>
                {!sc.ok && (sc.booked?.calibration ? <DoneNote>Re-verification {sc.booked.calibration.toLowerCase()}</DoneNote> : <PrimaryButton onClick={() => bookAsset('calibration', sc.id)}>Book re-verification</PrimaryButton>)}
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <Panel title="Collection centres" lede="Weighed in today at each block's centre. Dispatch an available lorry to any centre with leaf left waiting.">
        <DataTable
          columns={CENTRE_COLUMNS}
          rows={s.centres}
          sortable
          csvName="ForestOS-ops-collection-centres"
          renderCell={(key, c) => {
            if (key === 'name') return <span className="font-semibold">{c.name}</span>
            if (key === 'collected')
              return (
                <div className="min-w-[10rem]">
                  <BulletBar
                    label=""
                    value={c.collectedKg}
                    target={c.planKg}
                    max={Math.max(c.planKg, c.collectedKg) * 1.1}
                    display={`${c.collectedKg.toLocaleString()} / ${c.planKg.toLocaleString()} kg`}
                    targetLabel={`Plan ${c.planKg} kg`}
                    behind={c.collectedKg < c.planKg * 0.8}
                  />
                </div>
              )
            if (key === 'awaitingKg')
              return <span className={'font-mono tabular-nums ' + (c.awaitingKg && !c.assignedLorry ? 'text-amber-700' : 'text-ink-muted')}>{c.awaitingKg ? `${c.awaitingKg} kg` : '—'}</span>
            if (key === 'oldestLeafHrs') return <span className="font-mono tabular-nums text-ink-muted">{c.oldestLeafHrs ? `${c.oldestLeafHrs} h` : '—'}</span>
            if (key === 'action') return <DispatchCell centre={c} available={standbys} />
            return c[key]
          }}
        />
      </Panel>
    </div>
  )
}
