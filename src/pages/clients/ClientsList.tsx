import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Users } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Field'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { useData } from '../../data/store'
import type { BusinessType } from '../../data/types'
import { daysUntil, formatAED, urgencyFromDate } from '../../lib/utils'
import { invoiceBalanceDue } from '../../lib/invoice'

const businessTypeLabel: Record<BusinessType, string> = {
  grocery: 'Grocery / Retail',
  trading: 'Trading',
  'f&b': 'F&B',
  services: 'Services',
  other: 'Other',
}

export function ClientsList() {
  const { clients, clientDocuments, invoices } = useData()
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | BusinessType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'onboarding' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const rows = useMemo(() => {
    return clients
      .filter((c) => (typeFilter === 'all' ? true : c.businessType === typeFilter))
      .filter((c) => (statusFilter === 'all' ? true : c.status === statusFilter))
      .filter((c) => (c.name + ' ' + (c.businessName ?? '')).toLowerCase().includes(query.toLowerCase()))
      .map((c) => {
        const docs = clientDocuments.filter((d) => d.clientId === c.id)
        const urgentCount = docs.filter((d) => urgencyFromDate(d.expiryDate) !== 'ok').length
        const clientInvoices = invoices.filter((i) => i.clientId === c.id)
        const outstanding = clientInvoices.reduce((sum, i) => sum + invoiceBalanceDue(i), 0)
        const referrer = clients.find((r) => r.id === c.referredById)
        const subReferrer = clients.find((r) => r.id === c.subReferredById)
        const nextUrgent = docs
          .map((d) => ({ ...d, days: daysUntil(d.expiryDate) }))
          .sort((a, b) => a.days - b.days)[0]
        return { client: c, urgentCount, outstanding, referrer, subReferrer, nextUrgent }
      })
  }, [query, typeFilter, statusFilter, clients, clientDocuments, invoices])

  useEffect(() => {
    setPage(1)
  }, [query, typeFilter, statusFilter, pageSize])

  const startIndex = (page - 1) * pageSize
  const paginatedRows = rows.slice(startIndex, startIndex + pageSize)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">Clients</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{clients.length} clients on file</p>
        </div>
        <Link to="/clients/new">
          <Button icon={<Plus className="h-4 w-4" />}>Add Client</Button>
        </Link>
      </div>

      <Card className="p-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input placeholder="Search by name or business…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select className="sm:w-52" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}>
            <option value="all">All business types</option>
            {Object.entries(businessTypeLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Select className="sm:w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="onboarding">Onboarding</option>
            <option value="inactive">Inactive</option>
          </Select>
          <Select className="sm:w-36" value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))}>
            <option value="5">5 / page</option>
            <option value="10">10 / page</option>
            <option value="25">25 / page</option>
            <option value="50">50 / page</option>
          </Select>
        </div>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="No clients match your filters"
          description="Try clearing the search or filters, or add a new client to get started."
          action={
            <Link to="/clients/new">
              <Button size="sm">Add Client</Button>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800">
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Referred by</th>
                  <th className="px-5 py-3 font-medium">Compliance</th>
                  <th className="px-5 py-3 font-medium">Outstanding</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map(({ client, urgentCount, outstanding, referrer, subReferrer }) => (
                  <tr key={client.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/70 dark:border-ink-800/60 dark:hover:bg-ink-800/40">
                    <td className="px-5 py-3.5">
                      <Link to={`/clients/${client.id}`} className="flex items-center gap-3">
                        <Avatar name={client.name} color={client.avatarColor} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink-800 dark:text-ink-100">{client.name}</p>
                          <p className="truncate text-xs text-ink-400">{client.businessName ?? businessTypeLabel[client.businessType]}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-ink-500 dark:text-ink-400">
                      {referrer ? (
                        <div className="flex flex-col gap-0.5">
                          <Link to={`/clients/${referrer.id}`} className="font-medium text-ink-800 dark:text-ink-200 hover:text-accent-600 hover:underline">
                            {referrer.name}
                          </Link>
                          {subReferrer && (
                            <span className="text-[11px] text-ink-400">
                              Sub: <Link to={`/clients/${subReferrer.id}`} className="text-ink-600 dark:text-ink-300 hover:underline">{subReferrer.name}</Link>
                            </span>
                          )}
                        </div>
                      ) : subReferrer ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-ink-400">Direct</span>
                          <span className="text-[11px] text-ink-400">
                            Sub: <Link to={`/clients/${subReferrer.id}`} className="text-ink-600 dark:text-ink-300 hover:underline">{subReferrer.name}</Link>
                          </span>
                        </div>
                      ) : (
                        <span className="text-ink-300 dark:text-ink-600">— direct —</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {urgentCount > 0 ? (
                        <Badge tone="warning" dot>
                          {urgentCount} item{urgentCount > 1 ? 's' : ''} need attention
                        </Badge>
                      ) : (
                        <Badge tone="success" dot>
                          All clear
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-ink-700 dark:text-ink-200">
                      {outstanding > 0 ? formatAED(outstanding) : <span className="text-ink-300 dark:text-ink-600">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={client.status === 'active' ? 'success' : client.status === 'onboarding' ? 'accent' : 'neutral'}>
                        {client.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={rows.length}
            onPageChange={setPage}
            itemLabel="clients"
          />
        </Card>
      )}
    </div>
  )
}
