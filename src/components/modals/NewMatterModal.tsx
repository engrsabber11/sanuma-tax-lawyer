import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Label, Select, ErrorText, invalidFieldClass } from '../ui/Field'
import { useData } from '../../data/store'
import { flattenServices } from '../../data/serviceTree'
import { useToast } from '../../lib/toast'
import { Switch } from '../ui/Switch'
import { cn, formatAED, sleep } from '../../lib/utils'
import type { Matter } from '../../data/types'

export function NewMatterModal({
  open,
  onClose,
  defaultClientId,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  defaultClientId?: string
  onCreated?: (matter: Matter) => void
}) {
  const { clients, services, addMatter, penaltyFeeRule } = useData()
  const { show } = useToast()
  const [clientId, setClientId] = useState('')
  const [title, setTitle] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [dueDate, setDueDate] = useState('')
  // Defaults to off: matters are treated as firm-initiated unless staff say the client asked.
  const [clientInitiated, setClientInitiated] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setClientId(defaultClientId ?? clients[0]?.id ?? '')
      setTitle('')
      setServiceId(services[0]?.id ?? '')
      setDueDate('')
      setClientInitiated(false)
      setShowErrors(false)
    }
  }, [open, defaultClientId])

  const titleError = !title.trim() ? 'Matter title is required' : null
  const penaltyApplies = penaltyFeeRule.enabled && penaltyFeeRule.amount > 0
  const willCharge = penaltyApplies && !clientInitiated
  const clientName = clients.find((c) => c.id === clientId)?.name ?? 'the client'

  async function submit() {
    if (!clientId || !title.trim() || !serviceId) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    await sleep(400 + Math.random() * 200)
    const created = addMatter({ clientId, title, serviceId, dueDate: dueDate || undefined, clientInitiated })
    show(willCharge ? `Matter created — ${formatAED(penaltyFeeRule.amount)} penalty fee queued for ${clientName}` : `Matter "${created.title}" created`)
    onCreated?.(created)
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Matter"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            Create Matter
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <Label>Client</Label>
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.businessName ? ` — ${c.businessName}` : ''}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Matter Title</Label>
          <Input
            placeholder="e.g. Trade License Renewal 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={cn(showErrors && titleError && invalidFieldClass)}
            autoFocus
          />
          {showErrors && titleError && <ErrorText>{titleError}</ErrorText>}
        </div>
        <div>
          <Label>Service</Label>
          <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            {flattenServices(services).map(({ service: s, depth }) => (
              <option key={s.id} value={s.id}>
                {depth > 0 ? `  ↳ ${s.name} (Sub-service)` : s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label hint="optional">Due Date</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        {penaltyApplies && (
          <div className="rounded-xl border border-ink-200/70 dark:border-ink-800">
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <div className="pr-3">
                <p className="text-sm font-medium text-ink-700 dark:text-ink-200">Client-initiated matter</p>
                <p className="text-xs text-ink-400">Turn off if the firm opened this matter without the client asking.</p>
              </div>
              <Switch checked={clientInitiated} onChange={() => setClientInitiated((v) => !v)} />
            </div>
            {willCharge && (
              <p className="flex items-start gap-2 border-t border-ink-100 px-3.5 py-2.5 text-xs text-warning-700 dark:border-ink-800 dark:text-warning-500">
                <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>
                  A minimum penalty fee of <span className="font-semibold">{formatAED(penaltyFeeRule.amount)}</span> will be added to {clientName}'s next
                  invoice. It can be waived from the matter before it is billed.
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
