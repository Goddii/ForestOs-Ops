import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check } from 'lucide-react'
import { modulePath } from '../../lib/dashboard/roles'
import { notificationsForRole } from '../../lib/notifications'

/** Bell icon + dropdown of role-scoped operational notifications. Read state is local/ephemeral (no backend). */
export default function NotificationPanel({ role, open, onToggle, onClose }) {
  const [readIds, setReadIds] = useState(() => new Set())
  const navigate = useNavigate()
  const items = notificationsForRole(role.id)
  const unreadCount = items.filter((n) => !readIds.has(n.id)).length

  const markRead = (id) => setReadIds((prev) => new Set(prev).add(id))

  const openRecord = (item) => {
    markRead(item.id)
    navigate(modulePath(role, item.to))
    onClose()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        className="grid min-h-11 min-w-11 place-items-center rounded-md text-ink-muted transition-colors hover:bg-paper-sunk hover:text-ink"
      >
        <span className="relative inline-flex">
          <Bell className="h-4.5 w-4.5" strokeWidth={2} aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500"
              aria-hidden="true"
            />
          )}
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={onClose}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-emerald-900/10 bg-card shadow-card-raised">
            <div className="border-b border-line px-4 py-2.5">
              <p className="text-[13px] font-semibold text-ink">Notifications</p>
            </div>
            <div className="max-h-96 overflow-y-auto" aria-live="polite">
              {items.length === 0 && (
                <p className="px-4 py-6 text-center text-[13px] text-ink-faint">Nothing needs your attention.</p>
              )}
              {items.map((item) => {
                const unread = !readIds.has(item.id)
                return (
                  <div
                    key={item.id}
                    className={'flex items-start gap-2.5 border-b border-line px-4 py-3 last:border-0 ' + (unread ? 'bg-emerald-600/[0.04]' : '')}
                  >
                    <span
                      className={'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ' + (unread ? 'bg-amber-500' : 'bg-transparent')}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium leading-snug text-ink">{item.title}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">{item.detail}</p>
                      <div className="mt-1.5 flex items-center gap-3">
                        <span className="font-mono text-[10px] text-ink-faint">{item.when}</span>
                        <button
                          type="button"
                          onClick={() => openRecord(item)}
                          className="font-mono text-[10px] uppercase tracking-[0.1em] text-emerald-700 hover:text-emerald-800"
                        >
                          View
                        </button>
                        {unread && (
                          <button
                            type="button"
                            onClick={() => markRead(item.id)}
                            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint hover:text-ink"
                          >
                            <Check className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
