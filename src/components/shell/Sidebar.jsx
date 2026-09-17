import { Link, NavLink } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  BookMarked,
  Boxes,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  Coins,
  FileDown,
  FolderTree,
  History,
  TriangleAlert,
  Landmark,
  LayoutGrid,
  Leaf,
  Map,
  PackageSearch,
  Plug,
  QrCode,
  Radio,
  Satellite,
  ScanLine,
  Scale,
  ShieldCheck,
  Sprout,
  Trees,
  Users,
  Waypoints,
  X,
} from 'lucide-react'
import { modulePath } from '../../lib/dashboard/roles'
import { clearAccount } from '../../lib/session'

const NAV_ICON = {
  Overview: LayoutGrid,
  'EUDR Compliance': ShieldCheck,
  'Conservation Passports': BookMarked,
  'Fair Pay Telemetry': Coins,
  'Satellite Analytics': Satellite,
  'QR Scan Analytics': QrCode,
  'Campaign Drops': Radio,
  'Audience QR Scans': ScanLine,
  'Conservation Impact': Sprout,
  'Commission & Earnings': Coins,
  'Conservation Passport': BookMarked,
  'Batch Lookup': PackageSearch,
  'ESG Report Export': FileDown,
  'Operations & QC Hub': Boxes,
  'Verification Queue': ClipboardCheck,
  'Problem Reports': TriangleAlert,
  'Landscape Overview': Map,
  'Zone Comparison': Scale,
  'Buffer & Conservation Rollup': Trees,
  'Quality & Rejections': ShieldCheck,
  'Price Configurator': BarChart3,
  'Farmer Training Alerts': Users,
  'Buffer Maintenance': Sprout,
  'Fund Allocation': Landmark,
  'Capital Drawdowns': Coins,
  'Satellite Recovery': Satellite,
  'Impact Audit Logs': ShieldCheck,
  'Zone Overview': LayoutGrid,
  'Block Performance': BarChart3,
  'Buffer Map': Map,
  Exceptions: TriangleAlert,
  'Pay & Parity': Scale,
  'Zone Sign-off': ClipboardCheck,
  'Console Home': LayoutGrid,
  Registry: FolderTree,
  'People & Roles': Users,
  'Audit Log': History,
  Integrations: Plug,
  'Verified Claims Export': FileDown,
}

function navLinkClass({ isActive }) {
  return (
    'group flex min-w-0 items-center gap-2.5 rounded-md border-l-4 py-2 pl-2.5 pr-2 text-[13px] transition-colors ' +
    (isActive
      ? 'border-emerald-400 bg-emerald-900/60 font-medium text-white'
      : 'border-transparent text-emerald-100/70 hover:bg-emerald-900/50 hover:text-white')
  )
}

const SIDEBAR_CARD = 'rounded-lg border border-emerald-800/50 bg-emerald-900/40 px-3 py-2.5'

function NavList({ role, collapsed, onNavigate }) {
  return (
    <nav className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-y-auto">
      <NavLink
        to="/app/overview"
        title="Forest Line overview"
        onClick={onNavigate}
        className={navLinkClass}
      >
        <Waypoints className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
        {!collapsed && <span className="truncate">Forest Line overview</span>}
      </NavLink>
      {!collapsed && (
        <p className="mt-2 px-2.5 pb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-100/40">
          {role.label.replace(/ View$/, '')}
        </p>
      )}
      {role.modules.map((item) => {
        const Icon = NAV_ICON[item.label] ?? LayoutGrid
        return (
          <NavLink
            key={item.label}
            to={modulePath(role, item.to)}
            end={item.end}
            title={item.label}
            onClick={onNavigate}
            className={navLinkClass}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        )
      })}
    </nav>
  )
}

function SidebarBody({ role, collapsed, onToggleCollapse, showCloseButton, onClose }) {
  // Mobile drawer instance passes `onClose` as showCloseButton's handler; reuse
  // it to also close the drawer when a nav link is actually followed. The
  // desktop rail instance never sets showCloseButton, so this is a no-op there.
  const onNavigate = showCloseButton ? onClose : undefined
  const { org } = role
  return (
    <div className="flex h-full flex-col gap-5 bg-emerald-950 px-3 py-5 text-emerald-100">
      <div className="flex items-center justify-between px-1">
        <Link
          to="/app/overview"
          onClick={onNavigate}
          className="inline-flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-[0.18em] text-white"
        >
          <Leaf className="h-4 w-4 shrink-0 text-emerald-400" strokeWidth={2.25} aria-hidden="true" />
          {!collapsed && 'ForestOS'}
        </Link>
        {showCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="grid min-h-11 min-w-11 place-items-center rounded-md text-emerald-100/60 transition-colors hover:bg-emerald-900/50 hover:text-white"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            className="grid min-h-11 min-w-11 place-items-center rounded-md text-emerald-100/60 transition-colors hover:bg-emerald-900/50 hover:text-white"
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            ) : (
              <ChevronsLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {!collapsed && (
        <div className={SIDEBAR_CARD}>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-400">
            {role.scopeLabel}
          </p>
          <p className="mt-1 text-[13px] font-medium leading-tight text-white">{org.scope}</p>
          <p className="mt-0.5 font-mono text-[10px] tracking-[0.08em] text-emerald-100/55">
            {org.code} · since {org.since}
          </p>
        </div>
      )}

      <NavList role={role} collapsed={collapsed} onNavigate={onNavigate} />

      <div className={collapsed ? 'flex flex-col items-center gap-2' : SIDEBAR_CARD}>
        {!collapsed && (
          <>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-100/50">
              Signed in as
            </p>
            <p className="mt-1 text-[13px] font-medium text-white">{role.person?.name ?? org.name}</p>
            <p className="text-[11px] text-emerald-100/70">{org.role}</p>
          </>
        )}
        <Link
          to="/"
          onClick={clearAccount}
          title="Sign out"
          aria-label="Sign out"
          className={
            'inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-100/50 transition-colors hover:text-white ' +
            (collapsed
              ? 'min-h-11 min-w-11 justify-center rounded-md hover:bg-emerald-900/50'
              : 'mt-3')
          }
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
          {!collapsed && 'Sign out'}
        </Link>
      </div>
    </div>
  )
}

/**
 * The console's primary navigation. Desktop: sticky, full-height, toggles
 * between an expanded rail (~224px) and a collapsed icon rail (~64px).
 * Mobile (< lg): an off-canvas drawer over a backdrop, opened from the
 * topbar's menu button.
 */
export default function Sidebar({ role, collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  return (
    <>
      {/* Desktop rail */}
      <aside
        className={
          'hidden shrink-0 border-r border-emerald-800/50 transition-[width] duration-200 lg:sticky lg:top-0 lg:block lg:h-screen ' +
          (collapsed ? 'lg:w-[68px]' : 'lg:w-56')
        }
      >
        <SidebarBody role={role} collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onCloseMobile}
            className="absolute inset-0 bg-forest-950/60 backdrop-blur-[2px]"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl">
            <SidebarBody role={role} collapsed={false} showCloseButton onClose={onCloseMobile} />
          </div>
        </div>
      )}
    </>
  )
}
