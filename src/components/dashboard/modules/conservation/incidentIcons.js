import { Axe, Beef, CircleAlert, Construction, Flame, FlameKindling, Footprints } from 'lucide-react'

/** One icon per incident type. Text always accompanies the icon. */
export const INCIDENT_ICON = {
  fire: Flame,
  illegal_logging: Axe,
  charcoal: FlameKindling,
  illegal_grazing: Beef,
  encroachment: Footprints,
  beacon_or_fence_damage: Construction,
  other: CircleAlert,
}
