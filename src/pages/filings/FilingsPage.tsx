import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  BellRing,
  Briefcase,
  CalendarClock,
  Check,
  CircleSlash,
  FileSpreadsheet,
  Search,
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Field'
import { EmptyState } from '../../components/ui/EmptyState'
import { NewMatterModal } from '../../components/modals/NewMatterModal'
import { useData, TODAY } from '../../data/store'
import { useToast } from '../../lib/toast'
import type { FilingPeriod } from '../../data/types'
import { cn, daysUntil, formatDate, urgencyFromDays } from '../../lib/utils'

/**
 * The lawyer's daily worklist.
 *
 * Grouped by urgency rather than paginated by date, so the top of the page is
 * always the work that matters. Urgency is derived from the due date through the
 * same `urgencyFromDays` the document vault uses — a red row means the same
 * thing everywhere in the app.
 */

type GroupId = 'overdue' | 'this-month' | 'next-90' | 'later' | 'filed' | 'not-required'

const GROUPS: { id: GroupId; label: string; tone: 'danger' | 'warning' | 'neutral' }[] = [
  { id: 'overdue', label: 'Overdue', tone: 'danger' },
  { id: 'this-month', label: 'Due within 30 days', tone: 'warning' },
  { id: 'next-90', label: 'Next 90 days', tone: 'neutral' },
  { id: 'later', label: 'Later', tone: 'neutral' },
  { id: 'filed', label: 'Filed', tone: 'neutral' },
  { id: 'not-required', label: 'Not required', tone: 'neutral' },
]

/**
 * Purely days-until-due. An earlier version also compared the due month against
 * the seed's TODAY, which mixed two clocks: daysUntil reads the real system
 * clock while TODAY is a fixed seed date, so the two disagree as real time
 * passes. One clock, one rule.
 */
function groupFor(p: FilingPeriod): GroupId {
  if (p.state === 'filed') return 'filed'
  if (p.state === 'not-required') return 'not-required'
  const days = daysUntil(p.dueDate)
  if (days < 0) return 'overdue'
  if (days <= 30) return 'this-month'
  if (days <= 90) return 'next-90'
  return 'later'
}

export function FilingsPage() {
  const {
    clients,
    obligationTypes,
    filingPeriods,
    registrations,
    matters,
    invoices,
    markFilingFiled,
    markFilingNotRequired,
  } = useData()
  const { show } = useToast()
  const navigate = useNavigate()

  const [taxYear, setTaxYear] = useState(Number(TODAY.slice(0, 4)))
  const [query, setQuery] = useState('')
  const [clientFilter, setClientFilter] = useState('all')
  const [obligationFilter, setObligationFilter] = useState('all')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [matterFor, setMatterFor] = useState<FilingPeriod | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ filed: true, 'not-required': true })

  // Lookups built once. A practice with 300 clients generates thousands of
  // periods a year, and Array.find inside a row component is how that page
  // stops being usable.
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients])
  const obligationById = useMemo(() => new Map(obligationTypes.map((t) => [t.id, t])), [obligationTypes])
  const matterById = useMemo(() => new Map(matters.map((m) => [m.id, m])), [matters])
  const invoiceById = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices])
  const registrationById = useMemo(() => new Map(registrations.map((r) => [r.id, r])), [registrations])

  const taxYears = useMemo(() => {
    const years = new Set(filingPeriods.map((p) => p.taxYear))
    years.add(Number(TODAY.slice(0, 4)))
    return [...years].sort((a, b) => b - a)
  }, [filingPeriods])

  const inYear = useMemo(() => filingPeriods.filter((p) => p.taxYear === taxYear), [filingPeriods, taxYear])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return inYear.filter((p) => {
      if (clientFilter !== 'all' && p.clientId !== clientFilter) return false
      if (obligationFilter !== 'all' && p.obligationTypeId !== obligationFilter) return false
      if (overdueOnly && !(p.state === 'pending' && daysUntil(p.dueDate) < 0)) return false
      if (!q) return true
      const client = clientById.get(p.clientId)
      const obligation = obligationById.get(p.obligationTypeId)
      return `${client?.name ?? ''} ${client?.businessName ?? ''} ${obligation?.name ?? ''} ${p.label}`
        .toLowerCase()
        .includes(q)
    })
  }, [inYear, query, clientFilter, obligationFilter, overdueOnly, clientById, obligationById])

  const grouped = useMemo(() => {
    const map = new Map<GroupId, FilingPeriod[]>(GROUPS.map((g) => [g.id, []]))
    for (const p of filtered) map.get(groupFor(p))!.push(p)
    for (const list of map.values()) list.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    return map
  }, [filtered])

  const pendingCount = inYear.filter((p) => p.state === 'pending').length
  const overdueCount = inYear.filter((p) => p.state === 'pending' && daysUntil(p.dueDate) < 0).length
  const filedCount = inYear.filter((p) => p.state === 'filed').length

  function openMatter(p: FilingPeriod) {
    if (p.matterId && matterById.has(p.matterId)) {
      navigate(`/matters/${p.matterId}`)
      return
    }
    setMatterFor(p)
  }

  if (filingPeriods.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeading taxYears={[]} taxYear={taxYear} onTaxYear={setTaxYear} />
        <Card>
          <EmptyState
            icon={<CalendarClock className="h-5 w-5" />}
            title="No filing schedules yet"
            description="Filings appear here once a client has a VAT or Corporate Tax registration. Onboard a client to generate their calendar."
            action={<Button onClick={() => navigate('/clients/new')}>Add New Client</Button>}
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeading taxYears={taxYears} taxYear={taxYear} onTaxYear={setTaxYear} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Outstanding" value={pendingCount} tone={pendingCount > 0 ? 'accent' : 'neutral'} />
        <StatTile label="Overdue" value={overdueCount} tone={overdueCount > 0 ? 'danger' : 'neutral'} />
        <StatTile label="Filed" value={filedCount} tone="success" />
        <StatTile label="Total in year" value={inYear.length} tone="neutral" />
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              placeholder="Search client, obligation or period…"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select className="lg:w-52" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
            <option value="all">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.businessName ?? c.name}
              </option>
            ))}
          </Select>
          <Select className="lg:w-52" value={obligationFilter} onChange={(e) => setObligationFilter(e.target.value)}>
            <option value="all">All obligations</option>
            {obligationTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <button
            onClick={() => setOverdueOnly((v) => !v)}
            className={cn(
              'flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3.5 text-sm font-medium transition-colors',
              overdueOnly
                ? 'border-danger-300 bg-danger-50 text-danger-700 dark:border-danger-800 dark:bg-danger-500/10 dark:text-danger-400'
                : 'border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800',
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Overdue only
          </button>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarClock className="h-5 w-5" />}
            title={inYear.length === 0 ? `Nothing falls due in ${taxYear}` : 'No filings match these filters'}
            description={
              inYear.length === 0
                ? 'Try another tax year — registrations only generate periods from their effective date onward.'
                : 'Clear a filter to widen the list.'
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {GROUPS.map((g) => {
            const rows = grouped.get(g.id) ?? []
            if (rows.length === 0) return null
            const isCollapsed = collapsed[g.id] ?? false
            return (
              <Card key={g.id}>
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [g.id]: !isCollapsed }))}
                  className="flex w-full items-center gap-2.5 border-b border-ink-100 px-5 py-3 text-left dark:border-ink-800"
                >
                  <span
                    className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      g.tone === 'danger' ? 'bg-danger-500' : g.tone === 'warning' ? 'bg-warning-500' : 'bg-ink-300',
                    )}
                  />
                  <span className="text-sm font-semibold text-ink-800 dark:text-ink-100">{g.label}</span>
                  <Badge tone="neutral" size="sm">
                    {rows.length}
                  </Badge>
                  <span className="ml-auto text-xs text-ink-400">{isCollapsed ? 'Show' : 'Hide'}</span>
                </button>
                {!isCollapsed && (
                  <div className="divide-y divide-ink-100 dark:divide-ink-800">
                    {rows.map((p) => (
                      <FilingRow
                        key={p.id}
                        period={p}
                        clientName={clientById.get(p.clientId)?.businessName ?? clientById.get(p.clientId)?.name ?? '—'}
                        avatarName={clientById.get(p.clientId)?.name ?? '—'}
                        avatarColor={clientById.get(p.clientId)?.avatarColor}
                        obligationName={obligationById.get(p.obligationTypeId)?.name ?? 'Filing'}
                        obligationShort={obligationById.get(p.obligationTypeId)?.shortName ?? '—'}
                        deregistered={registrationById.get(p.registrationId)?.status === 'deregistered'}
                        matterTitle={p.matterId ? matterById.get(p.matterId)?.title : undefined}
                        invoiceNumber={p.invoiceId ? invoiceById.get(p.invoiceId)?.number : undefined}
                        onOpenMatter={() => openMatter(p)}
                        onMarkFiled={() => {
                          markFilingFiled(p.id)
                          show(`${obligationById.get(p.obligationTypeId)?.shortName ?? 'Filing'} ${p.label} marked filed`)
                        }}
                        onMarkNotRequired={() => {
                          markFilingNotRequired(p.id)
                          show(`${p.label} marked not required`)
                        }}
                      />
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <NewMatterModal
        open={!!matterFor}
        onClose={() => setMatterFor(null)}
        defaultClientId={matterFor?.clientId}
        onCreated={(m) => navigate(`/matters/${m.id}`)}
      />
    </div>
  )
}

function PageHeading({
  taxYears,
  taxYear,
  onTaxYear,
}: {
  taxYears: number[]
  taxYear: number
  onTaxYear: (y: number) => void
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">Filings</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Every return and filing due across the practice, generated from client registrations.
        </p>
      </div>
      {taxYears.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink-500 dark:text-ink-400">Tax year</span>
          <Select className="w-28" value={String(taxYear)} onChange={(e) => onTaxYear(Number(e.target.value))}>
            {taxYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  )
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: 'accent' | 'danger' | 'success' | 'neutral' }) {
  return (
    <Card className="px-4 py-3">
      <p className="text-xs font-medium text-ink-400">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-xl font-semibold',
          tone === 'danger'
            ? 'text-danger-600 dark:text-danger-500'
            : tone === 'success'
              ? 'text-success-600 dark:text-success-500'
              : tone === 'accent'
                ? 'text-accent-600 dark:text-accent-400'
                : 'text-ink-800 dark:text-ink-100',
        )}
      >
        {value}
      </p>
    </Card>
  )
}

function FilingRow({
  period,
  clientName,
  avatarName,
  avatarColor,
  obligationName,
  obligationShort,
  deregistered,
  matterTitle,
  invoiceNumber,
  onOpenMatter,
  onMarkFiled,
  onMarkNotRequired,
}: {
  period: FilingPeriod
  clientName: string
  avatarName: string
  avatarColor?: string
  obligationName: string
  obligationShort: string
  deregistered: boolean
  matterTitle?: string
  invoiceNumber?: string
  onOpenMatter: () => void
  onMarkFiled: () => void
  onMarkNotRequired: () => void
}) {
  const days = daysUntil(period.dueDate)
  const urgency = urgencyFromDays(days)
  const outstanding = period.state === 'pending'

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors hover:bg-ink-50/60 dark:hover:bg-ink-800/40">
      <Link to={`/clients/${period.clientId}?tab=documents`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={avatarName} color={avatarColor} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-800 dark:text-ink-100">
            {obligationName} — {period.label}
          </p>
          <p className="truncate text-xs text-ink-400">
            {clientName} · {formatDate(period.periodStart)} – {formatDate(period.periodEnd)}
          </p>
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        <Badge tone="neutral" size="sm">
          {obligationShort}
        </Badge>
        {deregistered && (
          <Badge tone="warning" size="sm">
            deregistered
          </Badge>
        )}
        {matterTitle && (
          <Link to={`/matters/${period.matterId}`} title={matterTitle}>
            <Badge tone="accent" size="sm">
              <Briefcase className="mr-1 inline h-3 w-3" />
              matter
            </Badge>
          </Link>
        )}
        {invoiceNumber && (
          <Link to={`/sales/invoices/${period.invoiceId}`} title={invoiceNumber}>
            <Badge tone="success" size="sm">
              <FileSpreadsheet className="mr-1 inline h-3 w-3" />
              billed
            </Badge>
          </Link>
        )}
      </div>

      <div className="w-32 shrink-0 text-right">
        <p className="text-xs font-medium text-ink-700 dark:text-ink-200">Due {formatDate(period.dueDate)}</p>
        {outstanding ? (
          <p
            className={cn(
              'text-xs',
              urgency === 'danger'
                ? 'text-danger-600 dark:text-danger-500'
                : urgency === 'warning'
                  ? 'text-warning-600 dark:text-warning-500'
                  : 'text-ink-400',
            )}
          >
            {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'due today' : `${days}d left`}
          </p>
        ) : (
          <p className="text-xs text-ink-400">
            {period.state === 'filed' ? (period.filedAt ? `filed ${formatDate(period.filedAt)}` : 'filed') : 'not required'}
          </p>
        )}
      </div>

      {outstanding && (
        <div className="flex shrink-0 items-center gap-1">
          <RowAction icon={<Briefcase className="h-3.5 w-3.5" />} label={period.matterId ? 'Go to matter' : 'Open matter'} onClick={onOpenMatter} />
          <RowAction icon={<Check className="h-3.5 w-3.5" />} label="Mark filed" onClick={onMarkFiled} />
          <RowAction icon={<CircleSlash className="h-3.5 w-3.5" />} label="Mark not required" onClick={onMarkNotRequired} />
          {/* Wired in Phase 6 — disabled rather than faking a send. */}
          <RowAction icon={<BellRing className="h-3.5 w-3.5" />} label="Reminders arrive in a later phase" disabled />
        </div>
      )}
    </div>
  )
}

function RowAction({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        'rounded-lg p-2 transition-colors',
        disabled
          ? 'cursor-not-allowed text-ink-300 dark:text-ink-600'
          : 'text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-700 dark:hover:text-ink-200',
      )}
    >
      {icon}
    </button>
  )
}
