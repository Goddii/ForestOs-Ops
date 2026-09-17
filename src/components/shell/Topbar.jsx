import { useEffect, useState } from 'react'
import { Menu, Search } from 'lucide-react'
import Breadcrumbs from './Breadcrumbs'
import GlobalSearch from './GlobalSearch'
import NotificationPanel from './NotificationPanel'
import ProfileMenu from './ProfileMenu'

/** Sticky topbar: mobile menu trigger, breadcrumbs, global search, notifications, profile. */
export default function Topbar({ role, onOpenMobileNav }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState(null) // 'notifications' | 'profile' | null

  useEffect(() => {
    const onKey = (event) => {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
      if (isCmdK) {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-card px-4 py-2.5 sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="grid min-h-11 min-w-11 place-items-center rounded-md text-ink-muted transition-colors hover:bg-paper-sunk hover:text-ink lg:hidden"
      >
        <Menu className="h-4.5 w-4.5" strokeWidth={2} aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <Breadcrumbs role={role} />
      </div>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="hidden items-center gap-2.5 rounded-md border border-line bg-paper-sunk/60 px-3 py-1.5 text-[12.5px] text-ink-faint transition-colors hover:border-line-strong hover:text-ink-muted sm:flex"
      >
        <Search className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        Search
        <kbd className="ml-2 rounded border border-line-strong bg-card px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
          ⌘K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        aria-label="Search"
        className="grid min-h-11 min-w-11 place-items-center rounded-md text-ink-muted transition-colors hover:bg-paper-sunk hover:text-ink sm:hidden"
      >
        <Search className="h-4.5 w-4.5" strokeWidth={2} aria-hidden="true" />
      </button>

      <NotificationPanel
        role={role}
        open={openMenu === 'notifications'}
        onToggle={() => setOpenMenu((m) => (m === 'notifications' ? null : 'notifications'))}
        onClose={() => setOpenMenu(null)}
      />
      <ProfileMenu
        role={role}
        open={openMenu === 'profile'}
        onToggle={() => setOpenMenu((m) => (m === 'profile' ? null : 'profile'))}
        onClose={() => setOpenMenu(null)}
      />

      <GlobalSearch role={role} open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}
