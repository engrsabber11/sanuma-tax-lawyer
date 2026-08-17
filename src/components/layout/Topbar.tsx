import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Sun, Moon, Plus, Menu, ChevronDown } from 'lucide-react'
import { useTheme } from '../../lib/theme'
import { Avatar } from '../ui/Avatar'

export function Topbar({ onSearch, onMenu }: { onSearch: () => void; onMenu: () => void }) {
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [quickAddOpen, setQuickAddOpen] = useState(false)

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
            <div className="absolute right-0 top-11 w-48 animate-slide-up overflow-hidden rounded-xl border border-ink-200/70 bg-white py-1 shadow-[var(--shadow-popover)] dark:border-ink-800 dark:bg-ink-900">
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

        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="flex h-9.5 w-9.5 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
        >
          {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>

        <button className="ml-1" aria-label="Account settings" onClick={() => navigate('/settings')}>
          <Avatar name="Sanuma Lawyer" size="sm" />
        </button>
      </div>
    </header>
  )
}
