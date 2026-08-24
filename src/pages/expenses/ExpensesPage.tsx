import { useMemo, useState } from 'react'
import { Plus, Wallet, Pencil } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import { StatCard } from '../../components/ui/StatCard'
import { Pagination } from '../../components/ui/Pagination'
import { NewExpenseModal } from '../../components/modals/NewExpenseModal'
import { useData } from '../../data/store'
import { formatAED, formatDate } from '../../lib/utils'
import type { Expense } from '../../data/types'

export function ExpensesPage() {
  const { expenses, clients } = useData()
  const [filter, setFilter] = useState<'all' | 'general' | 'disbursement'>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const rows = useMemo(() => {
    return expenses.filter((e) => (filter === 'all' ? true : filter === 'disbursement' ? e.isDisbursement : !e.isDisbursement))
  }, [expenses, filter])

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [rows, page, pageSize])

  const totals = useMemo(() => {
    const total = expenses.reduce((s, e) => s + e.amount, 0)
    const disbursements = expenses.filter((e) => e.isDisbursement)
    const unbilled = disbursements.filter((e) => !e.billed).reduce((s, e) => s + e.amount, 0)
    return {
      total,
      disbursementTotal: disbursements.reduce((s, e) => s + e.amount, 0),
      unbilled,
    }
  }, [expenses])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">Expenses &amp; Disbursements</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Firm running costs, plus government fees paid on behalf of clients.</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
          Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="This month's expenses" value={formatAED(totals.total)} icon={<Wallet className="h-5 w-5" />} />
        <StatCard label="Client disbursements" value={formatAED(totals.disbursementTotal)} icon={<Wallet className="h-5 w-5" />} tone="neutral" trend="Fees paid on behalf of clients" />
        <StatCard label="Awaiting re-billing" value={formatAED(totals.unbilled)} icon={<Wallet className="h-5 w-5" />} tone="warning" trend="Not yet added to a client invoice" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Log</CardTitle>
          <div className="flex items-center gap-2">
            <Select
              className="w-48"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as typeof filter)
                setPage(1)
              }}
            >
              <option value="all">All expenses</option>
              <option value="general">General expenses</option>
              <option value="disbursement">Client disbursements</option>
            </Select>
            <Select className="w-36" value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))}>
              <option value="5">5 / page</option>
              <option value="10">10 / page</option>
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
            </Select>
          </div>
        </CardHeader>
        <CardBody className="pt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800">
                  <th className="py-3 font-medium">Description</th>
                  <th className="py-3 font-medium">Category</th>
                  <th className="py-3 font-medium">Client</th>
                  <th className="py-3 font-medium">Date</th>
                  <th className="py-3 font-medium">Amount</th>
                  <th className="py-3 font-medium">Billing</th>
                  <th className="py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((e) => {
                  const client = clients.find((c) => c.id === e.clientId)
                  return (
                    <tr key={e.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/50 dark:border-ink-800/60 dark:hover:bg-ink-800/30">
                      <td className="py-3 font-medium text-ink-800 dark:text-ink-100">{e.description}</td>
                      <td className="py-3 text-ink-500 dark:text-ink-400">{e.category}</td>
                      <td className="py-3 text-ink-500 dark:text-ink-400">
                        {client ? (
                          <div>
                            <span className="font-medium text-ink-800 dark:text-ink-200">{client.businessName || client.name}</span>
                            {client.businessName && <p className="text-xs text-ink-400">{client.name}</p>}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 text-ink-500 dark:text-ink-400">{formatDate(e.date)}</td>
                      <td className="py-3 font-medium text-ink-700 dark:text-ink-200">{formatAED(e.amount)}</td>
                      <td className="py-3">
                        {e.isDisbursement ? (
                          <Badge tone={e.billed ? 'success' : 'warning'}>{e.billed ? 'Billed to client' : 'Awaiting invoice'}</Badge>
                        ) : (
                          <Badge tone="neutral">Firm expense</Badge>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {e.isDisbursement && e.billed ? (
                          <span className="inline-flex items-center gap-1 text-xs text-ink-400 italic">
                            Billed (Locked)
                          </span>
                        ) : (
                          <button
                            onClick={() => setEditingExpense(e)}
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-accent-600 hover:bg-accent-50 dark:hover:bg-accent-900/20"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={rows.length}
          onPageChange={setPage}
          itemLabel="expenses"
        />
      </Card>

      <NewExpenseModal
        open={addOpen || !!editingExpense}
        expense={editingExpense}
        onClose={() => {
          setAddOpen(false)
          setEditingExpense(null)
        }}
      />
    </div>
  )
}
