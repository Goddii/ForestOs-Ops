import { ROLES, modulePath } from '../../../../lib/dashboard/roles'

const ROLE = ROLES.find((role) => role.id === 'conservation')

/**
 * Absolute path for a module of the Conservation Officer console, with an
 * optional query string: `conPath('incidents?incident=INC-2026-0187')`.
 * Selectors return module-relative links; screens turn them into paths here.
 */
export function conPath(to) {
  return modulePath(ROLE, to)
}
