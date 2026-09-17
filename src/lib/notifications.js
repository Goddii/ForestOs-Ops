// Operational notifications shown in the topbar notification panel. Grounded
// in the same mock records the relevant role's own screens already show
// (Zone Manager's exceptions, Admin's needs-attention list) rather than
// invented separately, so a notification always resolves to a real screen.
// Illustrative only; no real backend pushes these.

import { ZONE } from './dashboard/zoneManager'
import { ADMIN } from './dashboard/systemAdmin'

const GENERIC = [
  {
    id: 'gen-passport',
    title: 'Conservation Passport ready',
    detail: 'Q3 evidence pack compiled and ready for review.',
    when: '2 hours ago',
    to: '',
  },
]

const BY_ROLE = {
  zone: [
    {
      id: 'zone-fire',
      title: 'Fire escalated · Kiptunga north edge',
      detail: 'Awaiting ranger acknowledgement.',
      when: '14 min ago',
      to: 'exceptions',
    },
    {
      id: 'zone-signoff',
      title: 'August sign-off outstanding',
      detail: `${ZONE.signoff.tickets.toLocaleString()} tickets awaiting your attestation.`,
      when: '3 hours ago',
      to: 'signoff',
    },
    {
      id: 'zone-nessuit',
      title: 'Nessuit block flagged',
      detail: 'Output above agronomic ceiling for 4 days running.',
      when: '1 day ago',
      to: 'blocks',
    },
  ],
  admin: [
    {
      id: 'admin-sync',
      title: `${ADMIN.kpis.syncBacklog} records in sync backlog`,
      detail: `${ADMIN.kpis.devicesOffline24h} supervisor devices offline over 24 h.`,
      when: '18 min ago',
      to: 'integrations',
    },
    {
      id: 'admin-anomaly',
      title: `${ADMIN.kpis.anomaliesOpen} anomalies open`,
      detail: `${ADMIN.kpis.anomaliesAboveCeiling} plots routed to zone managers for review.`,
      when: '1 hour ago',
      to: '',
    },
    {
      id: 'admin-onboarding',
      title: '11 workers pending onboarding',
      detail: 'Awaiting ID verification before they can be mustered.',
      when: '5 hours ago',
      to: 'people',
    },
  ],
  ntzdc: [
    {
      id: 'ntzdc-verify',
      title: '6 claims to verify',
      detail: '2 overdue past their review window.',
      when: '40 min ago',
      to: 'verification',
    },
    {
      id: 'ntzdc-dispute',
      title: 'Ticket disputed',
      detail: 'WT-2026-003871 · respond by Thursday.',
      when: '1 day ago',
      to: 'problems',
    },
  ],
  'ntzdc-mgmt': [
    {
      id: 'mgmt-parity',
      title: 'Pay-parity gap widened · Cherangani Hills',
      detail: 'Now the widest gap to the top-paying zone.',
      when: '6 hours ago',
      to: 'zones',
    },
  ],
  esg: [
    {
      id: 'esg-drawdown',
      title: 'Capital drawdown ready for review',
      detail: 'Q3 tranche compiled against fund allocation targets.',
      when: '3 hours ago',
      to: 'drawdowns',
    },
  ],
  buyer: [
    {
      id: 'buyer-report',
      title: 'ESG report export ready',
      detail: 'Q3 verification records compiled for download.',
      when: '2 hours ago',
      to: 'reports',
    },
  ],
}

/** Notifications for a role, most recent first — role-specific plus a small generic set. */
export function notificationsForRole(roleId) {
  return [...(BY_ROLE[roleId] ?? []), ...GENERIC]
}
