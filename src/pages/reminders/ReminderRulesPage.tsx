import { useState } from 'react'
import { MessageCircle, Mail, MessageSquare, Settings2, BellRing } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Label, Input } from '../../components/ui/Field'
import { Tabs } from '../../components/ui/Tabs'
import { Switch } from '../../components/ui/Switch'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'
import type { Channel, ReminderRule } from '../../data/types'
import { formatDate } from '../../lib/utils'
import { cn } from '../../lib/utils'

const channelIcon: Record<Channel, typeof Mail> = { whatsapp: MessageCircle, email: Mail, sms: MessageSquare }
const channelLabel: Record<Channel, string> = { whatsapp: 'WhatsApp', email: 'Email', sms: 'SMS' }

export function ReminderRulesPage() {
  const { clients, documentTypes, reminderLog, reminderRules: rules, toggleReminderRule, updateReminderRule } = useData()
  const { show } = useToast()
  const [tab, setTab] = useState('rules')
  const [editing, setEditing] = useState<ReminderRule | null>(null)

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

  const grouped = documentTypes
    .filter((t) => t.hasExpiry)
    .reduce<Record<string, ReminderRule[]>>((acc, t) => {
      const rule = rules.find((r) => r.typeId === t.id)
      if (!rule) return acc
      acc[t.category] = acc[t.category] ?? []
      acc[t.category].push(rule)
      return acc
    }, {})

  const categoryLabel: Record<string, string> = { personal: 'Personal Documents', business: 'Business Licensing', tax: 'Tax & Regulatory', financial: 'Financial' }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">Reminders</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Configure when and how clients are reminded before something expires or falls due.</p>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'rules', label: 'Reminder Rules', count: rules.filter((r) => r.enabled).length },
          { id: 'log', label: 'Reminder Log', count: reminderLog.length },
        ]}
      />

      {tab === 'rules' && (
        <div className="flex flex-col gap-5">
          {Object.entries(grouped).map(([cat, catRules]) => (
            <Card key={cat}>
              <CardHeader>
                <CardTitle>{categoryLabel[cat]}</CardTitle>
              </CardHeader>
              <CardBody className="flex flex-col gap-1 pt-2">
                {catRules.map((rule) => (
                  <div key={rule.id} className="flex flex-wrap items-center gap-3 rounded-lg px-2 py-3 hover:bg-ink-50 dark:hover:bg-ink-800">
                    <Switch checked={rule.enabled} onChange={() => toggleReminderRule(rule.id)} />
                    <p className="min-w-40 flex-1 text-sm font-medium text-ink-800 dark:text-ink-100">{rule.typeName}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {rule.daysBefore.map((d) => (
                        <Badge key={d} tone="neutral">
                          {d}d before
                        </Badge>
                      ))}
                      {rule.daysBefore.length === 0 && <span className="text-xs text-ink-400">No expiry reminders</span>}
                    </div>
                    <div className="flex gap-1.5">
                      {rule.channels.map((ch) => {
                        const Icon = channelIcon[ch]
                        return (
                          <span key={ch} className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-50 text-accent-600 dark:bg-accent-900/30" title={channelLabel[ch]}>
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                        )
                      })}
                    </div>
                    <button onClick={() => setEditing(rule)} className="ml-auto rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-700">
                      <Settings2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {tab === 'log' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800">
                  <th className="px-5 py-3 font-medium">Reminder</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Channel</th>
                  <th className="px-5 py-3 font-medium">Sent</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {reminderLog.map((log) => {
                  const client = clients.find((c) => c.id === log.clientId)
                  const Icon = channelIcon[log.channel]
                  return (
                    <tr key={log.id} className="border-b border-ink-50 last:border-0 dark:border-ink-800/60">
                      <td className="flex items-center gap-2.5 px-5 py-3.5 font-medium text-ink-800 dark:text-ink-100">
                        <BellRing className="h-4 w-4 text-ink-400" /> {log.subject}
                      </td>
                      <td className="px-5 py-3.5 text-ink-600 dark:text-ink-300">{client?.name}</td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-1.5 text-ink-500 dark:text-ink-400">
                          <Icon className="h-3.5 w-3.5" /> {channelLabel[log.channel]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-ink-500 dark:text-ink-400">{formatDate(log.sentAt)}</td>
                      <td className="px-5 py-3.5">
                        <Badge tone={log.status === 'delivered' ? 'success' : log.status === 'failed' ? 'danger' : 'neutral'}>{log.status}</Badge>
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
        title={editing ? `Edit Reminder — ${editing.typeName}` : ''}
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
              <Label hint="comma separated days">Remind before expiry</Label>
              <Input
                value={editing.daysBefore.join(', ')}
                onChange={(e) =>
                  setEditing({ ...editing, daysBefore: e.target.value.split(',').map((v) => parseInt(v.trim())).filter((n) => !isNaN(n)) })
                }
              />
              <p className="mt-1.5 text-xs text-ink-400">e.g. "60, 30, 7" sends three staged reminders.</p>
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
                      className={cn(
                        'flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors',
                        active ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-400' : 'border-ink-200 text-ink-500 dark:border-ink-700',
                      )}
                    >
                      <Icon className="h-4 w-4" /> {channelLabel[ch]}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
