import { DataTable, ModuleHeader, StatusPill } from '../../DashboardKit'
import { ADMIN } from '../../../../lib/dashboard/systemAdmin'

const COLUMNS = [
  { key: 'ref', label: 'Ref' },
  { key: 'when', label: 'When' },
  { key: 'who', label: 'Who' },
  { key: 'event', label: 'Event' },
  { key: 'record', label: 'Record' },
  { key: 'hash', label: 'Hash', align: 'right' },
]

export default function AuditLogModule() {
  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Audit log"
        sub="Append-only · hash-chained · nothing here can be edited or deleted"
        actions={<StatusPill status="Chain intact" />}
        prototype
      />

      <DataTable
        columns={COLUMNS}
        rows={ADMIN.auditLog}
        sortable
        csvName="ForestOS-audit-log"
        renderCell={(key, row) => {
          if (key === 'hash') return <span className="font-mono text-ink-muted">{row.hash}</span>
          if (key === 'event') {
            const color = row.tone === 'critical' ? 'text-critical' : row.tone === 'warn' ? 'text-amber-700' : undefined
            return <span className={color}>{row.event}</span>
          }
          return row[key]
        }}
      />

      <div className="rounded-xl border border-[#c3dcda] bg-[#dfeceb] p-4">
        <p className="text-[11.5px] leading-relaxed text-[#3d6b67]">
          <b>Corrections are entries, not edits.</b> A disputed ticket that is later corrected produces
          a new record referencing the original; the original stays. An auditor can therefore see not
          just the final number but every hand that touched it — which is the difference between a
          system that <i>says</i> it is tamper-proof and one that can show why.
        </p>
      </div>
    </div>
  )
}
