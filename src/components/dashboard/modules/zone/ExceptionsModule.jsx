import { AlertCard, ModuleHeader, Panel } from '../../DashboardKit'
import { ZONE } from '../../../../lib/dashboard/zoneManager'

// The nav promises "Exceptions" as its own screen — Z1's "Needs you today"
// panel plus the block- and buffer-level flags that feed it, gathered in one
// triage list instead of scattered across Overview / Blocks / Buffer map.
export default function ExceptionsModule() {
  const flaggedBlocks = ZONE.blocks.filter((b) => b.status !== 'clear')
  const flaggedPlots = ZONE.buffer.agreement.filter((row) => row.tagTone !== 'positive')

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Exceptions"
        sub={`${ZONE.code} · everything open across blocks, buffer and sign-off`}
        prototype
      />

      <Panel title="Needs your attention now">
        <div className="space-y-2.5">
          {ZONE.exceptions.map((item) => (
            <AlertCard
              key={item.id}
              title={item.title}
              detail={item.detail}
              tag={item.tag}
              tagTone={item.tone === 'default' ? undefined : item.tone}
              tone={item.tone}
            />
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Blocks off target" lede="Anything not reading Clear on Block performance.">
          <div className="space-y-2.5">
            {flaggedBlocks.map((b) => (
              <AlertCard
                key={b.id}
                tone={b.status === 'flagged' ? 'warn' : 'critical'}
                title={`${b.name} · ${b.id}`}
                detail={`${b.supervisor} · claims verified ${b.claimsVerifiedPct}% · ticket↔lot ${b.ticketLotPct}%`}
                tag={b.status === 'flagged' ? 'Flagged' : 'Below'}
              />
            ))}
            {flaggedBlocks.length === 0 && (
              <p className="text-[13px] text-ink-muted">Every block is on target.</p>
            )}
          </div>
        </Panel>

        <Panel title="Buffer plots to watch" lede="Ground and satellite disagree, or agree on a loss.">
          <div className="space-y-2.5">
            {flaggedPlots.map((row) => (
              <AlertCard
                key={row.plot}
                tone={row.tagTone}
                title={`${row.plot} · ${row.label}`}
                detail={`Satellite: ${row.satellite} · Ground: ${row.ground}`}
                tag={row.tag}
                tagTone={row.tagTone}
              />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
