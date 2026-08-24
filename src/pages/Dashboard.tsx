import { Link } from 'react-router-dom'
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts'
import {
  FolderClock,
  Receipt,
  TrendingUp,
  UserPlus,
  Wallet,
  ArrowRight,
  BellRing,
} from 'lucide-react'
import { StatCard } from '../components/ui/StatCard'
import { Card, CardBody, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge, UrgencyBadge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import { useData } from '../data/store'
import { daysUntil, formatAED, formatDate, urgencyFromDate, urgencyFromDays } from '../lib/utils'

const revenueTrend = [
  { month: 'Feb', revenue: 8200, expense: 11200 },
  { month: 'Mar', revenue: 12400, expense: 12800 },
  { month: 'Apr', revenue: 15600, expense: 13100 },
  { month: 'May', revenue: 18900, expense: 14200 },
  { month: 'Jun', revenue: 21300, expense: 15600 },
  { month: 'Jul', revenue: 24750, expense: 16480 },
]

export function Dashboard() {
  const { clients, clientDocuments, obligationTypes, filingPeriods, documentTypes, invoices, expenses, reminderLog } = useData()
  const clientById = (id: string) => clients.find((c) => c.id === id)

  const expiringDocs = clientDocuments
    .map((d) => ({ ...d, days: daysUntil(d.expiryDate), urgency: urgencyFromDate(d.expiryDate) }))
    .filter((d) => d.urgency !== 'ok')
    .sort((a, b) => a.days - b.days)

  // Derived from generated filing periods — urgency comes from the due date, not
  // from a stored status string that would go stale.
  const dueDeadlines = filingPeriods
    .filter((p) => p.state === 'pending')
    .map((p) => ({
      id: p.id,
      clientId: p.clientId,
      name: `${obligationTypes.find((t) => t.id === p.obligationTypeId)?.name ?? 'Filing'} — ${p.label}`,
      nextDueDate: p.dueDate,
      days: daysUntil(p.dueDate),
    }))
    .sort((a, b) => a.days - b.days)

  const outstandingInvoices = invoices.filter((i) => i.status !== 'paid')
  const outstandingTotal = outstandingInvoices.reduce(
    (sum, i) => sum + (i.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0) * 1.05 - i.paidAmount),
    0,
  )

  const monthRevenue = invoices
    .filter((i) => i.issueDate.startsWith('2026-07'))
    .reduce((sum, i) => sum + i.paidAmount, 0)
  const monthExpenses = expenses.filter((e) => e.date.startsWith('2026-07')).reduce((sum, e) => sum + e.amount, 0)

  const newClients = clients.filter((c) => c.createdAt >= '2026-07-01')

  const todaysReminders = reminderLog.filter((r) => r.sentAt.startsWith('2026-07-21'))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">Good afternoon 👋</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Here's what needs your attention today, 21 July 2026.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Expiring / Overdue Items"
          value={String(expiringDocs.length + dueDeadlines.filter((d) => d.days <= 30).length)}
          icon={<FolderClock className="h-5 w-5" />}
          trend="Documents & filings needing action"
          tone="warning"
        />
        <StatCard
          label="Outstanding Invoices"
          value={formatAED(outstandingTotal)}
          icon={<Receipt className="h-5 w-5" />}
          trend={`${outstandingInvoices.length} unpaid invoice${outstandingInvoices.length === 1 ? '' : 's'}`}
          tone="danger"
        />
        <StatCard
          label="Revenue this month"
          value={formatAED(monthRevenue)}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={`Net ${formatAED(monthRevenue - monthExpenses)} after expenses`}
          tone="success"
        />
        <StatCard
          label="New Clients this month"
          value={String(newClients.length)}
          icon={<UserPlus className="h-5 w-5" />}
          trend="Via referral & direct signup"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Revenue vs. Expenses</CardTitle>
            <Badge tone="success">+16.3% MoM</Badge>
          </CardHeader>
          <CardBody className="pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueTrend} margin={{ left: -20, right: 10 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#279a90" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#279a90" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#97a19b" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#97a19b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#97a19b' }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #dde1df', fontSize: 13 }}
                  formatter={(v) => formatAED(Number(v))}
                />
                <Area type="monotone" dataKey="revenue" stroke="#1c7c74" strokeWidth={2} fill="url(#rev)" />
                <Area type="monotone" dataKey="expense" stroke="#728079" strokeWidth={2} fill="url(#exp)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Reminders</CardTitle>
            <Link to="/reminders" className="text-xs font-medium text-accent-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardBody className="flex flex-col gap-3 pt-3">
            {todaysReminders.length === 0 && <p className="text-sm text-ink-400">Nothing scheduled for today.</p>}
            {todaysReminders.map((r) => {
              const client = clientById(r.clientId)
              return (
                <div key={r.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-900/30">
                    <BellRing className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800 dark:text-ink-100">{r.subject}</p>
                    <p className="text-xs text-ink-400">
                      {client?.name} · via {r.channel}
                    </p>
                  </div>
                  <Badge tone={r.status === 'delivered' ? 'success' : r.status === 'failed' ? 'danger' : 'neutral'}>
                    {r.status}
                  </Badge>
                </div>
              )
            })}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expiring Soon &amp; Overdue Documents</CardTitle>
            <Link to="/documents" className="flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline">
              Document Vault <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardBody className="flex flex-col gap-1 pt-2">
            {expiringDocs.slice(0, 6).map((doc) => {
              const client = clientById(doc.clientId)
              const type = documentTypes.find((t) => t.id === doc.typeId)
              return (
                <Link
                  key={doc.id}
                  to={`/clients/${doc.clientId}?tab=documents`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-ink-50 dark:hover:bg-ink-800"
                >
                  {client && <Avatar name={client.name} color={client.avatarColor} size="sm" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800 dark:text-ink-100">{type?.name}</p>
                    <p className="text-xs text-ink-400">{client?.businessName ?? client?.name}</p>
                  </div>
                  <div className="text-right">
                    <UrgencyBadge urgency={doc.urgency} label={doc.days < 0 ? `${Math.abs(doc.days)}d overdue` : `${doc.days}d left`} />
                  </div>
                </Link>
              )
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Filing Deadlines</CardTitle>
            <Link to="/documents" className="flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline">
              Calendar view <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardBody className="flex flex-col gap-1 pt-2">
            {dueDeadlines.slice(0, 6).map((d) => {
              const client = clientById(d.clientId)
              const urgency = urgencyFromDays(d.days)
              return (
                <Link
                  key={d.id}
                  to={`/clients/${d.clientId}?tab=documents`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-ink-50 dark:hover:bg-ink-800"
                >
                  {client && <Avatar name={client.name} color={client.avatarColor} size="sm" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800 dark:text-ink-100">{d.name}</p>
                    <p className="text-xs text-ink-400">{client?.businessName ?? client?.name} · {formatDate(d.nextDueDate)}</p>
                  </div>
                  <UrgencyBadge urgency={urgency} label={d.days < 0 ? `${Math.abs(d.days)}d overdue` : `${d.days}d left`} />
                </Link>
              )
            })}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-3 pt-3 sm:grid-cols-4">
          {[
            { to: '/clients/new', label: 'New Client', icon: UserPlus },
            { to: '/matters', label: 'New Matter', icon: FolderClock },
            { to: '/sales/invoices', label: 'New Invoice', icon: Receipt },
            { to: '/referrals', label: 'Referral Wallets', icon: Wallet },
          ].map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="flex flex-col items-center gap-2 rounded-xl border border-ink-200/70 p-4 text-center transition-all hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-[var(--shadow-card-hover)] dark:border-ink-800"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-900/30">
                <a.icon className="h-4.5 w-4.5" />
              </span>
              <span className="text-sm font-medium text-ink-700 dark:text-ink-200">{a.label}</span>
            </Link>
          ))}
        </CardBody>
      </Card>
    </div>
  )
}
