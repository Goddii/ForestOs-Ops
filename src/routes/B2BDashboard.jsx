import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppShell from '../components/shell/AppShell'
import { DEFAULT_ROLE, roleFromPath } from '../lib/dashboard/roles'

// Cross-cutting
import OverviewLandscapeModule from '../components/dashboard/modules/OverviewLandscapeModule'
// NTZDC Operations modules
import CollectionFeedsModule from '../components/dashboard/modules/ntzdc/CollectionFeedsModule'
import VerificationQueueModule from '../components/dashboard/modules/ntzdc/VerificationQueueModule'
import ProblemReportsModule from '../components/dashboard/modules/ntzdc/ProblemReportsModule'
import QualityRejectionsModule from '../components/dashboard/modules/ntzdc/QualityRejectionsModule'
import PriceConfiguratorModule from '../components/dashboard/modules/ntzdc/PriceConfiguratorModule'
import TrainingAlertsModule from '../components/dashboard/modules/ntzdc/TrainingAlertsModule'
import BufferMaintenanceModule from '../components/dashboard/modules/ntzdc/BufferMaintenanceModule'
// NTZDC Management modules
import LandscapeOverviewModule from '../components/dashboard/modules/management/LandscapeOverviewModule'
import ZoneComparisonModule from '../components/dashboard/modules/management/ZoneComparisonModule'
import BufferConservationRollupModule from '../components/dashboard/modules/management/BufferConservationRollupModule'
// Zone Manager modules
import ZoneOverviewModule from '../components/dashboard/modules/zone/ZoneOverviewModule'
import BlockPerformanceModule from '../components/dashboard/modules/zone/BlockPerformanceModule'
import BufferMapModule from '../components/dashboard/modules/zone/BufferMapModule'
import ExceptionsModule from '../components/dashboard/modules/zone/ExceptionsModule'
import PayParityModule from '../components/dashboard/modules/zone/PayParityModule'
import ZoneSignOffModule from '../components/dashboard/modules/zone/ZoneSignOffModule'
// System Admin modules
import ConsoleHomeModule from '../components/dashboard/modules/admin/ConsoleHomeModule'
import RegistryModule from '../components/dashboard/modules/admin/RegistryModule'
import PeopleRolesModule from '../components/dashboard/modules/admin/PeopleRolesModule'
import AuditLogModule from '../components/dashboard/modules/admin/AuditLogModule'
import IntegrationsModule from '../components/dashboard/modules/admin/IntegrationsModule'
import ExportsModule from '../components/dashboard/modules/admin/ExportsModule'

const AS_OF = '2026-09-07'

/**
 * The console's routed content, wrapped in the shared `AppShell` (sidebar +
 * topbar). NTZDC employees only — Block Operations, Zone Manager, National
 * Management, System Admin. Brand/Buyer/Creator/ESG accounts live on the
 * customer experience platform (`forestos-qr-landing`) instead, not here.
 *
 * The active role for display purposes follows the URL (`roleFromPath`), not
 * a fixed session role — `/app/overview` deliberately deep-links into other
 * roles' screens as one cross-role "landscape tour" (See → Verify → Value →
 * Reward), and the shell needs to track whichever one is actually on screen
 * for that to read coherently. Access is role-based from the sign-in step
 * (no in-app switcher), but that doesn't hard-gate routes — this is a
 * prototype, not real auth.
 */
export default function B2BDashboard() {
  const { pathname } = useLocation()
  const role = roleFromPath(pathname)
  const isOverview = pathname === '/app/overview'

  useEffect(() => {
    document.title = isOverview ? 'ForestOS — Forest Line' : `ForestOS — ${role.label}`
  }, [role.label, isOverview])

  return (
    <AppShell role={role}>
      <div className="flex items-center gap-2 border-b border-line bg-paper-sunk/60 px-4 py-1.5 sm:px-8">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          Prototype · every figure is illustrative mock data, not verified evidence · as of {AS_OF}
        </p>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
        <Routes>
          {/* Cross-cutting — the Forest Line front door */}
          <Route path="overview" element={<OverviewLandscapeModule />} />

          {/* Block Operations */}
          <Route path="ops" element={<CollectionFeedsModule />} />
          <Route path="ops/verification" element={<VerificationQueueModule />} />
          <Route path="ops/problems" element={<ProblemReportsModule />} />
          <Route path="ops/quality" element={<QualityRejectionsModule />} />
          <Route path="ops/pricing" element={<PriceConfiguratorModule />} />
          <Route path="ops/training" element={<TrainingAlertsModule />} />
          <Route path="ops/buffer" element={<BufferMaintenanceModule />} />

          {/* National Management (org-wide roll-up) */}
          <Route path="management" element={<LandscapeOverviewModule />} />
          <Route path="management/zones" element={<ZoneComparisonModule />} />
          <Route path="management/buffer" element={<BufferConservationRollupModule />} />

          {/* Zone Manager */}
          <Route path="zone" element={<ZoneOverviewModule />} />
          <Route path="zone/blocks" element={<BlockPerformanceModule />} />
          <Route path="zone/buffer" element={<BufferMapModule />} />
          <Route path="zone/exceptions" element={<ExceptionsModule />} />
          <Route path="zone/pay" element={<PayParityModule />} />
          <Route path="zone/signoff" element={<ZoneSignOffModule />} />

          {/* System Admin */}
          <Route path="admin" element={<ConsoleHomeModule />} />
          <Route path="admin/registry" element={<RegistryModule />} />
          <Route path="admin/people" element={<PeopleRolesModule />} />
          <Route path="admin/audit" element={<AuditLogModule />} />
          <Route path="admin/integrations" element={<IntegrationsModule />} />
          <Route path="admin/exports" element={<ExportsModule />} />

          <Route path="*" element={<Navigate to={DEFAULT_ROLE.base} replace />} />
        </Routes>
      </div>
    </AppShell>
  )
}
