import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, List, Plus, Search, FolderClock } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge, UrgencyBadge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Field'
import { EmptyState } from '../../components/ui/EmptyState'
import { NewDocumentModal } from '../../components/modals/NewDocumentModal'
import { cn, daysUntil, formatDate, urgencyFromDate, type Urgency } from '../../lib/utils'
import { useData } from '../../data/store'
import type { ClientDocument, ComplianceDeadline, DocumentTypeDef } from '../../data/types'

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

function buildItems(clientDocuments: ClientDocument[], complianceDeadlines: ComplianceDeadline[], documentTypes: DocumentTypeDef[]): UnifiedItem[] {
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
  const deadlineItems: UnifiedItem[] = complianceDeadlines.map((d) => ({
    id: d.id,
    clientId: d.clientId,
    label: d.name,
    category: 'tax',
    date: d.nextDueDate,
    urgency: urgencyFromDate(d.nextDueDate),
    kind: 'deadline',
  }))
  return [...docItems, ...deadlineItems].sort((a, b) => daysUntil(a.date) - daysUntil(b.date))
}

const CATEGORY_LABEL: Record<string, string> = { personal: 'Personal', business: 'Business', tax: 'Tax & Regulatory', financial: 'Financial' }

export function DocumentVault() {
  const { clients, clientDocuments, complianceDeadlines, documentTypes, matters } = useData()
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [urgency, setUrgency] = useState('all')
  const [addOpen, setAddOpen] = useState(false)

  const items = useMemo(
    () => buildItems(clientDocuments, complianceDeadlines, documentTypes),
    [clientDocuments, complianceDeadlines, documentTypes],
  )

  const filtered = items
    .filter((i) => (category === 'all' ? true : i.category === category))
    .filter((i) => (urgency === 'all' ? true : i.urgency === urgency))
    .filter((i) => {
      const client = clients.find((c) => c.id === i.clientId)
      return (i.label + (client?.name ?? '') + (client?.businessName ?? '')).toLowerCase().includes(query.toLowerCase())
    })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">Document Vault &amp; Compliance</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Every document and filing deadline, across every client.</p>
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
            <Input placeholder="Search documents or clients…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select className="sm:w-52" value={category} onChange={(e) => setCategory(e.target.value)}>
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
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
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
                              <span className="text-ink-700 dark:text-ink-200">{client.name}</span>
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
                        <td className="px-5 py-3.5 text-ink-500 dark:text-ink-400">{formatDate(item.date)}</td>
                        <td className="px-5 py-3.5">
                          <UrgencyBadge urgency={item.urgency} label={days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : (
        <CalendarView items={filtered} />
      )}

      <NewDocumentModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

function CalendarView({ items }: { items: UnifiedItem[] }) {
  const year = 2026
  const month = 6 // July (0-indexed)
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: startOffset + daysInMonth }, (_, i) => {
    const dayNum = i - startOffset + 1
    return dayNum > 0 ? dayNum : null
  })

  function itemsOnDay(day: number) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return items.filter((i) => i.date === iso)
  }

  return (
    <Card className="p-5">
      <p className="mb-4 text-sm font-semibold text-ink-800 dark:text-ink-100">July 2026</p>
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-ink-400">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {cells.map((day, i) => {
          const dayItems = day ? itemsOnDay(day) : []
          const isToday = day === 21
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
