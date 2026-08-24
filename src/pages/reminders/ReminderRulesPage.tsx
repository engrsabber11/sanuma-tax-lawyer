import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Mail, MessageSquare, Settings2, BellRing, Send, Search, X, Plus } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Label, Input, Select } from '../../components/ui/Field'
import { Pagination } from '../../components/ui/Pagination'
import { Tabs } from '../../components/ui/Tabs'
import { Switch } from '../../components/ui/Switch'
import { EmptyState } from '../../components/ui/EmptyState'
import { useData } from '../../data/store'
import { dueReminders, upcomingForRule, MILESTONE_LABEL } from '../../data/reminders'
import { useToast } from '../../lib/toast'
import type { Channel, ReminderRule } from '../../data/types'
import { cn, formatDate, todayIso } from '../../lib/utils'

const channelIcon: Record<Channel, typeof Mail> = { whatsapp: MessageCircle, email: Mail, sms: MessageSquare }
const channelLabel: Record<Channel, string> = { whatsapp: 'WhatsApp', email: 'Email', sms: 'SMS' }

export function ReminderRulesPage() {
  const {
    clients,
    documentTypes,
    obligationTypes,
    clientDocuments,
    filingPeriods,
    clientYears,
    reminderLog,
    reminderRules: rules,
    toggleReminderRule,
    updateReminderRule,
    logReminderSent,
  } = useData()
  const { show } = useToast()
  const [tab, setTab] = useState('rules')
  const [editing, setEditing] = useState<ReminderRule | null>(null)
  const [businessFilter, setBusinessFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [duePage, setDuePage] = useState<number>(1)
  const [duePageSize, setDuePageSize] = useState<number>(10)
  const [logPage, setLogPage] = useState<number>(1)
  const [logPageSize, setLogPageSize] = useState<number>(10)
  const today = useMemo(() => todayIso(), [])

  const isYearClosed = useCallback(
    (clientId: string, taxYear: number) =>
      clientYears.some((y) => y.clientId === clientId && y.taxYear === taxYear && y.status === 'closed'),
    [clientYears],
  )

  const due = useMemo(() => {
    return dueReminders({
      rules,
      documents: clientDocuments,
      documentTypes,
      filingPeriods,
      obligationTypes,
      isYearClosed,
      log: reminderLog,
      today,
    })
  }, [rules, clientDocuments, documentTypes, filingPeriods, obligationTypes, isYearClosed, reminderLog, today])

  const upcomingCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const rule of rules) {
      map.set(
        rule.id,
        upcomingForRule({
          rule,
          documents: clientDocuments,
          documentTypes,
          filingPeriods,
          horizonDays: 90,
          today,
        }).length,
      )
    }
    return map
  }, [rules, clientDocuments, documentTypes, filingPeriods, today])

  const obligationRules = rules.filter((r) => r.subjectKind === 'obligation')
  const documentRules = rules.filter((r) => r.subjectKind === 'document')

  function toggleChannel(rule: ReminderRule, channel: Channel) {
    const next = rule.channels.includes(channel) ? rule.channels.filter((c) => c !== channel) : [...rule.channels, channel]
    setEditing({ ...rule, channels: next })
  }

  function saveRule() {
    if (!editing) return
    updateReminderRule(editing.id, {
      daysBefore: editing.daysBefore,
      channels: editing.channels,
      audience: editing.channels.length > 0 ? 'both' : 'internal',
    })
    show(`Saved rules for ${editing.subjectName}`)
    setEditing(null)
  }

  const filteredDue = useMemo(() => {
    return due.filter((d) => {
      if (businessFilter !== 'all' && d.clientId !== businessFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const client = clients.find((c) => c.id === d.clientId)
        const matchSubj = d.subject.toLowerCase().includes(q)
        const matchClient =
          client?.name.toLowerCase().includes(q) || (client?.businessName && client.businessName.toLowerCase().includes(q))
        if (!matchSubj && !matchClient) return false
      }
      return true
    })
  }, [due, businessFilter, searchQuery, clients])

  const filteredLog = useMemo(() => {
    return reminderLog.filter((entry) => {
      if (businessFilter !== 'all' && entry.clientId !== businessFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const client = clients.find((c) => c.id === entry.clientId)
        const matchSubj = entry.subject.toLowerCase().includes(q)
        const matchClient =
          client?.name.toLowerCase().includes(q) || (client?.businessName && client.businessName.toLowerCase().includes(q))
        if (!matchSubj && !matchClient) return false
      }
      return true
    })
  }, [reminderLog, businessFilter, searchQuery, clients])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">Reminders &amp; Alert Rules</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Universal in-app push alerts for all users, plus optional WhatsApp, Email &amp; SMS delivery to clients.
          </p>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'rules', label: 'Reminder Rules', count: rules.filter((r) => r.enabled).length },
          { id: 'due', label: 'Due Today', count: due.length },
          { id: 'log', label: 'Reminder Log', count: reminderLog.length },
        ]}
        active={tab}
        onChange={(t) => {
          setTab(t)
          setDuePage(1)
          setLogPage(1)
        }}
      />

      {tab === 'rules' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Statutory Obligations (FTA Filings)</CardTitle>
            </CardHeader>
            <CardBody className="divide-y divide-ink-100 dark:divide-ink-800">
              {obligationRules.map((rule) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  upcoming={upcomingCounts.get(rule.id) ?? 0}
                  onToggle={() => toggleReminderRule(rule.id)}
                  onEdit={() => setEditing({ ...rule })}
                />
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Corporate Documents (Expiry)</CardTitle>
            </CardHeader>
            <CardBody className="divide-y divide-ink-100 dark:divide-ink-800">
              {documentRules.map((rule) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  upcoming={upcomingCounts.get(rule.id) ?? 0}
                  onToggle={() => toggleReminderRule(rule.id)}
                  onEdit={() => setEditing({ ...rule })}
                />
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'due' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <CardTitle>Due Today</CardTitle>
                <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                  Deadlines matching configured countdown milestones for today ({formatDate(today)}).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-44">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
                  <Input
                    placeholder="Search due reminders..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setDuePage(1)
                    }}
                    className="pl-9 text-xs"
                  />
                </div>
                <Select
                  value={businessFilter}
                  onChange={(e) => {
                    setBusinessFilter(e.target.value)
                    setDuePage(1)
                  }}
                  className="min-w-44 text-xs"
                >
                  <option value="all">All Businesses &amp; Clients</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName ? `${c.businessName} (${c.name})` : c.name}
                    </option>
                  ))}
                </Select>
                <Select
                  className="w-36 text-xs"
                  value={String(duePageSize)}
                  onChange={(e) => {
                    setDuePageSize(Number(e.target.value))
                    setDuePage(1)
                  }}
                >
                  <option value="5">5 / page</option>
                  <option value="10">10 / page</option>
                  <option value="25">25 / page</option>
                  <option value="50">50 / page</option>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {filteredDue.length === 0 ? (
              <EmptyState
                icon={<BellRing className="h-5 w-5" />}
                title="No reminders due today"
                description={
                  due.length === 0
                    ? 'None of your clients have filing deadlines or document expiries matching a reminder milestone today.'
                    : 'Try clearing the search or business filter to see other due reminders.'
                }
              />
            ) : (
              <div className="divide-y divide-ink-100 dark:divide-ink-800">
                {filteredDue
                  .slice((duePage - 1) * duePageSize, duePage * duePageSize)
                  .map((d) => {
                    const client = clients.find((c) => c.id === d.clientId)
                    const hasClientChannels = d.rule.channels.length > 0
                    return (
                      <div key={d.key} className="flex flex-wrap items-center gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">{d.subject}</p>
                          <p className="text-xs text-ink-500 dark:text-ink-400">
                            <Link to={`/clients/${d.clientId}`} className="font-medium text-accent-600 hover:underline">
                              {client?.businessName || client?.name || '—'}
                            </Link>
                            {client?.businessName && <span className="text-ink-400"> ({client.name})</span>}
                            {' · '}
                            <span className="capitalize">{MILESTONE_LABEL(d.milestone)}</span> · due {formatDate(d.targetDate)}
                          </p>
                        </div>
                        {hasClientChannels ? (
                          <div className="flex gap-1">
                            {d.rule.channels.map((ch) => {
                              const Icon = channelIcon[ch]
                              return (
                                <span
                                  key={ch}
                                  title={channelLabel[ch]}
                                  className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-50 text-accent-600 dark:bg-accent-900/30"
                                >
                                  <Icon className="h-3 w-3" />
                                </span>
                              )
                            })}
                          </div>
                        ) : (
                          <Badge tone="neutral" size="sm">
                            <BellRing className="mr-1 inline h-3 w-3" />
                            Internal In-App
                          </Badge>
                        )}
                        <Button
                          variant="secondary"
                          disabled={!!d.alreadySentAt}
                          onClick={() => {
                            if (hasClientChannels) {
                              logReminderSent({
                                clientId: d.clientId,
                                subject: d.subject,
                                channels: d.rule.channels,
                                audience: 'both',
                                filingPeriodId: d.filingPeriodId,
                                documentId: d.documentId,
                              })
                              show(`Dispatched via ${d.rule.channels.join(', ')} to ${client?.businessName || client?.name || 'client'} (In-App active)`)
                            } else {
                              show(`In-App push notification & worklist alert active for internal staff`)
                            }
                          }}
                          icon={hasClientChannels ? <Send className="h-3.5 w-3.5" /> : <BellRing className="h-3.5 w-3.5" />}
                        >
                          {d.alreadySentAt
                            ? 'Sent today'
                            : hasClientChannels
                            ? 'Send to Client'
                            : 'In-App Alert Active'}
                        </Button>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardBody>
          <Pagination
            page={duePage}
            pageSize={duePageSize}
            totalItems={filteredDue.length}
            onPageChange={setDuePage}
            onPageSizeChange={setDuePageSize}
            itemLabel="due reminders"
          />
        </Card>
      )}

      {tab === 'log' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <CardTitle>Reminder Log</CardTitle>
                <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                  Immutable audit trail of messages sent across WhatsApp, Email &amp; SMS.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-44">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
                  <Input
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setLogPage(1)
                    }}
                    className="pl-9 text-xs"
                  />
                </div>
                <Select
                  value={businessFilter}
                  onChange={(e) => {
                    setBusinessFilter(e.target.value)
                    setLogPage(1)
                  }}
                  className="min-w-44 text-xs"
                >
                  <option value="all">All Businesses &amp; Clients</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName ? `${c.businessName} (${c.name})` : c.name}
                    </option>
                  ))}
                </Select>
                <Select
                  className="w-36 text-xs"
                  value={String(logPageSize)}
                  onChange={(e) => {
                    setLogPageSize(Number(e.target.value))
                    setLogPage(1)
                  }}
                >
                  <option value="5">5 / page</option>
                  <option value="10">10 / page</option>
                  <option value="25">25 / page</option>
                  <option value="50">50 / page</option>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {filteredLog.length === 0 ? (
              <EmptyState
                icon={<BellRing className="h-5 w-5" />}
                title="No reminders logged"
                description="When reminders fire or are dispatched, their delivery records appear here."
              />
            ) : (
              <div className="divide-y divide-ink-100 dark:divide-ink-800">
                {filteredLog
                  .slice((logPage - 1) * logPageSize, logPage * logPageSize)
                  .map((entry) => {
                    const client = clients.find((c) => c.id === entry.clientId)
                    const Icon = channelIcon[entry.channel]
                    return (
                      <div key={entry.id} className="flex flex-wrap items-center gap-3 py-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-900/30">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">{entry.subject}</p>
                          <p className="text-xs text-ink-500 dark:text-ink-400">
                            {client?.businessName || client?.name || '—'}
                            {client?.businessName && <span className="text-ink-400"> ({client.name})</span>}
                            {' · '}
                            via <span className="font-medium">{channelLabel[entry.channel]}</span> · {formatDate(entry.sentAt)}
                          </p>
                        </div>
                        <Badge tone="success" size="sm">
                          Delivered
                        </Badge>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardBody>
          <Pagination
            page={logPage}
            pageSize={logPageSize}
            totalItems={filteredLog.length}
            onPageChange={setLogPage}
            onPageSizeChange={setLogPageSize}
            itemLabel="log entries"
          />
        </Card>
      )}

      {/* Edit Rule Modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${editing.subjectName} Rule` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveRule}>Save Rule</Button>
          </>
        }
      >
        {editing && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-accent-200 bg-accent-50/70 p-3.5 dark:border-accent-800 dark:bg-accent-950/30">
              <div className="flex items-start gap-2.5">
                <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-accent-600 dark:text-accent-400" />
                <div>
                  <p className="text-xs font-semibold text-accent-900 dark:text-accent-200">
                    🔔 Universal In-App Push Alerts (Always Active)
                  </p>
                  <p className="mt-0.5 text-[11px] text-accent-700 dark:text-accent-300">
                    Internal firm members and clients in portal automatically receive in-app push alerts and dashboard worklist reminders.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label hint="click presets or type custom days and hit enter">
                {editing.subjectKind === 'obligation' ? 'Remind before the due date' : 'Remind before expiry'}
              </Label>
              <MilestoneTagInput
                value={editing.daysBefore}
                onChange={(days) => setEditing({ ...editing, daysBefore: days })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Client External Channels</Label>
                <span className="text-[11px] text-ink-400">Optional extra delivery for client</span>
              </div>
              <div className="flex gap-2">
                {(['whatsapp', 'email', 'sms'] as Channel[]).map((ch) => {
                  const Icon = channelIcon[ch]
                  const active = editing.channels.includes(ch)
                  return (
                    <button
                      key={ch}
                      onClick={() => toggleChannel(editing, ch)}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-400'
                          : 'border-ink-200 text-ink-500 dark:border-ink-700',
                      )}
                    >
                      <Icon className="h-4 w-4" /> {channelLabel[ch]}
                    </button>
                  )
                })}
              </div>
              {editing.channels.length > 0 ? (
                <p className="mt-1.5 text-xs text-ink-400">
                  📱 The client will be chased on {editing.channels.map((c) => channelLabel[c]).join(', ')} in addition to in-app alerts.
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-ink-400">
                  ℹ️ No client channels selected — this rule operates strictly as an internal firm worklist reminder.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function MilestoneTagInput({
  value,
  onChange,
}: {
  value: number[]
  onChange: (days: number[]) => void
}) {
  const [inputVal, setInputVal] = useState('')

  function addDay(day: number) {
    if (isNaN(day) || day < 0) return
    if (!value.includes(day)) {
      const next = [...value, day].sort((a, b) => b - a)
      onChange(next)
    }
    setInputVal('')
  }

  function removeDay(day: number) {
    onChange(value.filter((d) => d !== day))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const num = parseInt(inputVal.trim())
      if (!isNaN(num)) {
        addDay(num)
      }
    } else if (e.key === 'Backspace' && !inputVal && value.length > 0) {
      removeDay(value[value.length - 1])
    }
  }

  const commonPresets = [90, 60, 30, 15, 7, 3, 0]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-lg border border-ink-200 bg-white p-2 dark:border-ink-700 dark:bg-ink-900">
        {value.map((d) => (
          <span
            key={d}
            className="inline-flex items-center gap-1 rounded-md bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-700 dark:bg-accent-950/50 dark:text-accent-300"
          >
            <span>{d === 0 ? 'On Due Date (Day 0)' : `${d} days before`}</span>
            <button
              type="button"
              onClick={() => removeDay(d)}
              className="rounded-full p-0.5 text-accent-400 hover:bg-accent-200/50 hover:text-accent-800 dark:hover:bg-accent-800 dark:hover:text-accent-100"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <div className="flex flex-1 items-center min-w-[120px]">
          <input
            type="number"
            min="0"
            placeholder={value.length === 0 ? 'Type days (e.g. 30) and press Enter' : '+ Add days...'}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent px-1.5 py-1 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none dark:text-ink-100"
          />
          {inputVal && (
            <button
              type="button"
              onClick={() => addDay(parseInt(inputVal.trim()))}
              className="rounded bg-accent-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-accent-700"
            >
              Add
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
        <span className="text-[11px]">Quick add presets:</span>
        {commonPresets.map((p) => {
          const exists = value.includes(p)
          return (
            <button
              key={p}
              type="button"
              disabled={exists}
              onClick={() => addDay(p)}
              className={cn(
                'rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors',
                exists
                  ? 'border-ink-100 bg-ink-50 text-ink-300 dark:border-ink-800 dark:bg-ink-800/40 dark:text-ink-600 cursor-not-allowed'
                  : 'border-ink-200 bg-white text-ink-700 hover:border-accent-400 hover:bg-accent-50 hover:text-accent-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-accent-950/30 dark:hover:text-accent-400',
              )}
            >
              +{p === 0 ? 'Due Day (0)' : `${p}d`}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RuleRow({
  rule,
  upcoming,
  onToggle,
  onEdit,
}: {
  rule: ReminderRule
  upcoming: number
  onToggle: () => void
  onEdit: () => void
}) {
  const hasClientChannels = rule.channels.length > 0
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg px-2 py-3 hover:bg-ink-50 dark:hover:bg-ink-800">
      <Switch checked={rule.enabled} onChange={onToggle} />
      <div className="min-w-40 flex-1">
        <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{rule.subjectName}</p>
        <p className="text-xs text-ink-400">
          {upcoming > 0 ? `${upcoming} within the next 90 days` : 'nothing due in the next 90 days'}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {rule.daysBefore.map((d) => (
          <Badge key={d} tone="neutral" size="sm">
            {MILESTONE_LABEL(d)}
          </Badge>
        ))}
        {rule.daysBefore.length === 0 && <span className="text-xs text-ink-400">No reminders</span>}
      </div>

      <div className="flex gap-1.5">
        {hasClientChannels ? (
          rule.channels.map((ch) => {
            const Icon = channelIcon[ch]
            return (
              <span
                key={ch}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-50 text-accent-600 dark:bg-accent-900/30"
                title={`Client notified via ${channelLabel[ch]}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
            )
          })
        ) : (
          <Badge tone="neutral" size="sm">
            <BellRing className="mr-1 inline h-3 w-3" />
            Internal In-App
          </Badge>
        )}
      </div>
      <button
        onClick={onEdit}
        aria-label={`Edit ${rule.subjectName} reminder`}
        className="ml-auto rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-700"
      >
        <Settings2 className="h-4 w-4" />
      </button>
    </div>
  )
}
