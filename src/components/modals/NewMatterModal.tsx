import { useEffect, useState } from 'react'
import { AlertTriangle, Building2, UserCheck } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Label, Select, ErrorText, invalidFieldClass } from '../ui/Field'
import { useData } from '../../data/store'
import { flattenServices, serviceLabel } from '../../data/serviceTree'
import { useToast } from '../../lib/toast'
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
            {flattenServices(services).map(({ service: s }) => (
              <option key={s.id} value={s.id}>
                {serviceLabel(s, services)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label hint="optional">Due Date</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        {penaltyApplies && (
          <div>
            <Label>Who opened this matter?</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={clientInitiated}
                onClick={() => setClientInitiated(true)}
                className={cn(
                  'flex flex-col gap-1 rounded-xl border p-3 text-left transition-all',
                  clientInitiated
                    ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
                    : 'border-ink-200 hover:border-accent-300 dark:border-ink-700',
                )}
              >
                <span className="flex items-center gap-1.5">
                  <UserCheck className={cn('h-4 w-4', clientInitiated ? 'text-accent-600' : 'text-ink-400')} />
                  <span className="text-sm font-medium text-ink-800 dark:text-ink-100">The client</span>
                </span>
                <span className="text-xs text-ink-500 dark:text-ink-400">Requested by the client — no fee</span>
              </button>
              <button
                type="button"
                aria-pressed={!clientInitiated}
                onClick={() => setClientInitiated(false)}
                className={cn(
                  'flex flex-col gap-1 rounded-xl border p-3 text-left transition-all',
                  !clientInitiated
                    ? 'border-warning-500 bg-warning-50 dark:bg-warning-900/20'
                    : 'border-ink-200 hover:border-warning-300 dark:border-ink-700',
                )}
              >
                <span className="flex items-center gap-1.5">
                  <Building2 className={cn('h-4 w-4', !clientInitiated ? 'text-warning-600' : 'text-ink-400')} />
                  <span className="text-sm font-medium text-ink-800 dark:text-ink-100">The firm</span>
                </span>
                <span className="text-xs text-ink-500 dark:text-ink-400">Opened without the client asking</span>
                <span
                  className={cn(
                    'flex items-center gap-1 text-xs font-medium',
                    !clientInitiated ? 'text-warning-700 dark:text-warning-500' : 'text-ink-400',
                  )}
                >
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {formatAED(penaltyFeeRule.amount)} fee · waivable
                </span>
              </button>
            </div>
            {willCharge && (
              <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
                Added to {clientName}'s next invoice — waivable from the matter until it is billed.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
