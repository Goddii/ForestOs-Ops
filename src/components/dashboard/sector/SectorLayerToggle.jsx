import { Layers, MapPin, Sprout } from 'lucide-react'

const LAYERS = [
  { key: 'audit', label: 'EUDR Audit Polygons', Icon: Layers },
  { key: 'ndvi', label: 'NDVI Vegetation Heatmap', Icon: Sprout },
  { key: 'pins', label: 'Collection Center Pins', Icon: MapPin },
]

/**
 * Map-layer toggles, pinned top-right over the (dark) Sector Focus viewport —
 * the one place in the light portal where dark-glass chrome is correct, because
 * it floats on the satellite scene.
 */
export default function SectorLayerToggle({ layers, onToggle }) {
  return (
    <div className="pointer-events-auto flex flex-col gap-1 rounded-lg border border-bone/15 bg-[#0c1710]/85 p-1.5 backdrop-blur-md">
      <p className="px-1.5 pb-0.5 pt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-bone/45">
        Layers
      </p>
      {LAYERS.map(({ key, label, Icon }) => {
        const on = layers[key]
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            aria-pressed={on}
            className={
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-left font-mono text-[11px] tracking-[0.02em] transition-colors ' +
              (on
                ? 'bg-emerald-600/30 text-bone'
                : 'text-bone/45 hover:bg-bone/5 hover:text-bone/75')
            }
          >
            <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span className="whitespace-nowrap">{label}</span>
            <span
              aria-hidden="true"
              className={
                'ml-auto h-1.5 w-1.5 shrink-0 rounded-full ' +
                (on ? 'bg-emerald-400' : 'bg-bone/20')
              }
            />
          </button>
        )
      })}
    </div>
  )
}
