import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Download, Calendar, Filter } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Select, Input } from '../../components/ui/Field'
import { Tabs } from '../../components/ui/Tabs'
import { StatCard } from '../../components/ui/StatCard'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'
import { formatAED, formatDate } from '../../lib/utils'
import { invoiceBalanceDue } from '../../lib/invoice'
import { TrendingUp, TrendingDown, Scale, Receipt } from 'lucide-react'
import { Pagination } from '../../components/ui/Pagination'

const PALETTE = ['#279a90', '#f59e0b', '#728079', '#43b6ac', '#dc2626', '#a8e7e1']

type DatePreset = 'this-month' | 'last-month' | 'q3' | 'q2' | 'ytd' | 'all' | 'custom'

export function AccountingPage() {
  const { ledgerEntries, expenses, invoices } = useData()
  const { show } = useToast()
  const [tab, setTab] = useState('ledger')
  const [ledgerPage, setLedgerPage] = useState(1)
  const [ledgerPageSize, setLedgerPageSize] = useState(10)

  // Date Range state
  const [preset, setPreset] = useState<DatePreset>('all')
  const [startDate, setStartDate] = useState<string>('2026-01-01')
  const [endDate, setEndDate] = useState<string>('2026-12-31')

  // Calculate active date boundaries based on preset
  const { effectiveStart, effectiveEnd, periodLabel } = useMemo(() => {
    switch (preset) {
      case 'this-month':
        return {
          effectiveStart: '2026-07-01',
          effectiveEnd: '2026-07-31',
          periodLabel: 'July 2026 (This Month)',
        }
      case 'last-month':
        return {
          effectiveStart: '2026-06-01',
          effectiveEnd: '2026-06-30',
          periodLabel: 'June 2026 (Last Month)',
        }
      case 'q3':
        return {
          effectiveStart: '2026-07-01',
          effectiveEnd: '2026-09-30',
          periodLabel: 'Q3 2026 (Jul – Sep)',
        }
      case 'q2':
        return {
          effectiveStart: '2026-04-01',
          effectiveEnd: '2026-06-30',
          periodLabel: 'Q2 2026 (Apr – Jun)',
        }
      case 'ytd':
        return {
          effectiveStart: '2026-01-01',
          effectiveEnd: '2026-12-31',
          periodLabel: 'FY 2026 (Year to Date)',
        }
      case 'custom':
        return {
          effectiveStart: startDate,
          effectiveEnd: endDate,
          periodLabel: `${formatDate(startDate)} – ${formatDate(endDate)}`,
        }
      case 'all':
      default:
        return {
          effectiveStart: '',
          effectiveEnd: '',
          periodLabel: 'All Time',
        }
    }
  }, [preset, startDate, endDate])

  // Filtered dataset according to date range
  const filteredLedger = useMemo(() => {
    return ledgerEntries.filter((l) => {
      if (effectiveStart && l.date < effectiveStart) return false
      if (effectiveEnd && l.date > effectiveEnd) return false
      return true
    })
  }, [ledgerEntries, effectiveStart, effectiveEnd])

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (effectiveStart && e.date < effectiveStart) return false
      if (effectiveEnd && e.date > effectiveEnd) return false
      return true
    })
  }, [expenses, effectiveStart, effectiveEnd])

  const filteredInvoices = useMemo(() => {
    return invoices.filter((i) => {
      const d = i.issueDate || i.createdAt
      if (effectiveStart && d < effectiveStart) return false
      if (effectiveEnd && d > effectiveEnd) return false
      return true
    })
  }, [invoices, effectiveStart, effectiveEnd])

  // Recalculate totals
  const totalRevenue = filteredLedger
    .filter((l) => l.account === 'Service Revenue' || l.account === 'Penalty Income')
    .reduce((s, l) => s + l.credit, 0)

  const totalExpense = filteredLedger
    .filter((l) => l.debit > 0 && l.account !== 'Disbursements Receivable')
    .reduce((s, l) => s + l.debit, 0)

  const net = totalRevenue - totalExpense

  const receivables = invoices
    .filter((i) => i.status !== 'paid')
    .map((i) => {
      return { ...i, balance: invoiceBalanceDue(i) }
    })

  const vatCollected = filteredInvoices.reduce(
    (s, i) => s + i.lines.reduce((ss, l) => ss + l.qty * l.unitPrice, 0) * 0.05,
    0,
  )
  const vatOnExpenses = filteredExpenses.reduce((s, e) => s + e.amount * 0.05, 0)

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>()
    filteredExpenses.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount))
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [filteredExpenses])

  function handleExport() {
    show(`General Ledger & Financial Statements exported (${periodLabel})`)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">Accounting</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Ledger and financial reports, auto-populated from Sales, Credit Notes, Expenses &amp; Wallet activity.
          </p>
        </div>
        <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={handleExport}>
          Export Statement
        </Button>
      </div>

      {/* Date Range Filter Bar */}
      <Card className="p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
              <Calendar className="h-4 w-4 text-accent-600" />
              <span>Period:</span>
            </div>
            <Select
              className="sm:w-56"
              value={preset}
              onChange={(e) => {
                setPreset(e.target.value as DatePreset)
                setLedgerPage(1)
              }}
            >
              <option value="all">All Time</option>
              <option value="this-month">This Month (July 2026)</option>
              <option value="last-month">Last Month (June 2026)</option>
              <option value="q3">Q3 2026 (Jul – Sep)</option>
              <option value="q2">Q2 2026 (Apr – Jun)</option>
              <option value="ytd">Financial Year 2026 (YTD)</option>
              <option value="custom">Custom Date Range...</option>
            </Select>

            {preset === 'custom' && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setLedgerPage(1)
                  }}
                  className="w-36 text-xs"
                />
                <span className="text-xs text-ink-400">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setLedgerPage(1)
                  }}
                  className="w-36 text-xs"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge tone="accent" className="font-medium">
              Active Range: {periodLabel}
            </Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Revenue (Recorded)"
          value={formatAED(totalRevenue)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="success"
          trend={`Filtered: ${periodLabel}`}
        />
        <StatCard
          label="Expenses (Recorded)"
          value={formatAED(totalExpense)}
          icon={<TrendingDown className="h-5 w-5" />}
          tone="danger"
          trend={`Filtered: ${periodLabel}`}
        />
        <StatCard
          label="Net Profit"
          value={formatAED(net)}
          icon={<Scale className="h-5 w-5" />}
          trend={net >= 0 ? 'Surplus' : 'Deficit'}
        />
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'ledger', label: 'Ledger', count: filteredLedger.length },
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
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-ink-400">
                      No ledger transactions found in the selected date range ({periodLabel}).
                    </td>
                  </tr>
                ) : (
                  filteredLedger
                    .slice((ledgerPage - 1) * ledgerPageSize, ledgerPage * ledgerPageSize)
                    .map((l) => (
                      <tr key={l.id} className="border-b border-ink-50 last:border-0 dark:border-ink-800/60">
                        <td className="px-5 py-3 text-ink-500 dark:text-ink-400">{formatDate(l.date)}</td>
                        <td className="px-5 py-3 font-medium text-ink-800 dark:text-ink-100">{l.account}</td>
                        <td className="px-5 py-3 text-ink-500 dark:text-ink-400">{l.description}</td>
                        <td className="px-5 py-3 text-right text-danger-600 font-medium">{l.debit > 0 ? formatAED(l.debit) : ''}</td>
                        <td className="px-5 py-3 text-right text-success-600 font-medium">{l.credit > 0 ? formatAED(l.credit) : ''}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={ledgerPage}
            pageSize={ledgerPageSize}
            totalItems={filteredLedger.length}
            onPageChange={setLedgerPage}
            onPageSizeChange={setLedgerPageSize}
            itemLabel="entries"
          />
        </Card>
      )}

      {tab === 'pnl' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Profit &amp; Loss Statement</CardTitle>
              <p className="mt-0.5 text-xs text-ink-400">Period: {periodLabel}</p>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col divide-y divide-ink-100 pt-2 dark:divide-ink-800">
            <div className="flex justify-between py-2.5 text-sm">
              <span className="text-ink-500 dark:text-ink-400">Operating Service Revenue</span>
              <span className="font-medium text-ink-800 dark:text-ink-100">{formatAED(totalRevenue)}</span>
            </div>
            <div className="flex justify-between py-2.5 text-sm">
              <span className="text-ink-500 dark:text-ink-400">Operating Expenses &amp; Overheads</span>
              <span className="font-medium text-danger-600">-{formatAED(totalExpense)}</span>
            </div>
            <div className="flex justify-between py-3 text-base font-semibold text-ink-900 dark:text-ink-50">
              <span>Net Operating Profit</span>
              <span className={net >= 0 ? 'text-success-600' : 'text-danger-600'}>{formatAED(net)}</span>
            </div>
          </CardBody>
        </Card>
      )}

      {tab === 'receivables' && (
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Client Invoices</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-1 pt-3">
            {receivables.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-400">All client invoices are fully paid.</p>
            ) : (
              receivables.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-ink-50 dark:hover:bg-ink-800/40">
                  <Receipt className="h-4 w-4 text-ink-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{r.number}</p>
                    <p className="text-xs text-ink-400">Due {formatDate(r.dueDate)}</p>
                  </div>
                  <Badge tone={r.status === 'overdue' ? 'danger' : 'warning'}>{r.status}</Badge>
                  <span className="w-24 text-right font-medium text-ink-700 dark:text-ink-200">{formatAED(r.balance)}</span>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'vat' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>VAT Return Prep Summary (UAE FTA Form 201)</CardTitle>
              <p className="mt-0.5 text-xs text-ink-400">Period: {periodLabel}</p>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col divide-y divide-ink-100 pt-2 dark:divide-ink-800">
            <div className="flex justify-between py-2.5 text-sm">
              <span className="text-ink-500 dark:text-ink-400">Box 1a/1b: Output VAT (5% collected on billable sales)</span>
              <span className="font-medium text-ink-800 dark:text-ink-100">{formatAED(vatCollected)}</span>
            </div>
            <div className="flex justify-between py-2.5 text-sm">
              <span className="text-ink-500 dark:text-ink-400">Box 9: Input VAT (5% recoverable paid on operating expenses)</span>
              <span className="font-medium text-ink-800 dark:text-ink-100">{formatAED(vatOnExpenses)}</span>
            </div>
            <div className="flex justify-between py-3 text-base font-semibold text-ink-900 dark:text-ink-50">
              <span>Box 12: Net VAT Payable to Federal Tax Authority</span>
              <span className="text-accent-600 font-bold">{formatAED(vatCollected - vatOnExpenses)}</span>
            </div>
          </CardBody>
        </Card>
      )}

      {tab === 'expenses' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Expense Breakdown by Category</CardTitle>
              <p className="mt-0.5 text-xs text-ink-400">Period: {periodLabel}</p>
            </div>
          </CardHeader>
          <CardBody className="pt-2">
            {expenseByCategory.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-400">No expenses recorded for {periodLabel}.</p>
            ) : (
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
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
