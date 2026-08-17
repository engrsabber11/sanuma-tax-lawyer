import { useEffect, useState } from 'react'
import { MessageCircle, Mail, MessageSquare } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Label, Select, ErrorText, invalidFieldClass } from '../ui/Field'
import { Switch } from '../ui/Switch'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'
import { cn, sleep } from '../../lib/utils'
import type { Channel, DocumentCategory } from '../../data/types'

const channelIcon: Record<Channel, typeof Mail> = { whatsapp: MessageCircle, email: Mail, sms: MessageSquare }
const channelLabel: Record<Channel, string> = { whatsapp: 'WhatsApp', email: 'Email', sms: 'SMS' }

export function NewDocumentTypeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addDocumentType } = useData()
  const { show } = useToast()
  const [name, setName] = useState('')
  const [category, setCategory] = useState<DocumentCategory>('business')
  const [hasExpiry, setHasExpiry] = useState(true)
  const [daysBefore, setDaysBefore] = useState('30, 7')
  const [channels, setChannels] = useState<Channel[]>(['whatsapp', 'email'])
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setCategory('business')
      setHasExpiry(true)
      setDaysBefore('30, 7')
      setChannels(['whatsapp', 'email'])
      setShowErrors(false)
    }
  }, [open])

  function toggleChannel(ch: Channel) {
    setChannels((cs) => (cs.includes(ch) ? cs.filter((c) => c !== ch) : [...cs, ch]))
  }

  const nameError = !name.trim() ? 'Name is required' : null

  async function submit() {
    if (nameError) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    await sleep(400 + Math.random() * 200)
    addDocumentType({
      name,
      category,
      hasExpiry,
      defaultReminderDays: hasExpiry
        ? daysBefore
            .split(',')
            .map((v) => parseInt(v.trim()))
            .filter((n) => !isNaN(n))
        : [],
      defaultChannels: hasExpiry ? channels : [],
    })
    show(`Document type "${name}" added`)
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Document Type"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            Add Document Type
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <Label>Name</Label>
          <Input
            placeholder="e.g. Health Insurance Card"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cn(showErrors && nameError && invalidFieldClass)}
            autoFocus
          />
          {showErrors && nameError && <ErrorText>{nameError}</ErrorText>}
        </div>
        <div>
          <Label>Category</Label>
          <Select value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)}>
            <option value="personal">Personal</option>
            <option value="business">Business</option>
            <option value="tax">Tax &amp; Regulatory</option>
            <option value="financial">Financial</option>
          </Select>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-ink-200/70 px-3.5 py-2.5 dark:border-ink-800">
          <p className="text-sm font-medium text-ink-700 dark:text-ink-200">Has an expiry date</p>
          <Switch checked={hasExpiry} onChange={() => setHasExpiry((v) => !v)} />
        </div>
        {hasExpiry && (
          <>
            <div>
              <Label hint="comma separated days">Default reminder schedule</Label>
              <Input value={daysBefore} onChange={(e) => setDaysBefore(e.target.value)} placeholder="e.g. 60, 30, 7" />
            </div>
            <div>
              <Label>Default Channels</Label>
              <div className="flex gap-2">
                {(['whatsapp', 'email', 'sms'] as Channel[]).map((ch) => {
                  const Icon = channelIcon[ch]
                  const active = channels.includes(ch)
                  return (
                    <button
                      key={ch}
                      onClick={() => toggleChannel(ch)}
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
          </>
        )}
      </div>
    </Modal>
  )
}
