import { ModuleHeader, Panel, StatTile, StatusPill } from '../../DashboardKit'
import SectorFocusView from '../../sector/SectorFocusView'
import { ZONE } from '../../../../lib/dashboard/zoneManager'

export default function BufferMapModule() {
  const { buffer } = ZONE
  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Buffer integrity"
        sub={`Sentinel-2 · last pass ${buffer.lastPass} · ${buffer.cloudPct}% cloud · baseline ${buffer.baseline}`}
        prototype
      />

      <SectorFocusView variant="ndvi" />

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="grid grid-cols-2 gap-3 self-start">
          <StatTile label="NDVI now" value={buffer.ndviNow} note={`+${buffer.ndviDeltaVsBaseline} vs baseline`} />
          <StatTile label="Plots" value={buffer.plotCount} tone="warn" note={`${buffer.plotsFlagged} flagged`} />
        </div>

        <Panel title="Where ground and satellite agree">
          <ul className="divide-y divide-line">
            {buffer.agreement.map((row) => (
              <li key={row.plot} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-ink">
                    {row.plot} · {row.label}
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    Satellite: {row.satellite} · Ground: {row.ground}
                  </p>
                </div>
                <StatusPill status={row.tag} tone={row.tagTone} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="rounded-xl border border-[#c3dcda] bg-[#dfeceb] p-4">
        <p className="text-[11.5px] leading-relaxed text-[#3d6b67]">
          <b>Agreement is the evidence.</b> A ground claim the satellite contradicts, or a satellite
          signal nobody on the ground has seen, is the interesting case — not the one where both are
          quiet.
        </p>
      </div>
    </div>
  )
}
