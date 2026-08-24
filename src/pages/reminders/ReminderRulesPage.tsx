import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Mail, MessageSquare, Settings2, BellRing, Send, Building2, User, Users } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Label, Input } from '../../components/ui/Field'
import { Tabs } from '../../components/ui/Tabs'
import { Switch } from '../../components/ui/Switch'
import { EmptyState } from '../../components/ui/EmptyState'
import { useData } from '../../data/store'
import { dueReminders, upcomingForRule, MILESTONE_LABEL } from '../../data/reminders'
import { useToast } from '../../lib/toast'
import type { Channel, ReminderAudience, ReminderRule } from '../../data/types'
import { formatDate, todayIso } from '../../lib/utils'
import { cn } from '../../lib/utils'

const channelIcon: Record<Channel, typeof Mail> = { whatsapp: MessageCircle, email: Mail, sms: MessageSquare }
const channelLabel: Record<Channel, string> = { whatsapp: 'WhatsApp', email: 'Email', sms: 'SMS' }

const audienceMeta: Record<ReminderAudience, { label: string; icon: typeof User; hint: string }> = {
  client: { label: 'Client', icon: User, hint: 'Sent to the client through the channels below' },
  internal: { label: 'Internal', icon: Building2, hint: 'Appears on the firm worklist only — no message sent' },
  both: { label: 'Both', icon: Users, hint: 'Chases the client and flags it on the firm worklist' },
}

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
  // The real clock, not the seed's TODAY — see todayIso().
  const today = useMemo(() => todayIso(), [])

  // Stable so the derivation memo below can depend on it honestly.
  const isYearClosed = useCallback(
    (clientId: string, taxYear: number) =>
      clientYears.some((y) => y.clientId === clientId && y.taxYear === taxYear && y.status === 'closed'),
    [clientYears],
  )

  const due = useMemo(
    () =>
      dueReminders({
        rules,
        documents: clientDocuments,
        documentTypes,
        filingPeriods,
        obligationTypes,
        isYearClosed,
        log: reminderLog,
        today,
      }),
    [rules, clientDocuments, documentTypes, filingPeriods, obligationTypes, isYearClosed, reminderLog, today],
  )

  function toggleChannel(rule: ReminderRule, ch: Channel) {
    setEditing((r) =>
      r && r.id === rule.id
        ? { ...r, channels: r.channels.includes(ch) ? r.channels.filter((c) => c !== ch) : [...r.channels, ch] }
        : r,
    )
  }

  function saveEdit() {
    if (!editing) return
    updateReminderRule(editing.id, editing)
    show('Reminder rule updated')
    setEditing(null)
  }

  const obligationRules = rules.filter((r) => r.subjectKind === 'obligation')
  const documentRules = rules.filter((r) => r.subjectKind === 'document')

  // Document rules stay grouped by category, exactly as before.
  const docGrouped = documentTypes
    .filter((t) => t.hasExpiry)
    .reduce<Record<string, ReminderRule[]>>((acc, t) => {
      const rule = documentRules.find((r) => r.subjectTypeId === t.id)
      if (!rule) return acc
      acc[t.category] = acc[t.category] ?? []
      acc[t.category].push(rule)
      return acc
    }, {})

  const categoryLabel: Record<string, string> = {
    personal: 'Personal Documents',
    business: 'Business Licensing',
    tax: 'Tax & Regulatory',
    financial: 'Financial',
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">Reminders</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          When and how clients are chased before a filing falls due or a document expires.
        </p>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'rules', label: 'Reminder Rules', count: rules.filter((r) => r.enabled).length },
          { id: 'due', label: 'Due Today', count: due.length || undefined },
          { id: 'log', label: 'Reminder Log', count: reminderLog.length },
        ]}
      />

      {tab === 'rules' && (
        <div className="flex flex-col gap-5">
          {/* Filing deadlines first — the practice's primary work. */}
          <Card>
            <CardHeader>
              <CardTitle>Filing Deadlines</CardTitle>
              <span className="text-xs text-ink-400">Driven by each client&rsquo;s generated schedule</span>
            </CardHeader>
            <CardBody className="flex flex-col gap-1 pt-2">
              {obligationRules.map((rule) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  upcoming={
                    upcomingForRule({
                      rule,
                      documents: clientDocuments,
                      documentTypes,
                      filingPeriods,
                      today,
                      horizonDays: 90,
                    }).length
                  }
                  onToggle={() => toggleReminderRule(rule.id)}
                  onEdit={() => setEditing(rule)}
                />
              ))}
              {obligationRules.length === 0 && (
                <p className="px-2 py-3 text-sm text-ink-400">No obligation types in the catalog yet.</p>
              )}
            </CardBody>
          </Card>

          {Object.entries(docGrouped).map(([cat, catRules]) => (
            <Card key={cat}>
              <CardHeader>
                <CardTitle>{categoryLabel[cat]}</CardTitle>
                <span className="text-xs text-ink-400">Document expiry</span>
              </CardHeader>
              <CardBody className="flex flex-col gap-1 pt-2">
                {catRules.map((rule) => (
                  <RuleRow
                    key={rule.id}
                    rule={rule}
                    upcoming={
                      upcomingForRule({
                        rule,
                        documents: clientDocuments,
                        documentTypes,
                        filingPeriods,
                        today,
                        horizonDays: 90,
                      }).length
                    }
                    onToggle={() => toggleReminderRule(rule.id)}
                    onEdit={() => setEditing(rule)}
                  />
                ))}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {tab === 'due' && (
        <Card>
          <CardHeader>
            <CardTitle>Would fire on {formatDate(today)}</CardTitle>
            <span className="text-xs text-ink-400">
              Derived from the rules above — nothing is sent until you send it
            </span>
          </CardHeader>
          <CardBody className="pt-1">
            {due.length === 0 ? (
              <EmptyState
                icon={<BellRing className="h-5 w-5" />}
                title="Nothing lands on a milestone today"
                description="A reminder fires when the days remaining exactly matches one of a rule's milestones. Check the rules tab to see what each one covers."
              />
            ) : (
              <div className="divide-y divide-ink-100 dark:divide-ink-800">
                {due.map((d) => {
                  const client = clients.find((c) => c.id === d.clientId)
                  const meta = audienceMeta[d.audience]
                  return (
                    <div key={d.key} className="flex flex-wrap items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-800 dark:text-ink-100">{d.subject}</p>
                        <p className="text-xs text-ink-400">
                          <Link to={`/clients/${d.clientId}`} className="hover:underline">
                            {client?.businessName ?? client?.name ?? '—'}
                          </Link>{' '}
                          · {MILESTONE_LABEL(d.milestone)} · due {formatDate(d.targetDate)}
                        </p>
                      </div>
                      <Badge tone={d.alreadySentAt ? 'success' : 'neutral'} size="sm">
                        <meta.icon className="mr-1 inline h-3 w-3" />
                        {meta.label}
                      </Badge>
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
                      <Button
                        variant="secondary"
                        disabled={!!d.alreadySentAt || d.audience === 'internal' || d.rule.channels.length === 0}
                        onClick={() => {
                          logReminderSent({
                            clientId: d.clientId,
                            subject: d.subject,
                            channels: d.rule.channels,
                            audience: d.audience,
                            filingPeriodId: d.filingPeriodId,
                            documentId: d.documentId,
                          })
                          show(`Reminder logged for ${client?.name ?? 'client'}`)
                        }}
                        icon={<Send className="h-3.5 w-3.5" />}
                      >
                        {d.alreadySentAt ? 'Sent today' : d.audience === 'internal' ? 'Worklist only' : 'Log as sent'}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'log' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800">
                  <th className="px-5 py-3 font-medium">Reminder</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">About</th>
                  <th className="px-5 py-3 font-medium">Channel</th>
                  <th className="px-5 py-3 font-medium">Sent</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {reminderLog
                  .slice()
                  .reverse()
                  .map((log) => {
                    const client = clients.find((c) => c.id === log.clientId)
                    const Icon = channelIcon[log.channel]
                    const period = log.filingPeriodId
                      ? filingPeriods.find((p) => p.id === log.filingPeriodId)
                      : undefined
                    return (
                      <tr key={log.id} className="border-b border-ink-50 last:border-0 dark:border-ink-800/60">
                        <td className="flex items-center gap-2.5 px-5 py-3.5 font-medium text-ink-800 dark:text-ink-100">
                          <BellRing className="h-4 w-4 shrink-0 text-ink-400" /> {log.subject}
                        </td>
                        <td className="px-5 py-3.5 text-ink-600 dark:text-ink-300">{client?.name}</td>
                        <td className="px-5 py-3.5 text-xs text-ink-400">
                          {period ? (
                            <Link to="/filings" className="hover:underline">
                              {period.label}
                            </Link>
                          ) : log.documentId ? (
                            'document expiry'
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="flex items-center gap-1.5 text-ink-500 dark:text-ink-400">
                            <Icon className="h-3.5 w-3.5" /> {channelLabel[log.channel]}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-ink-500 dark:text-ink-400">{formatDate(log.sentAt)}</td>
                        <td className="px-5 py-3.5">
                          <Badge
                            tone={log.status === 'delivered' ? 'success' : log.status === 'failed' ? 'danger' : 'neutral'}
                          >
                            {log.status}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Edit Reminder — ${editing.subjectName}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save Rule</Button>
          </>
        }
      >
        {editing && (
          <div className="flex flex-col gap-4">
            <div>
              <Label hint="comma separated days, 0 = on the day">
                {editing.subjectKind === 'obligation' ? 'Remind before the due date' : 'Remind before expiry'}
              </Label>
              <Input
                value={editing.daysBefore.join(', ')}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    daysBefore: e.target.value
                      .split(',')
                      .map((v) => parseInt(v.trim()))
                      .filter((n) => !isNaN(n) && n >= 0)
                      .sort((a, b) => b - a),
                  })
                }
              />
              <p className="mt-1.5 text-xs text-ink-400">
                e.g. &ldquo;60, 30, 15, 7, 0&rdquo; — five staged reminders ending on the day itself.
              </p>
            </div>

            <div>
              <Label>Who is reminded</Label>
              <div className="flex gap-2">
                {(['client', 'internal', 'both'] as ReminderAudience[]).map((a) => {
                  const meta = audienceMeta[a]
                  const active = editing.audience === a
                  return (
                    <button
                      key={a}
                      onClick={() => setEditing({ ...editing, audience: a })}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-400'
                          : 'border-ink-200 text-ink-500 dark:border-ink-700',
                      )}
                    >
                      <meta.icon className="h-4 w-4" /> {meta.label}
                    </button>
                  )
                })}
              </div>
              <p className="mt-1.5 text-xs text-ink-400">{audienceMeta[editing.audience].hint}</p>
            </div>

            <div>
              <Label>Channels</Label>
              <div className="flex gap-2">
                {(['whatsapp', 'email', 'sms'] as Channel[]).map((ch) => {
                  const Icon = channelIcon[ch]
                  const active = editing.channels.includes(ch)
                  return (
                    <button
                      key={ch}
                      onClick={() => toggleChannel(editing, ch)}
                      disabled={editing.audience === 'internal'}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-400'
                          : 'border-ink-200 text-ink-500 dark:border-ink-700',
                        editing.audience === 'internal' && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      <Icon className="h-4 w-4" /> {channelLabel[ch]}
                    </button>
                  )
                })}
              </div>
              {editing.audience === 'internal' && (
                <p className="mt-1.5 text-xs text-ink-400">
                  Internal reminders appear on the firm worklist — no message is sent, so channels do not apply.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
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
  const meta = audienceMeta[rule.audience]
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
      <Badge tone="neutral" size="sm">
        <meta.icon className="mr-1 inline h-3 w-3" />
        {meta.label}
      </Badge>
      <div className="flex gap-1.5">
        {rule.audience !== 'internal' &&
          rule.channels.map((ch) => {
            const Icon = channelIcon[ch]
            return (
              <span
                key={ch}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-50 text-accent-600 dark:bg-accent-900/30"
                title={channelLabel[ch]}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
            )
          })}
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
