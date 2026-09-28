import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppShell from '../components/shell/AppShell'
import { DEFAULT_ROLE, roleFromPath } from '../lib/dashboard/roles'

// Cross-cutting
import OverviewLandscapeModule from '../components/dashboard/modules/OverviewLandscapeModule'
// Operations Manager — national screens
import NationalOverviewModule from '../components/dashboard/modules/operations/NationalOverviewModule'
import TeaOperationsModule from '../components/dashboard/modules/operations/TeaOperationsModule'
import ConservationOperationsModule from '../components/dashboard/modules/operations/ConservationOperationsModule'
import PartnershipsModule from '../components/dashboard/modules/operations/PartnershipsModule'
import PeoplePayrollModule from '../components/dashboard/modules/operations/PeoplePayrollModule'
import EscalationsModule from '../components/dashboard/modules/operations/EscalationsModule'
import ApprovalsBudgetModule from '../components/dashboard/modules/operations/ApprovalsBudgetModule'
// Operations Manager — Zone Desk (one zone's block-level desk)
import ZoneDesk from '../components/dashboard/modules/operations/ZoneDesk'
import OperationsOverviewModule from '../components/dashboard/modules/operations/OperationsOverviewModule'
import LeafLogisticsModule from '../components/dashboard/modules/operations/LeafLogisticsModule'
import FieldTeamsModule from '../components/dashboard/modules/operations/FieldTeamsModule'
import BufferConservationModule from '../components/dashboard/modules/operations/BufferConservationModule'
import WorkOrdersModule from '../components/dashboard/modules/operations/WorkOrdersModule'
import IncidentsModule from '../components/dashboard/modules/operations/IncidentsModule'
import PayrollRunModule from '../components/dashboard/modules/operations/PayrollRunModule'
// Zone Manager modules
import ZoneOverviewModule from '../components/dashboard/modules/zone/ZoneOverviewModule'
import BlockPerformanceModule from '../components/dashboard/modules/zone/BlockPerformanceModule'
import BufferMapModule from '../components/dashboard/modules/zone/BufferMapModule'
import ExceptionsModule from '../components/dashboard/modules/zone/ExceptionsModule'
import PayParityModule from '../components/dashboard/modules/zone/PayParityModule'
import ZoneSignOffModule from '../components/dashboard/modules/zone/ZoneSignOffModule'
// Factory Manager modules
import FactoryOverviewModule from '../components/dashboard/modules/factory/FactoryOverviewModule'
import IntakeWeighbridgeModule from '../components/dashboard/modules/factory/IntakeWeighbridgeModule'
import ProcessingGradingModule from '../components/dashboard/modules/factory/ProcessingGradingModule'
import PowerEnergyModule from '../components/dashboard/modules/factory/PowerEnergyModule'
import EnergyLedgerModule from '../components/dashboard/modules/factory/EnergyLedgerModule'
import QualityHoldsModule from '../components/dashboard/modules/factory/QualityHoldsModule'
import DispatchStockModule from '../components/dashboard/modules/factory/DispatchStockModule'
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
 * topbar). NTZDC employees only — Zone Manager, Factory Manager, Operations
 * Manager, System Admin. Brand/Buyer/Creator/ESG accounts live on the customer experience
 * platform (`forestos-qr-landing`) instead, not here.
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

          {/* Operations Manager — national head office */}
          <Route path="operations" element={<NationalOverviewModule />} />
          <Route path="operations/tea" element={<TeaOperationsModule />} />
          <Route path="operations/conservation" element={<ConservationOperationsModule />} />
          <Route path="operations/partnerships" element={<PartnershipsModule />} />
          <Route path="operations/people" element={<PeoplePayrollModule />} />
          <Route path="operations/incidents" element={<EscalationsModule />} />
          <Route path="operations/approvals" element={<ApprovalsBudgetModule />} />
          {/* Operations Manager — Zone Desk */}
          <Route path="operations/desk" element={<ZoneDesk><OperationsOverviewModule /></ZoneDesk>} />
          <Route path="operations/desk/logistics" element={<ZoneDesk><LeafLogisticsModule /></ZoneDesk>} />
          <Route path="operations/desk/teams" element={<ZoneDesk><FieldTeamsModule /></ZoneDesk>} />
          <Route path="operations/desk/conservation" element={<ZoneDesk><BufferConservationModule /></ZoneDesk>} />
          <Route path="operations/desk/work" element={<ZoneDesk><WorkOrdersModule /></ZoneDesk>} />
          <Route path="operations/desk/incidents" element={<ZoneDesk><IncidentsModule /></ZoneDesk>} />
          <Route path="operations/desk/payroll" element={<ZoneDesk><PayrollRunModule /></ZoneDesk>} />

          {/* Zone Manager */}
          <Route path="zone" element={<ZoneOverviewModule />} />
          <Route path="zone/blocks" element={<BlockPerformanceModule />} />
          <Route path="zone/buffer" element={<BufferMapModule />} />
          <Route path="zone/exceptions" element={<ExceptionsModule />} />
          <Route path="zone/pay" element={<PayParityModule />} />
          <Route path="zone/signoff" element={<ZoneSignOffModule />} />

          {/* Factory Manager */}
          <Route path="factory" element={<FactoryOverviewModule />} />
          <Route path="factory/intake" element={<IntakeWeighbridgeModule />} />
          <Route path="factory/processing" element={<ProcessingGradingModule />} />
          <Route path="factory/energy" element={<PowerEnergyModule />} />
          <Route path="factory/ledger" element={<EnergyLedgerModule />} />
          <Route path="factory/quality" element={<QualityHoldsModule />} />
          <Route path="factory/dispatch" element={<DispatchStockModule />} />

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
