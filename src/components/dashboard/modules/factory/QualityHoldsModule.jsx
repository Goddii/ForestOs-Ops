import { AlertCard, ModuleHeader, Panel } from '../../DashboardKit'
import { FACTORY } from '../../../../lib/dashboard/factoryManager'

// Post-processing quality holds — distinct from Block Operations' "Quality &
// Rejections" (which triages green-leaf claims at the collection stage):
// this is made tea already through the line, held back from dispatch until
// a re-test or a buyer's own QA sign-off clears it.
export default function QualityHoldsModule() {
  const { qualityHolds, month } = FACTORY
  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Quality Holds"
        sub={`${month} · made tea held back from dispatch pending re-test or sign-off`}
        prototype
      />

      <Panel title="Open holds" lede="Nothing here ships until it's cleared.">
        <div className="space-y-2.5">
          {qualityHolds.map((hold) => (
            <AlertCard
              key={hold.id}
              tone={hold.tone}
              title={`${hold.lotId} · ${hold.kg.toLocaleString()} kg`}
              detail={hold.reason}
              tag={hold.status}
              tagTone={hold.tone === 'default' ? 'neutral' : hold.tone}
            />
          ))}
          {qualityHolds.length === 0 && (
            <p className="text-[13px] text-ink-muted">No open quality holds — everything on hand is clear to dispatch.</p>
          )}
        </div>
      </Panel>
    </div>
  )
}
