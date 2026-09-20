// Role-based views for the operations console. forestos-ops is scoped to
// Nyayo Tea Zone Development Cooperation (NTZDC) employees only — Block
// Operations, Zone Manager, Factory Manager, National Management and System
// Admin. Brand, Buyer, Creator and ESG Capital accounts were removed from
// here: those external partners connect through the customer experience
// platform (`forestos-qr-landing`), not this internal console.
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
    id: 'ntzdc',
    label: 'Block Operations View',
    base: '/app/ops',
    scopeLabel: 'Operating zone',
    org: {
      name: 'NTZDC — South West Mau',
      role: 'Zone Development Cooperation',
      scope: 'Kiptunga Block operations',
      code: 'NTZDC-SWM',
      since: '2019',
    },
    person: { name: 'J. Chirchir', id: 'SUP-KIP-02', email: 'j.chirchir@ntzdc.go.ke' },
    modules: [
      { to: '', label: 'Operations & QC Hub', end: true },
      { to: 'verification', label: 'Verification Queue' },
      { to: 'problems', label: 'Problem Reports' },
      { to: 'quality', label: 'Quality & Rejections' },
      { to: 'pricing', label: 'Price Configurator' },
      { to: 'training', label: 'Farmer Training Alerts' },
      { to: 'buffer', label: 'Buffer Maintenance' },
    ],
  },
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
      name: 'NTZDC — Kiptunga Tea Factory',
      role: 'Factory Manager',
      scope: 'Kiptunga Tea Factory · processing',
      code: 'NTZDC-F-KPT',
      since: '2019',
    },
    person: { name: 'P. Rotich', id: 'FM-KTF-01', email: 'p.rotich@ntzdc.go.ke' },
    modules: [
      { to: '', label: 'Factory Overview', end: true },
      { to: 'intake', label: 'Intake & Weighbridge' },
      { to: 'processing', label: 'Processing & Grading' },
      { to: 'energy', label: 'Power & Energy' },
      { to: 'quality', label: 'Quality Holds' },
      { to: 'dispatch', label: 'Dispatch & Stock' },
    ],
  },
  {
    id: 'ntzdc-mgmt',
    label: 'National Management View',
    base: '/app/management',
    scopeLabel: 'Coverage',
    org: {
      name: 'NTZDC — National',
      role: 'Zone Development Cooperation',
      scope: 'All zones',
      code: 'NTZDC-NAT',
      since: '2016',
    },
    person: { name: 'Faith Wambui', id: 'NAT-MGMT-01', email: 'faith.wambui@ntzdc.go.ke' },
    modules: [
      { to: '', label: 'Landscape Overview', end: true },
      { to: 'zones', label: 'Zone Comparison' },
      { to: 'buffer', label: 'Buffer & Conservation Rollup' },
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
