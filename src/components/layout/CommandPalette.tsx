import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, User, FileText, Receipt, ArrowRight } from 'lucide-react'
import { useData } from '../../data/store'

interface Item {
  id: string
  title: string
  subtitle: string
  icon: typeof User
  to: string
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { clients, invoices, clientDocuments, documentTypes } = useData()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const items = useMemo<Item[]>(() => {
    const clientItems: Item[] = clients.map((c) => ({
      id: `client-${c.id}`,
      title: c.name,
      subtitle: c.businessName ?? 'Individual client',
      icon: User,
      to: `/clients/${c.id}`,
    }))
    const invoiceItems: Item[] = invoices.map((inv) => ({
      id: `inv-${inv.id}`,
      title: inv.number,
      subtitle: clients.find((c) => c.id === inv.clientId)?.name ?? '',
      icon: Receipt,
      to: `/sales/invoices/${inv.id}`,
    }))
    const docItems: Item[] = clientDocuments.map((d) => ({
      id: `doc-${d.id}`,
      title: `${documentTypes.find((t) => t.id === d.typeId)?.name ?? 'Document'} — ${d.number ?? ''}`,
      subtitle: clients.find((c) => c.id === d.clientId)?.name ?? '',
      icon: FileText,
      to: `/clients/${d.clientId}?tab=documents`,
    }))
    return [...clientItems, ...invoiceItems, ...docItems]
  }, [clients, invoices, clientDocuments, documentTypes])

  const filtered = query
    ? items.filter((i) => (i.title + i.subtitle).toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : items.slice(0, 6)

  function go(to: string) {
    navigate(to)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            className="absolute inset-0 bg-ink-950/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-[var(--shadow-popover)] dark:border-ink-800 dark:bg-ink-900"
          >
            <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-3.5 dark:border-ink-800">
              <Search className="h-4 w-4 text-ink-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clients, invoices, documents…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-ink-400"
              />
              <kbd className="rounded border border-ink-200 px-1.5 py-0.5 text-[10px] text-ink-400 dark:border-ink-700">Esc</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-ink-400">No results for “{query}”</p>
              )}
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => go(item.to)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500 dark:bg-ink-800">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink-800 dark:text-ink-100">{item.title}</span>
                    <span className="block truncate text-xs text-ink-400">{item.subtitle}</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-ink-300" />
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
