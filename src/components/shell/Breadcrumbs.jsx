import { useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { modulePath } from '../../lib/dashboard/roles'

/** "ForestOS / <Role> / <Screen>" — screen resolves from the current role's own module list. */
export default function Breadcrumbs({ role }) {
  const { pathname } = useLocation()
  const isOverview = pathname === '/app/overview'
  const current = isOverview
    ? 'Forest Line overview'
    : (role.modules.find((m) => pathname === modulePath(role, m.to))?.label ?? role.modules[0]?.label)

  const crumbs = isOverview ? ['ForestOS', current] : ['ForestOS', role.label.replace(/ View$/, ''), current]

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 font-mono text-[12px] text-ink-faint">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex min-w-0 items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-line-strong" strokeWidth={2} aria-hidden="true" />}
          <span className={i === crumbs.length - 1 ? 'truncate text-ink' : 'truncate'}>{crumb}</span>
        </span>
      ))}
    </nav>
  )
}
