import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Download } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Tabs } from '../../components/ui/Tabs'
import { StatCard } from '../../components/ui/StatCard'
import { useData } from '../../data/store'
import { formatAED, formatDate } from '../../lib/utils'
import { TrendingUp, TrendingDown, Scale, Receipt } from 'lucide-react'

const PALETTE = ['#279a90', '#f59e0b', '#728079', '#43b6ac', '#dc2626', '#a8e7e1']

export function AccountingPage() {
  const { ledgerEntries, expenses, invoices } = useData()
  const [tab, setTab] = useState('ledger')

  const totalRevenue = ledgerEntries.filter((l) => l.account === 'Service Revenue').reduce((s, l) => s + l.credit, 0)
  const totalExpense = ledgerEntries.filter((l) => l.debit > 0 && l.account !== 'Disbursements Receivable').reduce((s, l) => s + l.debit, 0)
  const net = totalRevenue - totalExpense

  const receivables = invoices
    .filter((i) => i.status !== 'paid')
    .map((i) => {
      const subtotal = i.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0) * 1.05
      return { ...i, balance: subtotal - i.paidAmount }
    })

  const vatCollected = invoices.reduce((s, i) => s + i.lines.reduce((ss, l) => ss + l.qty * l.unitPrice, 0) * 0.05, 0)
  const vatOnExpenses = expenses.reduce((s, e) => s + e.amount * 0.05, 0)

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>()
    expenses.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount))
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [expenses])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">Accounting</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Ledger and reports, auto-populated from Sales, Credit Notes, Expenses &amp; Wallet activity.</p>
        </div>
        <Button variant="secondary" icon={<Download className="h-4 w-4" />}>
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Revenue (recorded)" value={formatAED(totalRevenue)} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
        <StatCard label="Expenses (recorded)" value={formatAED(totalExpense)} icon={<TrendingDown className="h-5 w-5" />} tone="danger" />
        <StatCard label="Net Profit" value={formatAED(net)} icon={<Scale className="h-5 w-5" />} />
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'ledger', label: 'Ledger' },
          { id: 'pnl', label: 'Profit & Loss' },
          { id: 'receivables', label: 'Receivables', count: receivables.length },
          { id: 'vat', label: 'VAT Summary' },
          { id: 'expenses', label: 'Expense Breakdown' },
        ]}
      />

      {tab === 'ledger' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Account</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 text-right font-medium">Debit</th>
                  <th className="px-5 py-3 text-right font-medium">Credit</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((l) => (
                  <tr key={l.id} className="border-b border-ink-50 last:border-0 dark:border-ink-800/60">
                    <td className="px-5 py-3 text-ink-500 dark:text-ink-400">{formatDate(l.date)}</td>
                    <td className="px-5 py-3 font-medium text-ink-800 dark:text-ink-100">{l.account}</td>
                    <td className="px-5 py-3 text-ink-500 dark:text-ink-400">{l.description}</td>
                    <td className="px-5 py-3 text-right text-danger-600">{l.debit > 0 ? formatAED(l.debit) : ''}</td>
                    <td className="px-5 py-3 text-right text-success-600">{l.credit > 0 ? formatAED(l.credit) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'pnl' && (
        <Card>
          <CardHeader>
            <CardTitle>Profit &amp; Loss — July 2026</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col divide-y divide-ink-100 pt-2 dark:divide-ink-800">
            <div className="flex justify-between py-2.5 text-sm">
              <span className="text-ink-500 dark:text-ink-400">Service Revenue</span>
              <span className="font-medium text-ink-800 dark:text-ink-100">{formatAED(totalRevenue)}</span>
            </div>
            <div className="flex justify-between py-2.5 text-sm">
              <span className="text-ink-500 dark:text-ink-400">Operating Expenses</span>
              <span className="font-medium text-danger-600">-{formatAED(totalExpense)}</span>
            </div>
            <div className="flex justify-between py-3 text-base font-semibold text-ink-900 dark:text-ink-50">
              <span>Net Profit</span>
              <span>{formatAED(net)}</span>
            </div>
          </CardBody>
        </Card>
      )}

      {tab === 'receivables' && (
        <Card>
          <CardBody className="flex flex-col gap-1 pt-5">
            {receivables.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5">
                <Receipt className="h-4 w-4 text-ink-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{r.number}</p>
                  <p className="text-xs text-ink-400">Due {formatDate(r.dueDate)}</p>
                </div>
                <Badge tone={r.status === 'overdue' ? 'danger' : 'warning'}>{r.status}</Badge>
                <span className="w-24 text-right font-medium text-ink-700 dark:text-ink-200">{formatAED(r.balance)}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {tab === 'vat' && (
        <Card>
          <CardHeader>
            <CardTitle>VAT Return Prep Summary — Q2/Q3 2026</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col divide-y divide-ink-100 pt-2 dark:divide-ink-800">
            <div className="flex justify-between py-2.5 text-sm">
              <span className="text-ink-500 dark:text-ink-400">Output VAT (collected on sales)</span>
              <span className="font-medium text-ink-800 dark:text-ink-100">{formatAED(vatCollected)}</span>
            </div>
            <div className="flex justify-between py-2.5 text-sm">
              <span className="text-ink-500 dark:text-ink-400">Input VAT (paid on expenses)</span>
              <span className="font-medium text-ink-800 dark:text-ink-100">{formatAED(vatOnExpenses)}</span>
            </div>
            <div className="flex justify-between py-3 text-base font-semibold text-ink-900 dark:text-ink-50">
              <span>Net VAT Payable to FTA</span>
              <span>{formatAED(vatCollected - vatOnExpenses)}</span>
            </div>
          </CardBody>
        </Card>
      )}

      {tab === 'expenses' && (
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown by Category</CardTitle>
          </CardHeader>
          <CardBody className="pt-2">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={expenseByCategory} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {expenseByCategory.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatAED(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
