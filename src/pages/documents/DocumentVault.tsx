import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Eye, FolderClock, List, Plus, Search } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge, UrgencyBadge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Field'
import { EmptyState } from '../../components/ui/EmptyState'
import { NewDocumentModal } from '../../components/modals/NewDocumentModal'
import { DocumentPreviewModal } from '../../components/modals/DocumentPreviewModal'
import { Pagination } from '../../components/ui/Pagination'
import { cn, daysUntil, todayIso, urgencyFromDate, type Urgency } from '../../lib/utils'
import { useData } from '../../data/store'
import type { ClientDocument, DocumentTypeDef, FilingPeriod, ObligationType } from '../../data/types'

interface UnifiedItem {
  id: string
  clientId: string
  label: string
  category: string
  date: string
  urgency: Urgency
  kind: 'document' | 'deadline'
  matterId?: string
}

function buildItems(
  clientDocuments: ClientDocument[],
  filingPeriods: FilingPeriod[],
  obligationTypes: ObligationType[],
  documentTypes: DocumentTypeDef[],
): UnifiedItem[] {
  const docItems: UnifiedItem[] = clientDocuments.map((d) => {
    const type = documentTypes.find((t) => t.id === d.typeId)
    return {
      id: d.id,
      clientId: d.clientId,
      label: type?.name ?? 'Document',
      category: type?.category ?? 'business',
      date: d.expiryDate,
      urgency: urgencyFromDate(d.expiryDate),
      kind: 'document',
      matterId: d.matterId,
    }
  })
  // Real generated filing deadlines. Filed and not-required periods drop out —
  // this view is about what is still outstanding.
  const deadlineItems: UnifiedItem[] = filingPeriods
    .filter((p) => p.state === 'pending')
    .map((p) => ({
      id: p.id,
      clientId: p.clientId,
      label: `${obligationTypes.find((t) => t.id === p.obligationTypeId)?.name ?? 'Filing'} — ${p.label}`,
      category: 'tax',
      date: p.dueDate,
      urgency: urgencyFromDate(p.dueDate),
      kind: 'deadline',
    }))
  return [...docItems, ...deadlineItems].sort((a, b) => daysUntil(a.date) - daysUntil(b.date))
}

const CATEGORY_LABEL: Record<string, string> = { personal: 'Personal', business: 'Business', tax: 'Tax & Regulatory', financial: 'Financial' }

export function DocumentVault() {
  const { clients, clientDocuments, filingPeriods, obligationTypes, documentTypes, matters } = useData()
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [query, setQuery] = useState('')
  const [businessFilter, setBusinessFilter] = useState('all')
  const [category, setCategory] = useState('all')
  const [urgency, setUrgency] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<ClientDocument | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const items = useMemo(
    () => buildItems(clientDocuments, filingPeriods, obligationTypes, documentTypes),
    [clientDocuments, filingPeriods, obligationTypes, documentTypes],
  )

  const filtered = useMemo(() => {
    return items
      .filter((i) => (businessFilter === 'all' ? true : i.clientId === businessFilter))
      .filter((i) => (category === 'all' ? true : i.category === category))
      .filter((i) => (urgency === 'all' ? true : i.urgency === urgency))
      .filter((i) => {
        const client = clients.find((c) => c.id === i.clientId)
        return (i.label + ' ' + (client?.name ?? '') + ' ' + (client?.businessName ?? '')).toLowerCase().includes(query.toLowerCase())
      })
  }, [items, businessFilter, category, urgency, clients, query])

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">Document Renewals</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Track trade licenses, visas, permits, and expiring documents across all clients.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-ink-200 p-1 dark:border-ink-700">
            <button
              onClick={() => setView('list')}
              className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium', view === 'list' ? 'bg-accent-600 text-white' : 'text-ink-500')}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
            <button
              onClick={() => setView('calendar')}
              className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium', view === 'calendar' ? 'bg-accent-600 text-white' : 'text-ink-500')}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Calendar
            </button>
          </div>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
            Add Document
          </Button>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input placeholder="Search documents, businesses or clients…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select className="sm:w-56" value={businessFilter} onChange={(e) => setBusinessFilter(e.target.value)}>
            <option value="all">All businesses ({clients.length})</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.businessName ? `${c.businessName} (${c.name})` : c.name}
              </option>
            ))}
          </Select>
          <Select className="sm:w-48" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Select className="sm:w-44" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="ok">Valid</option>
            <option value="warning">Expiring soon</option>
            <option value="danger">Expired / overdue</option>
          </Select>
          <Select className="sm:w-36" value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))}>
            <option value="5">5 / page</option>
            <option value="10">10 / page</option>
            <option value="25">25 / page</option>
            <option value="50">50 / page</option>
          </Select>
        </div>
      </Card>

      {view === 'list' ? (
        filtered.length === 0 ? (
          <EmptyState icon={<FolderClock className="h-5 w-5" />} title="Nothing matches" description="Adjust filters to see documents and deadlines." />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800">
                    <th className="px-5 py-3 font-medium">Item</th>
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="px-5 py-3 font-medium">Category</th>
                    <th className="px-5 py-3 font-medium">Matter</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item) => {
                    const client = clients.find((c) => c.id === item.clientId)
                    const linkedMatter = item.matterId ? matters.find((m) => m.id === item.matterId) : undefined
                    const days = daysUntil(item.date)
                    return (
                      <tr key={item.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/70 dark:border-ink-800/60 dark:hover:bg-ink-800/40">
                        <td className="px-5 py-3.5 font-medium text-ink-800 dark:text-ink-100">
                          {item.label}
                          <Badge tone="neutral" className="ml-2 align-middle">
                            {item.kind === 'deadline' ? 'Filing' : 'Document'}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          {client && (
                            <Link to={`/clients/${client.id}?tab=documents`} className="flex items-center gap-2.5 hover:text-accent-600">
                              <Avatar name={client.name} color={client.avatarColor} size="sm" />
                              <div className="min-w-0">
                                <p className="font-medium text-ink-800 dark:text-ink-200 truncate">{client.businessName || client.name}</p>
                                {client.businessName && (
                                  <p className="text-xs text-ink-400 truncate">{client.name}</p>
                                )}
                              </div>
                            </Link>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-ink-500 dark:text-ink-400">{CATEGORY_LABEL[item.category]}</td>
                        <td className="px-5 py-3.5">
                          {linkedMatter ? (
                            <Link to={`/matters/${linkedMatter.id}`} className="text-accent-600 hover:underline">
                              {linkedMatter.title}
                            </Link>
                          ) : (
                            <span className="text-ink-300 dark:text-ink-600">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <UrgencyBadge urgency={item.urgency} label={days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {item.kind === 'document' ? (
                            <button
                              onClick={() => {
                                const doc = clientDocuments.find((d) => d.id === item.id)
                                if (doc) setPreviewDoc(doc)
                              }}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-accent-600 hover:bg-accent-50 dark:hover:bg-accent-900/20"
                            >
                              <Eye className="h-3.5 w-3.5" /> Preview
                            </button>
                          ) : (
                            <span className="text-ink-300 dark:text-ink-600">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setPage}
              itemLabel="items"
            />
          </Card>
        )
      ) : (
        <CalendarView items={filtered} />
      )}

      <NewDocumentModal open={addOpen} onClose={() => setAddOpen(false)} />
      <DocumentPreviewModal open={!!previewDoc} onClose={() => setPreviewDoc(null)} document={previewDoc} />
    </div>
  )
}

/**
 * Month calendar over the unified list.
 *
 * Navigable rather than fixed: it was hardcoded to July 2026, which meant a
 * quarterly filing due 30 November — or any document expiring outside that one
 * month — was invisible on the very view whose job is to show when things land.
 */
function CalendarView({ items }: { items: UnifiedItem[] }) {
  const today = todayIso()
  // Opens on the real month, and remembers where the user navigated to.
  const [cursor, setCursor] = useState(() => today.slice(0, 7))
  const [year, month] = [Number(cursor.slice(0, 4)), Number(cursor.slice(5, 7)) - 1]

  const startOffset = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: startOffset + daysInMonth }, (_, i) => {
    const dayNum = i - startOffset + 1
    return dayNum > 0 ? dayNum : null
  })

  function shiftMonth(by: number) {
    const d = new Date(year, month + by, 1)
    setCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  function isoFor(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function itemsOnDay(day: number) {
    return items.filter((i) => i.date === isoFor(day))
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  // Counting the whole month tells the user whether an empty-looking grid means
  // "nothing due" or "you have navigated past the data".
  const inMonth = items.filter((i) => i.date.startsWith(cursor)).length

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">{monthLabel}</p>
        <Badge tone="neutral" size="sm">
          {inMonth} due
        </Badge>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-700 dark:hover:text-ink-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCursor(today.slice(0, 7))}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:text-ink-400 dark:hover:bg-ink-700"
          >
            Today
          </button>
          <button
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-700 dark:hover:text-ink-200"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-ink-400">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {cells.map((day, i) => {
          const dayItems = day ? itemsOnDay(day) : []
          const isToday = day !== null && isoFor(day) === today
          return (
            <div
              key={i}
              className={cn(
                'min-h-20 rounded-lg border p-1.5 text-left align-top',
                day ? 'border-ink-100 dark:border-ink-800' : 'border-transparent',
                isToday && 'border-accent-400 bg-accent-50 dark:bg-accent-900/20',
              )}
            >
              {day && (
                <>
                  <p className={cn('text-xs font-medium', isToday ? 'text-accent-700 dark:text-accent-400' : 'text-ink-400')}>{day}</p>
                  <div className="mt-1 flex flex-col gap-1">
                    {dayItems.slice(0, 2).map((it) => (
                      <span
                        key={it.id}
                        className={cn(
                          'truncate rounded px-1 py-0.5 text-[10px] font-medium',
                          it.urgency === 'critical' && 'bg-danger-600 text-white',
                          it.urgency === 'danger' && 'bg-danger-100 text-danger-700 dark:bg-danger-500/20 dark:text-danger-400',
                          it.urgency === 'warning' && 'bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-400',
                          it.urgency === 'ok' && 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-400',
                        )}
                      >
                        {it.label}
                      </span>
                    ))}
                    {dayItems.length > 2 && <span className="text-[10px] text-ink-400">+{dayItems.length - 2} more</span>}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
