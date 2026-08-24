import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FolderClock,
  CalendarClock,
  BellRing,
  Briefcase,
  ShoppingBag,
  FileSpreadsheet,
  Receipt,
  Wallet,
  Users2,
  Settings,
  Scale,
  LogOut,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useData } from '../../data/store'
import { Avatar } from '../ui/Avatar'
import { ROLE_LABEL } from '../../data/permissions'

const nav: { heading: string; items: { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean }[] }[] = [
  {
    heading: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    heading: 'Clients',
    items: [
      { to: '/clients', label: 'All Clients', icon: Users },
      { to: '/matters', label: 'Matters', icon: Briefcase },
    ],
  },
  {
    heading: 'Compliance',
    items: [
      { to: '/filings', label: 'Filings', icon: CalendarClock },
      { to: '/documents', label: 'Document Renewals', icon: FolderClock },
      { to: '/reminders', label: 'Reminders', icon: BellRing },
    ],
  },
  {
    heading: 'Sales & Billing',
    items: [
      { to: '/sales/services', label: 'Service Catalog', icon: ShoppingBag },
      { to: '/sales/invoices', label: 'Quotes & Invoices', icon: FileSpreadsheet },
      { to: '/credit-notes', label: 'Tax Credit Notes', icon: Receipt },
      { to: '/expenses', label: 'Expenses', icon: Wallet },
    ],
  },
  {
    heading: 'Practice',
    items: [
      { to: '/accounting', label: 'Accounting', icon: Scale },
      { to: '/referrals', label: 'Referrals & Wallet', icon: Users2 },
    ],
  },
]

export function Sidebar() {
  const { activeStaff, signOut } = useData()

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-200/70 bg-white lg:flex dark:border-ink-800 dark:bg-ink-900">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600 text-white">
          <Scale className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-ink-900 dark:text-ink-50">Sanuma Practice OS</p>
          <p className="text-[11px] leading-tight text-ink-400">Tax Advisory Suite</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {nav.map((group) => (
          <div key={group.heading} className="mb-5">
            <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              {group.heading}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400'
                        : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800',
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-ink-100 p-3 dark:border-ink-800">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400'
                : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800',
            )
          }
        >
          <Settings className="h-4 w-4" />
          Settings
        </NavLink>

        <div className="mt-1 flex items-center justify-between gap-2 rounded-xl bg-ink-50 p-2 dark:bg-ink-800/60">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={activeStaff.name} color={activeStaff.avatarColor} size="xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-ink-800 dark:text-ink-100">{activeStaff.name}</p>
              <p className="truncate text-[10px] text-ink-400">{ROLE_LABEL[activeStaff.role]}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            title="Sign out of session"
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-900/30 dark:hover:text-danger-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
