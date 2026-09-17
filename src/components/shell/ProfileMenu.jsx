import { Link } from 'react-router-dom'
import { ChevronDown, LogOut, ShieldCheck, User } from 'lucide-react'
import { clearAccount } from '../../lib/session'

/** Profile dropdown: identity, org, and sign out. Profile/Organization/Preferences/Security are prototype stubs — no backend to hold that state yet. */
export default function ProfileMenu({ role, open, onToggle, onClose }) {
  const { org, person } = role
  const initials = (person?.name ?? org.name)
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-paper-sunk"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-900 font-mono text-[11px] font-semibold text-bone">
          {initials}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-[12.5px] font-medium leading-tight text-ink">{person?.name ?? org.name}</span>
          <span className="block text-[10.5px] leading-tight text-ink-faint">{org.role}</span>
        </span>
        <ChevronDown className="hidden h-3.5 w-3.5 text-ink-faint sm:block" strokeWidth={2} aria-hidden="true" />
      </button>

      {open && (
        <>
          <button type="button" aria-label="Close account menu" onClick={onClose} className="fixed inset-0 z-40 cursor-default" />
          <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-emerald-900/10 bg-card shadow-card-raised">
            <div className="border-b border-line px-4 py-3">
              <p className="text-[13px] font-semibold text-ink">{person?.name ?? org.name}</p>
              <p className="text-[11.5px] text-ink-muted">{person?.email ?? org.name}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">{org.name}</p>
            </div>
            <div className="py-1">
              <MenuItem icon={User} label="Profile" />
              <MenuItem icon={ShieldCheck} label="Security" />
            </div>
            <div className="border-t border-line py-1">
              <Link
                to="/"
                onClick={clearAccount}
                className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-ink transition-colors hover:bg-paper-sunk"
              >
                <LogOut className="h-3.5 w-3.5 text-ink-faint" strokeWidth={2} aria-hidden="true" />
                Sign out
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MenuItem({ icon: Icon, label }) {
  return (
    <button
      type="button"
      disabled
      title="Not wired up in this prototype"
      className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] text-ink-muted disabled:cursor-default disabled:opacity-60"
    >
      <Icon className="h-3.5 w-3.5 text-ink-faint" strokeWidth={2} aria-hidden="true" />
      {label}
    </button>
  )
}
