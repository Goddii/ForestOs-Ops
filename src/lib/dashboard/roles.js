// Role-based views for the operations console. forestos-ops is scoped to
// Nyayo Tea Zone Development Cooperation (NTZDC) employees only — Zone
// Manager, Factory Manager, Operations Manager (national head of operations)
// and System Admin. Brand, Buyer, Creator and ESG
// Capital accounts were removed from here: those external partners connect
// through the customer experience platform (`forestos-qr-landing`), not this
// internal console. Block Operations and National Management were removed
// later; see DESIGN.md.
//
// Access is role-based from the sign-in step (`lib/session.js`,
// `routes/SignIn.jsx`) — there is no in-app switcher; changing role means
// signing out and signing in as a different account. Once inside, the active
// role for display purposes still follows the URL (`roleFromPath`), since
// `/app/overview` deliberately deep-links into other roles' screens as one
// cross-role tour — the sidebar needs to track whatever is actually on
// screen. Each role carries its own identity, nav module list, and (in its
// own data file) mock data. Illustrative only.

export const ROLES = [
  {
    id: 'zone',
    label: 'Zone Manager View',
    base: '/app/zone',
    scopeLabel: 'Managed zone',
    org: {
      name: 'NTZDC — South West Mau Zone Office',
      role: 'Zone Manager',
      scope: 'South West Mau (6 blocks)',
      code: 'NTZDC-Z-SWM',
      since: '2019',
    },
    person: { name: 'David Kemei', id: 'ZM-SWMAU-01', email: 'david.kemei@ntzdc.go.ke' },
    modules: [
      { to: '', label: 'Zone Overview', end: true },
      { to: 'blocks', label: 'Block Performance' },
      { to: 'buffer', label: 'Buffer Map' },
      { to: 'exceptions', label: 'Exceptions' },
      { to: 'pay', label: 'Pay & Parity' },
      { to: 'signoff', label: 'Zone Sign-off' },
    ],
  },
  {
    id: 'factory',
    label: 'Factory Manager View',
    base: '/app/factory',
    scopeLabel: 'Managed factory',
    org: {
      name: 'NTZDC — Gatitu Tea Factory',
      role: 'Factory Manager',
      scope: 'Gatitu Tea Factory · processing',
      code: 'NTZDC-F-GTU',
      since: '2021',
    },
    person: { name: 'L. Wanjiku', id: 'FM-GTU-01', email: 'l.wanjiku@ntzdc.go.ke' },
    modules: [
      { to: '', label: 'Factory Overview', end: true },
      { to: 'intake', label: 'Intake & Weighbridge' },
      { to: 'processing', label: 'Processing & Grading' },
      { to: 'energy', label: 'Power & Energy' },
      { to: 'ledger', label: 'Energy Ledger' },
      { to: 'quality', label: 'Quality Holds' },
      { to: 'dispatch', label: 'Dispatch & Stock' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations Manager View',
    base: '/app/operations',
    scopeLabel: 'Coverage',
    org: {
      name: 'NTZDC — Head Office',
      role: 'Operations Manager',
      scope: 'All zones · tea, conservation, partnerships, people',
      code: 'NTZDC-OPS',
      since: '2016',
    },
    person: { name: 'Peter Langat', id: 'OPS-HQ-01', email: 'peter.langat@ntzdc.go.ke' },
    modules: [
      { to: '', label: 'Operations Overview', end: true },
      { to: 'tea', label: 'Tea Operations' },
      { to: 'conservation', label: 'Conservation Operations' },
      { to: 'partnerships', label: 'Partnerships' },
      { to: 'people', label: 'People & Payroll' },
      { to: 'incidents', label: 'Incidents & Escalations' },
      { to: 'approvals', label: 'Approvals & Budget' },
      { to: 'desk', label: 'Zone Desk' },
    ],
  },
  {
    id: 'admin',
    label: 'System Admin View',
    base: '/app/admin',
    scopeLabel: 'Platform',
    org: {
      name: 'ForestOS Platform',
      role: 'System Admin',
      scope: 'All zones · all integrations',
      code: 'FORESTOS-SYS',
      since: '2019',
    },
    person: { name: 'Njoki Wanjiru', id: 'ADM-01', email: 'njoki.wanjiru@forestos.io' },
    modules: [
      { to: '', label: 'Console Home', end: true },
      { to: 'registry', label: 'Registry' },
      { to: 'people', label: 'People & Roles' },
      { to: 'audit', label: 'Audit Log' },
      { to: 'integrations', label: 'Integrations' },
      { to: 'exports', label: 'Verified Claims Export' },
    ],
  },
]

export const DEFAULT_ROLE = ROLES[0]

/**
 * Resolve the active role from a pathname (URL is the source of truth) —
 * the most specific role `base` that prefixes the path, falling back to
 * `DEFAULT_ROLE` for a path no role owns (the shared `/app/overview` tour).
 */
export function roleFromPath(pathname) {
  const match = ROLES.find((role) => pathname === role.base || pathname.startsWith(role.base + '/'))
  return match ?? DEFAULT_ROLE
}

/** Full path for a module `to` within a role. */
export function modulePath(role, to) {
  return to ? `${role.base}/${to}` : role.base
}

/**
 * Resolve a role by its seeded demo login email (case-insensitive). There is
 * no real backend to check a password against — any password is accepted —
 * this just lets the enterprise-style login form resolve to a specific
 * account instead of a click-to-pick card grid. See `routes/SignIn.jsx`.
 */
export function roleByEmail(email) {
  const q = String(email ?? '').trim().toLowerCase()
  return ROLES.find((role) => role.person?.email?.toLowerCase() === q) ?? null
}
