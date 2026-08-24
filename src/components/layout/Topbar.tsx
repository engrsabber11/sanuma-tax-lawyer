import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Sun, Moon, Plus, Menu, ChevronDown, LogOut, Bell, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react'
import { useTheme } from '../../lib/theme'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { useData } from '../../data/store'
import { ROLE_LABEL } from '../../data/permissions'
import { useToast } from '../../lib/toast'

export function Topbar({ onSearch, onMenu }: { onSearch: () => void; onMenu: () => void }) {
  const { theme, toggle } = useTheme()
  const { activeStaff, signOut, clientDocuments, filingPeriods, clients } = useData()
  const { show } = useToast()
  const navigate = useNavigate()
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  // Internal Push Notifications derived from urgent items
  const internalAlerts = [
    {
      id: 'n1',
      title: 'VAT Return Q2/Q3 Filing Milestone',
      desc: 'Al Falasi Grocery quarterly return lands on 7-day milestone',
      time: 'Today · 09:00 AM',
      type: 'tax',
      unread: true,
    },
    {
      id: 'n2',
      title: 'Trade License Renewal Due',
      desc: 'Gulf Horizon Trading license expires in 15 days',
      time: 'Today · 08:30 AM',
      type: 'doc',
      unread: true,
    },
    {
      id: 'n3',
      title: 'Corporate Tax Registration Verified',
      desc: 'FTA Reference # CT-2026-9921 attached and approved',
      time: 'Yesterday',
      type: 'success',
      unread: false,
    },
  ]

  const unreadCount = internalAlerts.filter((a) => a.unread).length

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-200/70 bg-white/80 px-4 backdrop-blur-md lg:px-6 dark:border-ink-800 dark:bg-ink-950/80">
      <button onClick={onMenu} aria-label="Open menu" className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 lg:hidden dark:hover:bg-ink-800">
        <Menu className="h-5 w-5" />
      </button>

      <button
        onClick={onSearch}
        aria-label="Open search"
        className="flex h-9.5 flex-1 max-w-md items-center gap-2.5 rounded-lg border border-ink-200 bg-ink-50 px-3.5 text-sm text-ink-400 transition-colors hover:border-ink-300 dark:border-ink-700 dark:bg-ink-900"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search clients, invoices, documents…</span>
        <kbd className="rounded border border-ink-300 bg-white px-1.5 py-0.5 text-[10px] dark:border-ink-600 dark:bg-ink-800">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {/* Quick Add Button */}
        <div className="relative">
          <button
            onClick={() => setQuickAddOpen((o) => !o)}
            onBlur={() => setTimeout(() => setQuickAddOpen(false), 120)}
            aria-label="Quick add"
            className="flex h-9.5 items-center gap-1.5 rounded-lg bg-accent-600 px-3.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-700"
          >
            <Plus className="h-4 w-4" />
            New
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>
          {quickAddOpen && (
            <div className="absolute right-0 top-11 z-40 w-48 animate-slide-up overflow-hidden rounded-xl border border-ink-200/70 bg-white py-1 shadow-[var(--shadow-popover)] dark:border-ink-800 dark:bg-ink-900">
              {[
                { label: 'New Client', to: '/clients/new' },
                { label: 'New Matter', to: '/matters' },
                { label: 'New Invoice', to: '/sales/invoices' },
                { label: 'New Document', to: '/documents' },
              ].map((item) => (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className="block w-full px-3.5 py-2 text-left text-sm text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Internal Push Notification Center */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen((o) => !o)}
            onBlur={() => setTimeout(() => setNotificationsOpen(false), 150)}
            aria-label="Internal Alerts"
            className="relative flex h-9.5 w-9.5 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-600" />
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-11 z-40 w-80 overflow-hidden rounded-xl border border-ink-200 bg-white p-1 shadow-[var(--shadow-popover)] dark:border-ink-800 dark:bg-ink-900">
              <div className="flex items-center justify-between border-b border-ink-100 px-3.5 py-2.5 dark:border-ink-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-900 dark:text-ink-100">
                    Internal Push Alerts
                  </span>
                  <Badge tone="accent" size="sm">
                    {unreadCount} new
                  </Badge>
                </div>
                <span className="text-[10px] text-ink-400">Firm In-App Alerts</span>
              </div>
              <div className="flex flex-col divide-y divide-ink-50 dark:divide-ink-800/60">
                {internalAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-2.5 px-3.5 py-2.5 transition-colors hover:bg-ink-50/80 dark:hover:bg-ink-800/40 ${alert.unread ? 'bg-accent-50/30 dark:bg-accent-950/20' : ''
                      }`}
                  >
                    <div className="mt-0.5">
                      {alert.type === 'tax' ? (
                        <AlertTriangle className="h-4 w-4 text-warning-600" />
                      ) : alert.type === 'doc' ? (
                        <FileText className="h-4 w-4 text-accent-600" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-success-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink-800 dark:text-ink-100">{alert.title}</p>
                      <p className="text-[11px] text-ink-500 dark:text-ink-400 line-clamp-2">{alert.desc}</p>
                      <span className="mt-1 block text-[10px] text-ink-400">{alert.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-ink-100 p-1.5 text-center dark:border-ink-800">
                <Link
                  to="/reminders?tab=due"
                  className="block rounded-lg py-1.5 text-xs font-medium text-accent-600 transition-colors hover:bg-accent-50 dark:hover:bg-accent-900/20"
                >
                  View All Internal Worklist Reminders →
                </Link>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="flex h-9.5 w-9.5 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
        >
          {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>

        {/* User Account Popover */}
        <div className="relative">
          <button
            onClick={() => setAccountOpen((o) => !o)}
            onBlur={() => setTimeout(() => setAccountOpen(false), 150)}
            className="ml-1 flex items-center rounded-full ring-2 ring-transparent transition-all hover:ring-accent-500/30 focus:outline-none"
            aria-label="User Account Menu"
          >
            <Avatar name={activeStaff.name} color={activeStaff.avatarColor} size="sm" />
          </button>

          {accountOpen && (
            <div className="absolute right-0 top-11 z-40 w-64 overflow-hidden rounded-xl border border-ink-200 bg-white p-1.5 shadow-[var(--shadow-popover)] dark:border-ink-800 dark:bg-ink-900">
              <div className="flex items-center gap-3 border-b border-ink-100 p-2.5 dark:border-ink-800">
                <Avatar name={activeStaff.name} color={activeStaff.avatarColor} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-100">{activeStaff.name}</p>
                  <p className="text-[11px] font-medium text-accent-600 dark:text-accent-400">{ROLE_LABEL[activeStaff.role]}</p>
                  <p className="truncate text-[10px] text-ink-400">{activeStaff.title}</p>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    navigate('/settings')
                    setAccountOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ink-700 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
                >
                  <Search className="h-4 w-4 text-ink-400" />
                  Account Settings &amp; Preferences
                </button>
              </div>

              <div className="border-t border-ink-100 pt-1 dark:border-ink-800">
                <button
                  onClick={() => {
                    signOut()
                    setAccountOpen(false)
                    show('You have been signed out')
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-danger-600 transition-colors hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-950/30"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out of Sanuma OS
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
