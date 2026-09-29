// Who a maintenance task is for. Always a role title from the reference data
// (`Zone Manager, Kericho`), never a person, so the assignee is picked from a
// short list rather than typed.

export const ASSIGNEE_KEYS = ['zone_manager', 'block_supervisor', 'survey_officer']

/** The role title for an assignee key in a zone. */
export function assigneeTitle(ref, key, zoneId) {
  const zone = ref.zones.find((z) => z.zoneId === zoneId)
  if (key === 'survey_officer') return ref.roles.surveyOfficer
  const title = key === 'block_supervisor' ? ref.roles.blockSupervisor : ref.roles.zoneManager
  return zone ? `${title}, ${zone.name}` : title
}

/** The assignee suggested for each task type. */
export const DEFAULT_ASSIGNEE = {
  fence_repair: 'block_supervisor',
  beacon_replacement: 'zone_manager',
  signage: 'block_supervisor',
  firebreak_clearing: 'zone_manager',
  invasive_clearing: 'zone_manager',
  replanting: 'block_supervisor',
  planting: 'block_supervisor',
  field_check: 'zone_manager',
  count_request: 'block_supervisor',
  boundary_survey_request: 'survey_officer',
}

/** The task suggested after each kind of incident. */
export const SUGGESTED_TASK = {
  fire: 'firebreak_clearing',
  illegal_logging: 'field_check',
  charcoal: 'field_check',
  illegal_grazing: 'fence_repair',
  encroachment: 'boundary_survey_request',
  beacon_or_fence_damage: 'fence_repair',
  other: 'field_check',
}
