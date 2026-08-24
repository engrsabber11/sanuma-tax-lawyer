import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, Briefcase, Search, AlertTriangle, LayoutGrid, List as ListIcon, ArrowUpDown, Check, X } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Field'
import { NewMatterModal } from '../../components/modals/NewMatterModal'
import { Pagination } from '../../components/ui/Pagination'
import { useData } from '../../data/store'
import { flattenServices, serviceLabel } from '../../data/serviceTree'
import { useToast } from '../../lib/toast'
import type { Matter, MatterStatus } from '../../data/types'
import { cn, daysUntil, formatDate, sleep, urgencyFromDays } from '../../lib/utils'

const columns: { id: MatterStatus; label: string }[] = [
  { id: 'intake', label: 'Intake' },
  { id: 'documents-collected', label: 'Documents Collected' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'submitted', label: 'Submitted to Authority' },
  { id: 'completed', label: 'Completed' },
]

const STATUS_LABEL: Record<MatterStatus, string> = {
  intake: 'Intake',
  'documents-collected': 'Documents Collected',
  'in-progress': 'In Progress',
  submitted: 'Submitted to Authority',
  completed: 'Completed',
}

type SortKey = 'title' | 'client' | 'service' | 'status' | 'dueDate' | 'progress'

export function MattersList() {
  const { clients, matters, services, updateMatter } = useData()
  const { show } = useToast()
  const navigate = useNavigate()
  const [newOpen, setNewOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [clientFilter, setClientFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [view, setView] = useState<'kanban' | 'list'>('list')
  const [sortKey, setSortKey] = useState<SortKey>('dueDate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<MatterStatus>('in-progress')
  const [applyingBulk, setApplyingBulk] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filteredMatters = useMemo(() => {
    return matters.filter((m) => {
      if (clientFilter !== 'all' && m.clientId !== clientFilter) return false
      if (serviceFilter !== 'all' && m.serviceId !== serviceFilter) return false
      if (overdueOnly) {
        const days = m.dueDate ? daysUntil(m.dueDate) : null
        if (days === null || days >= 0 || m.status === 'completed') return false
      }
      if (query) {
        const client = clients.find((c) => c.id === m.clientId)
        const haystack = (m.title + (client?.name ?? '') + (client?.businessName ?? '')).toLowerCase()
        if (!haystack.includes(query.toLowerCase())) return false
      }
      return true
    })
  }, [matters, clients, clientFilter, serviceFilter, overdueOnly, query])

  function sortValue(m: Matter, key: SortKey): string | number {
    switch (key) {
      case 'title':
        return m.title.toLowerCase()
      case 'client':
        return clients.find((c) => c.id === m.clientId)?.name.toLowerCase() ?? ''
      case 'service':
        return services.find((s) => s.id === m.serviceId)?.name.toLowerCase() ?? ''
      case 'status':
        return columns.findIndex((c) => c.id === m.status)
      case 'dueDate':
        return m.dueDate ? daysUntil(m.dueDate) : Infinity
      case 'progress':
        return m.checklist.length ? m.checklist.filter((c) => c.done).length / m.checklist.length : -1
    }
  }

  const sortedMatters = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filteredMatters].sort((a, b) => {
      const av = sortValue(a, sortKey)
      const bv = sortValue(b, sortKey)
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredMatters, sortKey, sortDir, clients, services])

  const paginatedMatters = useMemo(() => {
    const start = (page - 1) * pageSize
    return sortedMatters.slice(start, start + pageSize)
  }, [sortedMatters, page, pageSize])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.size === sortedMatters.length ? new Set() : new Set(sortedMatters.map((m) => m.id))))
  }

  function switchView(next: 'kanban' | 'list') {
    setView(next)
    setSelectedIds(new Set())
  }

  async function applyBulkStatus() {
    setApplyingBulk(true)
    await sleep(400 + Math.random() * 200)
    selectedIds.forEach((id) => updateMatter(id, { status: bulkStatus }))
    show(`${selectedIds.size} matter${selectedIds.size > 1 ? 's' : ''} moved to ${STATUS_LABEL[bulkStatus]}`)
    setSelectedIds(new Set())
    setApplyingBulk(false)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">Matters</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Every client engagement, tracked from intake to completion.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-ink-200 p-1 dark:border-ink-700">
            <button
              onClick={() => switchView('list')}
              className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium', view === 'list' ? 'bg-accent-600 text-white' : 'text-ink-500')}
            >
              <ListIcon className="h-3.5 w-3.5" /> List
            </button>
            <button
              onClick={() => switchView('kanban')}
              className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium', view === 'kanban' ? 'bg-accent-600 text-white' : 'text-ink-500')}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </button>
          </div>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setNewOpen(true)}>
            New Matter
          </Button>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input placeholder="Search matters or clients…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select className="lg:w-60" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
            <option value="all">All businesses &amp; clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.businessName ? `${c.businessName} (${c.name})` : c.name}
              </option>
            ))}
          </Select>
          <Select className="lg:w-56" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
            <option value="all">All services</option>
            {flattenServices(services).map(({ service: s }) => (
              <option key={s.id} value={s.id}>
                {serviceLabel(s, services)}
              </option>
            ))}
          </Select>
          <Select className="lg:w-36" value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))}>
            <option value="5">5 / page</option>
            <option value="10">10 / page</option>
            <option value="25">25 / page</option>
            <option value="50">50 / page</option>
          </Select>
          <button
            onClick={() => setOverdueOnly((v) => !v)}
            className={cn(
              'flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3.5 text-sm font-medium transition-colors',
              overdueOnly ? 'border-danger-500 bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-400' : 'border-ink-200 text-ink-500 dark:border-ink-700',
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Overdue only
          </button>
        </div>
      </Card>

      {view === 'kanban' ? (
        <div className="grid grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-2 xl:grid-cols-5 xl:gap-3">
          {columns.map((col) => {
            const columnMatters = filteredMatters
              .filter((m) => m.status === col.id)
              .slice()
              .sort((a, b) => {
                const aDays = a.dueDate ? daysUntil(a.dueDate) : Infinity
                const bDays = b.dueDate ? daysUntil(b.dueDate) : Infinity
                return aDays - bDays
              })
            const isCompletedColumn = col.id === 'completed'
            const items = isCompletedColumn
              ? columnMatters.filter((m) => !m.completedAt || daysUntil(m.completedAt) >= -30)
              : columnMatters
            const archivedCount = columnMatters.length - items.length
            return (
              <div key={col.id} className="flex min-w-0 flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{col.label}</p>
                  <Badge tone="neutral">{items.length}</Badge>
                </div>
                <div className="flex flex-col gap-2.5">
                  {items.length === 0 && (
                    <div className="rounded-xl border border-dashed border-ink-200 py-8 text-center text-xs text-ink-300 dark:border-ink-700">
                      No matters
                    </div>
                  )}
                  {items.map((m) => {
                    const client = clients.find((c) => c.id === m.clientId)
                    const service = services.find((s) => s.id === m.serviceId)
                    const days = m.dueDate ? daysUntil(m.dueDate) : null
                    const urgency = days !== null ? urgencyFromDays(days) : 'ok'
                    const doneCount = m.checklist.filter((c) => c.done).length
                    return (
                      <Link key={m.id} to={`/matters/${m.id}`}>
                        <Card className="p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]">
                          <p className="text-sm font-medium leading-snug text-ink-800 dark:text-ink-100">{m.title}</p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-400">
                            {!m.clientInitiated && (
                              <span title="Firm-initiated — penalty fee applied" className="flex shrink-0">
                                <AlertTriangle className="h-3 w-3 text-warning-600" />
                              </span>
                            )}
                            {serviceLabel(service, services)}
                          </p>
                          {m.checklist.length > 0 && (
                            <div className="mt-2.5 flex items-center gap-2">
                              <div className="h-1.5 flex-1 rounded-full bg-ink-100 dark:bg-ink-800">
                                <div
                                  className="h-1.5 rounded-full bg-accent-500 transition-all"
                                  style={{ width: `${(doneCount / m.checklist.length) * 100}%` }}
                                />
                              </div>
                              <span className="shrink-0 text-[11px] text-ink-400">
                                {doneCount}/{m.checklist.length}
                              </span>
                            </div>
                          )}
                          <div className="mt-3 flex items-center justify-between gap-2">
                            {client && (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Avatar name={client.name} color={client.avatarColor} size="xs" />
                                <div className="min-w-0 truncate">
                                  <span className="truncate text-xs font-medium text-ink-700 dark:text-ink-300 block">
                                    {client.businessName || client.name}
                                  </span>
                                  {client.businessName && (
                                    <span className="text-[10px] text-ink-400 block truncate">{client.name}</span>
                                  )}
                                </div>
                              </div>
                            )}
                            {m.dueDate && (
                              <Badge tone={m.status === 'completed' ? 'success' : urgency === 'critical' ? 'critical' : urgency === 'danger' ? 'danger' : urgency === 'warning' ? 'warning' : 'neutral'}>
                                {formatDate(m.dueDate)}
                              </Badge>
                            )}
                          </div>
                        </Card>
                      </Link>
                    )
                  })}
                  {archivedCount > 0 && (
                    <button
                      onClick={() => switchView('list')}
                      className="rounded-lg border border-dashed border-ink-200 py-2.5 text-center text-xs text-ink-400 transition-colors hover:border-accent-300 hover:text-accent-600 dark:border-ink-700"
                    >
                      +{archivedCount} completed over 30 days ago — View in List
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        filteredMatters.length > 0 && (
          <>
            {selectedIds.size > 0 && (
              <Card className="flex flex-wrap items-center gap-3 p-3.5">
                <Badge tone="accent">{selectedIds.size} selected</Badge>
                <span className="text-sm text-ink-500 dark:text-ink-400">Move to</span>
                <Select className="w-56" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as MatterStatus)}>
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
                <Button size="sm" onClick={applyBulkStatus} loading={applyingBulk}>
                  Apply
                </Button>
                <Button size="sm" variant="ghost" icon={<X className="h-3.5 w-3.5" />} onClick={() => setSelectedIds(new Set())} disabled={applyingBulk}>
                  Clear selection
                </Button>
              </Card>
            )}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800">
                      <th className="px-5 py-3 font-medium">
                        <button
                          onClick={toggleSelectAll}
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded-md border transition-colors',
                            selectedIds.size > 0 && selectedIds.size === sortedMatters.length
                              ? 'border-accent-600 bg-accent-600 text-white'
                              : 'border-ink-300 dark:border-ink-600',
                          )}
                        >
                          {selectedIds.size > 0 && selectedIds.size === sortedMatters.length && <Check className="h-3.5 w-3.5" />}
                        </button>
                      </th>
                      {([
                        ['title', 'Matter'],
                        ['client', 'Client'],
                        ['service', 'Service'],
                        ['status', 'Status'],
                        ['progress', 'Checklist'],
                        ['dueDate', 'Due Date'],
                      ] as [SortKey, string][]).map(([key, label]) => (
                        <th key={key} className="px-5 py-3 font-medium">
                          <button onClick={() => toggleSort(key)} className="flex items-center gap-1 hover:text-ink-700 dark:hover:text-ink-200">
                            {label}
                            <ArrowUpDown className={cn('h-3 w-3', sortKey === key ? 'text-accent-600' : 'text-ink-300')} />
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMatters.map((m) => {
                      const client = clients.find((c) => c.id === m.clientId)
                      const service = services.find((s) => s.id === m.serviceId)
                      const days = m.dueDate ? daysUntil(m.dueDate) : null
                      const urgency = days !== null ? urgencyFromDays(days) : 'ok'
                      const doneCount = m.checklist.filter((c) => c.done).length
                      const selected = selectedIds.has(m.id)
                      return (
                        <tr
                          key={m.id}
                          onClick={() => navigate(`/matters/${m.id}`)}
                          className={cn(
                            'cursor-pointer border-b border-ink-50 last:border-0 hover:bg-ink-50/70 dark:border-ink-800/60 dark:hover:bg-ink-800/40',
                            selected && 'bg-accent-50/60 dark:bg-accent-900/10',
                          )}
                        >
                          <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleSelect(m.id)}
                              className={cn(
                                'flex h-5 w-5 items-center justify-center rounded-md border transition-colors',
                                selected ? 'border-accent-600 bg-accent-600 text-white' : 'border-ink-300 dark:border-ink-600',
                              )}
                            >
                              {selected && <Check className="h-3.5 w-3.5" />}
                            </button>
                          </td>
                          <td className="px-5 py-3.5 font-medium text-ink-800 dark:text-ink-100">
                            <span className="flex items-center gap-2">
                              {m.title}
                              {!m.clientInitiated && (
                                <Badge tone="warning">
                                  <AlertTriangle className="h-3 w-3" /> Firm-initiated
                                </Badge>
                              )}
                            </span>
                          </td>
                        <td className="px-5 py-3.5">
                          {client && (
                            <div className="flex items-center gap-2.5">
                              <Avatar name={client.name} color={client.avatarColor} size="sm" />
                              <div className="min-w-0">
                                <p className="font-medium text-ink-800 dark:text-ink-200">
                                  {client.businessName || client.name}
                                </p>
                                {client.businessName && (
                                  <p className="text-xs text-ink-400">{client.name}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-ink-500 dark:text-ink-400">{serviceLabel(service, services)}</td>
                        <td className="px-5 py-3.5">
                          <Badge tone="accent">{STATUS_LABEL[m.status]}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-ink-500 dark:text-ink-400">
                          {m.checklist.length > 0 ? `${doneCount}/${m.checklist.length}` : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          {m.dueDate ? (
                            <Badge tone={m.status === 'completed' ? 'success' : urgency === 'critical' ? 'critical' : urgency === 'danger' ? 'danger' : urgency === 'warning' ? 'warning' : 'neutral'}>
                              {formatDate(m.dueDate)}
                            </Badge>
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
                totalItems={sortedMatters.length}
                onPageChange={setPage}
                itemLabel="matters"
              />
            </Card>
          </>
        )
      )}

      {matters.length === 0 && (
        <Card className="p-14 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-ink-300" />
          <p className="mt-3 font-medium text-ink-700 dark:text-ink-200">No matters yet</p>
        </Card>
      )}
      {matters.length > 0 && filteredMatters.length === 0 && (
        <Card className="p-14 text-center">
          <Search className="mx-auto h-8 w-8 text-ink-300" />
          <p className="mt-3 font-medium text-ink-700 dark:text-ink-200">No matters match your filters</p>
        </Card>
      )}

      <NewMatterModal open={newOpen} onClose={() => setNewOpen(false)} onCreated={(m) => navigate(`/matters/${m.id}`)} />
    </div>
  )
}
