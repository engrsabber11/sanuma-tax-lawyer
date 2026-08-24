import { useEffect, useState } from 'react'
import { AlertTriangle, Building2, CalendarClock, UserCheck } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Label, Select, ErrorText, invalidFieldClass } from '../ui/Field'
import { useData } from '../../data/store'
import { matterDefaultsForFiling } from '../../data/filingPeriods'
import { flattenServices, serviceLabel } from '../../data/serviceTree'
import { useToast } from '../../lib/toast'
import { cn, formatAED, formatDate, sleep } from '../../lib/utils'
import type { Matter } from '../../data/types'

export function NewMatterModal({
  open,
  onClose,
  defaultClientId,
  filingPeriodId,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  defaultClientId?: string
  /**
   * Set when the matter is being opened to file a period. Client, service, title
   * and due date arrive pre-filled and submit routes through
   * `openMatterForFiling` so the two records are linked. Absent, the modal
   * behaves exactly as the standalone "New Matter" path always has.
   */
  filingPeriodId?: string
  onCreated?: (matter: Matter) => void
}) {
  const { clients, services, obligationTypes, filingPeriods, addMatter, openMatterForFiling, penaltyFeeRule } = useData()
  const { show } = useToast()
  const [clientId, setClientId] = useState('')
  const [title, setTitle] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [dueDate, setDueDate] = useState('')
  // Defaults to off: matters are treated as firm-initiated unless staff say the client asked.
  const [clientInitiated, setClientInitiated] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const period = filingPeriodId ? filingPeriods.find((p) => p.id === filingPeriodId) : undefined
  const obligation = period ? obligationTypes.find((t) => t.id === period.obligationTypeId) : undefined
  const filingDefaults = period ? matterDefaultsForFiling(period, obligation) : undefined

  useEffect(() => {
    if (open) {
      setClientId(period?.clientId ?? defaultClientId ?? clients[0]?.id ?? '')
      setTitle(filingDefaults?.title ?? '')
      // A filing whose obligation has no service falls back to the picker rather
      // than to an arbitrary first entry — the lawyer chooses what it bills as.
      setServiceId(
        filingDefaults?.serviceId && services.some((s) => s.id === filingDefaults.serviceId)
          ? filingDefaults.serviceId
          : (services[0]?.id ?? ''),
      )
      setDueDate(filingDefaults?.dueDate ?? '')
      // Scheduled compliance work carries no penalty fee — see openMatterForFiling.
      setClientInitiated(!!period)
      setShowErrors(false)
    }
  }, [open, defaultClientId, filingPeriodId])

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
    const created = filingPeriodId
      ? openMatterForFiling(filingPeriodId, { title, serviceId, dueDate: dueDate || undefined, clientInitiated })
      : addMatter({ clientId, title, serviceId, dueDate: dueDate || undefined, clientInitiated })
    if (!created) {
      show('That filing could not be opened as a matter — pick a service it bills against.')
      setSubmitting(false)
      return
    }
    show(willCharge ? `Matter created — ${formatAED(penaltyFeeRule.amount)} penalty fee queued for ${clientName}` : `Matter "${created.title}" created`)
    onCreated?.(created)
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={period ? 'Open Matter for Filing' : 'New Matter'}
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
        {period && (
          <div className="flex items-start gap-2.5 rounded-lg bg-accent-50 px-3.5 py-3 text-xs dark:bg-accent-900/20">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-accent-600 dark:text-accent-400" />
            <div>
              <p className="font-medium text-ink-800 dark:text-ink-100">
                Files {obligation?.name ?? 'filing'} — {period.label}
              </p>
              <p className="mt-0.5 text-ink-500 dark:text-ink-400">
                Period {formatDate(period.periodStart)} – {formatDate(period.periodEnd)} · due{' '}
                {formatDate(period.dueDate)}
              </p>
            </div>
          </div>
        )}
        <div>
          <Label>Client</Label>
          <Select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={!!period}
            className={cn(period && 'cursor-not-allowed opacity-60')}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.businessName ? ` — ${c.businessName}` : ''}
              </option>
            ))}
          </Select>
          {period && (
            <p className="mt-1 text-xs text-ink-400">Set by the filing this matter belongs to.</p>
          )}
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
            {period && (
              <p className="-mt-0.5 mb-2 text-xs text-ink-500 dark:text-ink-400">
                This return is on the client's own schedule, so no fee applies. Switch it only if the client's delay is
                what forced the firm to open it.
              </p>
            )}
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
