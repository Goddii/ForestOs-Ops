import { Check, X } from 'lucide-react'
import { AlertCard, ModuleHeader } from '../../DashboardKit'
import { ADMIN } from '../../../../lib/dashboard/systemAdmin'

function ExportCard({ pack }) {
  const gold = pack.accent === 'gold'
  return (
    <div className="flex h-full flex-col rounded-xl border border-emerald-900/10 bg-card p-5 shadow-card">
      <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-ink-faint">{pack.eyebrow}</p>
      <h3 className="mt-1.5 font-display text-[19px] text-ink">{pack.title}</h3>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">{pack.desc}</p>
      <ul className="mt-3 space-y-1.5 text-[11px] text-ink-muted">
        {pack.items.map((item) => (
          <li key={item.label} className="flex items-start gap-1.5">
            {item.ok ? (
              <Check className="mt-[1px] h-3.5 w-3.5 shrink-0 text-emerald-700" strokeWidth={2.5} aria-hidden="true" />
            ) : (
              <X className="mt-[1px] h-3.5 w-3.5 shrink-0 text-amber-700" strokeWidth={2.5} aria-hidden="true" />
            )}
            <span className={item.ok ? '' : 'text-amber-700'}>{item.label}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={
          'mt-4 rounded-[10px] py-3 text-[13px] font-semibold transition-colors ' +
          (gold
            ? 'bg-amber-400 text-forest-950 hover:bg-amber-500'
            : 'bg-emerald-700 text-white hover:bg-emerald-800')
        }
      >
        {pack.cta}
      </button>
    </div>
  )
}

export default function ExportsModule() {
  return (
    <div className="space-y-5">
      <ModuleHeader title="Verified claims export" sub="Where field records become something someone pays for" prototype />

      <div className="grid gap-4 md:grid-cols-3">
        {ADMIN.exports.map((pack) => (
          <ExportCard key={pack.id} pack={pack} />
        ))}
      </div>

      <AlertCard
        tone="critical"
        title="The rule that governs this boundary."
        detail="Nothing leaves as a “verified” claim unless it carries a zone sign-off covering its period, and every record beneath it resolves to an identity, a location, a time and an independent corroboration. Open exceptions travel with the pack — they are never quietly dropped, because a pack that hides its exceptions is worth nothing the first time an auditor finds one."
      />
    </div>
  )
}
