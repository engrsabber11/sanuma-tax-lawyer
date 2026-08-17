import { useMemo, useState } from 'react'
import { Plus, Wallet } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import { StatCard } from '../../components/ui/StatCard'
import { NewExpenseModal } from '../../components/modals/NewExpenseModal'
import { useData } from '../../data/store'
import { formatAED, formatDate } from '../../lib/utils'

export function ExpensesPage() {
  const { expenses, clients } = useData()
  const [filter, setFilter] = useState<'all' | 'general' | 'disbursement'>('all')
  const [addOpen, setAddOpen] = useState(false)

  const rows = expenses.filter((e) => (filter === 'all' ? true : filter === 'disbursement' ? e.isDisbursement : !e.isDisbursement))

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
          <Select className="w-48" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="all">All expenses</option>
            <option value="general">General expenses</option>
            <option value="disbursement">Client disbursements</option>
          </Select>
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
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const client = clients.find((c) => c.id === e.clientId)
                  return (
                    <tr key={e.id} className="border-b border-ink-50 last:border-0 dark:border-ink-800/60">
                      <td className="py-3 font-medium text-ink-800 dark:text-ink-100">{e.description}</td>
                      <td className="py-3 text-ink-500 dark:text-ink-400">{e.category}</td>
                      <td className="py-3 text-ink-500 dark:text-ink-400">{client?.name ?? '—'}</td>
                      <td className="py-3 text-ink-500 dark:text-ink-400">{formatDate(e.date)}</td>
                      <td className="py-3 font-medium text-ink-700 dark:text-ink-200">{formatAED(e.amount)}</td>
                      <td className="py-3">
                        {e.isDisbursement ? (
                          <Badge tone={e.billed ? 'success' : 'warning'}>{e.billed ? 'Billed to client' : 'Awaiting invoice'}</Badge>
                        ) : (
                          <Badge tone="neutral">Firm expense</Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <NewExpenseModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
