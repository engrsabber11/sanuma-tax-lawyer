import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts'
import {
  CalendarClock,
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
import { useData, TODAY } from '../data/store'
import { dueReminders, MILESTONE_LABEL } from '../data/reminders'
import { cn, daysUntil, formatAED, formatDate, todayIso, urgencyFromDate, urgencyFromDays } from '../lib/utils'
import { invoiceBalanceDue } from '../lib/invoice'

const revenueTrend = [
  { month: 'Feb', revenue: 8200, expense: 11200 },
  { month: 'Mar', revenue: 12400, expense: 12800 },
  { month: 'Apr', revenue: 15600, expense: 13100 },
  { month: 'May', revenue: 18900, expense: 14200 },
  { month: 'Jun', revenue: 21300, expense: 15600 },
  { month: 'Jul', revenue: 24750, expense: 16480 },
]

/** The seed's revenue month — labelled, not silently implied. See BOOKS_MONTH below. */
const BOOKS_MONTH = TODAY.slice(0, 7)

export function Dashboard() {
  const {
    clients,
    clientDocuments,
    obligationTypes,
    filingPeriods,
    clientYears,
    documentTypes,
    reminderRules,
    reminderLog,
    invoices,
    expenses,
  } = useData()
  const clientById = (id: string) => clients.find((c) => c.id === id)
  const today = todayIso()

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

  // "Where is this year" — the requirement is year-based, so the dashboard has to
  // answer that, not just list the next few dates.
  const taxYear = Number(TODAY.slice(0, 4))
  const inYear = filingPeriods.filter((p) => p.taxYear === taxYear)
  const yearFiled = inYear.filter((p) => p.state === 'filed').length
  const yearDue = inYear.filter((p) => p.state === 'pending').length
  const yearOverdue = inYear.filter((p) => p.state === 'pending' && daysUntil(p.dueDate) < 0).length
  const yearNotRequired = inYear.filter((p) => p.state === 'not-required').length

  // Reminders the FIRM has to act on. Nothing else in the app surfaces these —
  // the rules page is organised by rule, not by what lands today.
  const internalReminders = useMemo(
    () =>
      dueReminders({
        rules: reminderRules,
        documents: clientDocuments,
        documentTypes,
        filingPeriods,
        obligationTypes,
        isYearClosed: (clientId, year) =>
          clientYears.some((y) => y.clientId === clientId && y.taxYear === year && y.status === 'closed'),
        log: reminderLog,
        today,
      }).filter((r) => r.audience === 'internal' || r.audience === 'both'),
    [reminderRules, clientDocuments, documentTypes, filingPeriods, obligationTypes, clientYears, reminderLog, today],
  )

  const outstandingInvoices = invoices.filter((i) => i.status !== 'paid')
  const outstandingTotal = outstandingInvoices.reduce((sum, i) => sum + invoiceBalanceDue(i), 0)

  const monthRevenue = invoices
    .filter((i) => i.issueDate.startsWith(BOOKS_MONTH))
    .reduce((sum, i) => sum + i.paidAmount, 0)
  const monthExpenses = expenses.filter((e) => e.date.startsWith(BOOKS_MONTH)).reduce((sum, e) => sum + e.amount, 0)
  // Named rather than called "this month": the books are seeded data anchored to
  // TODAY, and a card headed "this month" showing July's figures in August is a
  // quiet lie about which period was summed.
  const booksMonthLabel = new Date(`${BOOKS_MONTH}-01T00:00:00`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  const newClients = clients.filter((c) => c.createdAt >= `${BOOKS_MONTH}-01`)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">Good afternoon 👋</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Here's what needs your attention today, {formatDate(today)}.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-ink-400" />
            <span className="text-sm font-semibold text-ink-800 dark:text-ink-100">Tax year {taxYear}</span>
          </div>
          <YearStat label="Filed" value={yearFiled} tone="success" />
          <YearStat label="Still due" value={yearDue} tone={yearDue > 0 ? 'accent' : 'neutral'} />
          <YearStat label="Overdue" value={yearOverdue} tone={yearOverdue > 0 ? 'danger' : 'neutral'} />
          {yearNotRequired > 0 && <YearStat label="Not required" value={yearNotRequired} tone="neutral" />}
          <Link to="/filings" className="ml-auto flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline">
            All filings <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </Card>

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
          label={`Revenue — ${booksMonthLabel}`}
          value={formatAED(monthRevenue)}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={`Net ${formatAED(monthRevenue - monthExpenses)} after expenses`}
          tone="success"
        />
        <StatCard
          label={`New Clients — ${booksMonthLabel}`}
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
            <CardTitle>Needs Chasing Today</CardTitle>
            <Link to="/reminders" className="text-xs font-medium text-accent-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardBody className="flex flex-col gap-3 pt-3">
            {/* Derived, never stored: a reminder is due because a date says so. */}
            {internalReminders.length === 0 && (
              <p className="text-sm text-ink-400">Nothing falls on a reminder milestone today.</p>
            )}
            {internalReminders.slice(0, 6).map((r) => {
              const client = clientById(r.clientId)
              return (
                <div key={r.key} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-900/30">
                    <BellRing className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800 dark:text-ink-100">{r.subject}</p>
                    <p className="text-xs text-ink-400">
                      {client?.businessName ?? client?.name} · {MILESTONE_LABEL(r.milestone)}
                    </p>
                  </div>
                  <Badge tone={r.alreadySentAt ? 'success' : r.milestone === 0 ? 'danger' : 'warning'}>
                    {r.alreadySentAt ? 'sent' : r.milestone === 0 ? 'due today' : 'to send'}
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
              Document Renewals <ArrowRight className="h-3 w-3" />
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
            <CardTitle>Upcoming Filings</CardTitle>
            <Link to="/filings" className="flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline">
              Filings worklist <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardBody className="flex flex-col gap-1 pt-2">
            {dueDeadlines.length === 0 && (
              <p className="px-2 py-2.5 text-sm text-ink-400">Nothing outstanding — every filing is in.</p>
            )}
            {/* Rows go to the client's Compliance tab, which is where a filing is
                actually worked, rather than to the document list. */}
            {dueDeadlines.slice(0, 6).map((d) => {
              const client = clientById(d.clientId)
              const urgency = urgencyFromDays(d.days)
              return (
                <Link
                  key={d.id}
                  to={`/clients/${d.clientId}?tab=compliance`}
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

/**
 * One figure in the tax-year row. Deliberately not a `StatCard`: this row answers
 * a single question across four numbers, and four cards would read as four
 * unrelated metrics.
 */
function YearStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'accent' | 'danger' | 'success' | 'neutral'
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className={cn(
          'text-lg font-semibold',
          tone === 'danger'
            ? 'text-danger-600 dark:text-danger-500'
            : tone === 'success'
              ? 'text-success-600 dark:text-success-500'
              : tone === 'accent'
                ? 'text-accent-600 dark:text-accent-400'
                : 'text-ink-500 dark:text-ink-400',
        )}
      >
        {value}
      </span>
      <span className="text-xs text-ink-500 dark:text-ink-400">{label}</span>
    </div>
  )
}
