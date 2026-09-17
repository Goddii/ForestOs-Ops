import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const COLLAPSE_KEY = 'forestos-ops.sidebar-collapsed'

function getStoredCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * The console's persistent shell: sidebar + topbar around a scrolling content
 * area. The mobile drawer closes itself when a nav link is actually followed
 * (`Sidebar`'s `onNavigate`), not via an effect watching the route — a link
 * click is the real event that should close it.
 */
export default function AppShell({ role, children }) {
  const [collapsed, setCollapsed] = useState(getStoredCollapsed)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        // per-viewer convenience only — fine if it doesn't persist
      }
      return next
    })
  }

  return (
    <div className="dash flex min-h-screen bg-paper text-ink">
      <Sidebar
        role={role}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar role={role} onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
