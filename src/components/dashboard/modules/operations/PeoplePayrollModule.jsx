import { Link } from 'react-router-dom'
import { Banknote, Clock, MessageSquareWarning, Users } from 'lucide-react'
import { BulletBar, DataTable, ModuleHeader, Panel, StatTile, StatusPill } from '../../DashboardKit'
import { NATIONAL } from '../../../../lib/dashboard/operationsNational'
import { chaseZone, floatPosition, nationalKpis, requestFloatTopUp, useOperations } from '../../../../lib/dashboard/operationsStore'
import { DoneNote, PrimaryButton, SecondaryButton } from './controls'

const SETTLE_TARGET_DAYS = 7
const kesM = (n) => `KES ${(n / 1e6).toFixed(2)}M`

const COLUMNS = [
  { key: 'name', label: 'Zone' },
  { key: 'turnout', label: 'Mustered', align: 'right', sortAccessor: (z) => z.present / z.rostered },
  { key: 'payroll', label: 'Week 36 payroll' },
  { key: 'settleDays', label: 'Last settled in', align: 'right', sortAccessor: (z) => z.payroll.settleDays },
  { key: 'people', label: 'Disputes · grievances · injuries', sortAccessor: (z) => z.disputes + z.grievances * 2 + z.injuriesMtd * 3 },
  { key: 'action', label: '' },
]

export default function PeoplePayrollModule() {
  const s = useOperations()
  const k = nationalKpis(s)
  const float = floatPosition(s)
  const chased = s.national.chased
  const topUp = Math.ceil((float.shortKes * 1.1) / 100000) * 100000
  const grievances = k.zones.reduce((sum, z) => sum + z.grievances, 0)
  const slow = k.zones.filter((z) => z.payroll.settleDays > SETTLE_TARGET_DAYS)

  return (
    <div className="space-y-5">
      <ModuleHeader title="People & Payroll" sub={`${NATIONAL.today} · ${k.rostered.toLocaleString()} buffer workers across ${k.zones.length} zones · paid weekly on M-Pesa`} prototype />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Mustered today" value={`${Math.round((k.present / k.rostered) * 100)}%`} unit={`${k.present.toLocaleString()} of ${k.rostered.toLocaleString()}`} share={k.present / k.rostered} icon={Users} />
        <StatTile label="Payroll released" value={`${k.payrollReleased} / ${k.zones.length}`} unit="zones" tone={k.payrollReleased < k.zones.length ? 'warn' : 'positive'} share={k.payrollReleased / k.zones.length} icon={Banknote} />
        <StatTile label={`Settled in > ${SETTLE_TARGET_DAYS} days`} value={slow.length} unit="zones last week" tone={slow.length ? 'warn' : 'default'} note={slow.map((z) => `${z.name} ${z.payroll.settleDays}d`).join(', ') || undefined} icon={Clock} />
        <StatTile label="Open grievances" value={grievances} unit="via the USSD grievance line" tone={grievances ? 'warn' : 'default'} icon={MessageSquareWarning} />
      </div>

      <Panel
        title="M-Pesa float for Tuesday"
        lede="Every zone's unreleased payroll draws on one B2C float. If it runs dry mid-batch, some workers are paid and their neighbours aren't."
        className={float.shortKes ? 'border-critical/25' : ''}
        actions={
          float.shortKes ? (
            <PrimaryButton onClick={() => requestFloatTopUp(topUp)}>Ask Finance for {kesM(topUp)}</PrimaryButton>
          ) : s.national.floatRequested ? (
            <DoneNote>
              Top-up of {kesM(s.national.floatRequested.amountKes)} requested {s.national.floatRequested.at}
            </DoneNote>
          ) : (
            <StatusPill status="Covered" tone="positive" />
          )
        }
      >
        <BulletBar label="Float held vs payroll still to release" value={float.floatKes} target={float.neededKes} max={Math.max(float.floatKes, float.neededKes) * 1.1} display={`${kesM(float.floatKes)} held · ${kesM(float.neededKes)} needed`} targetLabel="Needed" behind={float.shortKes > 0} />
        {float.shortKes > 0 && <p className="mt-2 text-[12px] text-critical">Short by {kesM(float.shortKes)}. The request adds a 10% buffer.</p>}
      </Panel>

      <Panel title="Zones" lede={`Pay that lands late is the fastest way to lose a workforce. Turnout, grievances and late settlement move together. The target is under ${SETTLE_TARGET_DAYS} days.`}>
        <DataTable
          columns={COLUMNS}
          rows={k.zones}
          sortable
          csvName="ForestOS-national-people-payroll"
          renderCell={(key, z) => {
            if (key === 'name') return <span className="font-semibold">{z.name}</span>
            if (key === 'turnout') {
              const pct = Math.round((z.present / z.rostered) * 100)
              return (
                <span className={'font-mono tabular-nums ' + (pct < 80 ? 'text-amber-700' : '')}>
                  {pct}%<span className="block text-[10.5px] text-ink-faint">{z.devicesOffline ? `${z.devicesOffline} device offline` : 'all synced'}</span>
                </span>
              )
            }
            if (key === 'payroll')
              return (
                <span>
                  <StatusPill status={z.payroll.status} tone={z.payroll.status === 'Released' ? 'positive' : 'warn'} />
                  <span className="mt-0.5 block font-mono text-[10.5px] text-ink-faint">
                    {kesM(z.payroll.grossKes)} · {z.payroll.workers} workers
                  </span>
                </span>
              )
            if (key === 'settleDays') return <span className={'font-mono tabular-nums ' + (z.payroll.settleDays > SETTLE_TARGET_DAYS ? 'text-amber-700' : '')}>{z.payroll.settleDays} days</span>
            if (key === 'people')
              return (
                <span className="font-mono text-[12px] tabular-nums text-ink-muted">
                  <span className={z.disputes ? 'text-ink' : ''}>{z.disputes}</span> · <span className={z.grievances ? 'text-amber-700' : ''}>{z.grievances}</span> · <span className={z.injuriesMtd ? 'text-amber-700' : ''}>{z.injuriesMtd}</span>
                </span>
              )
            if (key === 'action') {
              const buttons = []
              if (z.desk && z.payroll.status !== 'Released')
                buttons.push(
                  <Link key="desk" to="/app/operations/desk/payroll" className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-emerald-700 hover:text-emerald-800">
                    Open run →
                  </Link>,
                )
              else if (z.payroll.status !== 'Released')
                buttons.push(chased[`${z.id}:payroll`] ? <DoneNote key="p">Chased {chased[`${z.id}:payroll`]}</DoneNote> : <SecondaryButton key="p" onClick={() => chaseZone(z.id, 'payroll')}>Chase payroll</SecondaryButton>)
              if (z.grievances)
                buttons.push(chased[`${z.id}:grievance`] ? <DoneNote key="g">Chased {chased[`${z.id}:grievance`]}</DoneNote> : <SecondaryButton key="g" onClick={() => chaseZone(z.id, 'grievance')}>Chase grievances</SecondaryButton>)
              return <div className="flex flex-col items-end gap-1.5">{buttons}</div>
            }
            return null
          }}
        />
        <p className="mt-3 text-[11px] text-ink-muted">Columns: open pay disputes · open grievances · work injuries this month.</p>
      </Panel>
    </div>
  )
}
