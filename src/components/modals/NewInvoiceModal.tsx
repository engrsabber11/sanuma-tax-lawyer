import { useEffect, useState } from 'react'
import { Check, CornerDownRight } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Label, Select, ErrorText } from '../ui/Field'
import { useData } from '../../data/store'
import { effectivePrice, flattenServices } from '../../data/serviceTree'
import { useToast } from '../../lib/toast'
import { addDays, cn, formatAED, sleep, todayIso } from '../../lib/utils'
import { invoiceSubtotal, invoiceVat } from '../../lib/invoice'
import type { Invoice, InvoiceLine } from '../../data/types'

export function NewInvoiceModal({
  open,
  onClose,
  defaultClientId,
  defaultMatterId,
  defaultServiceIds,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  defaultClientId?: string
  defaultMatterId?: string
  /** Services pre-ticked on open — the matter's own service when billing a filing. */
  defaultServiceIds?: string[]
  onCreated?: (invoice: Invoice) => void
}) {
  const { clients, services, addInvoice, pendingChargesForClient } = useData()
  const { show } = useToast()
  const [clientId, setClientId] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [excludedCharges, setExcludedCharges] = useState<string[]>([])
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setClientId(defaultClientId ?? clients[0]?.id ?? '')
      setSelected((defaultServiceIds ?? []).filter((id) => services.some((s) => s.id === id)))
      setDueDate(addDays(todayIso(), 14))
      setExcludedCharges([])
      setShowErrors(false)
    }
  }, [open, defaultClientId])

  // Switching client swaps in that client's queue, so stale exclusions must go.
  useEffect(() => {
    setExcludedCharges([])
  }, [clientId])

  function toggle(id: string) {
    setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]))
  }

  const clientCharges = clientId ? pendingChargesForClient(clientId) : []
  const includedCharges = clientCharges.filter((c) => !excludedCharges.includes(c.id))

  const serviceLines: InvoiceLine[] = selected.map((id) => {
    const s = services.find((x) => x.id === id)!
    return { serviceId: id, description: s.name, qty: 1, unitPrice: effectivePrice(s, services), kind: 'service' }
  })
  const chargeLines: InvoiceLine[] = includedCharges.map((c) => ({
    description: c.description,
    qty: 1,
    unitPrice: c.amount,
    kind: 'penalty',
    vatApplicable: c.vatApplicable,
  }))
  const lines = [...serviceLines, ...chargeLines]
  const subtotal = invoiceSubtotal(lines)
  const vat = invoiceVat(lines)
  const total = subtotal + vat

  async function submit() {
    if (!clientId || lines.length === 0) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    await sleep(400 + Math.random() * 200)
    const created = addInvoice({ clientId, matterId: defaultMatterId, lines, dueDate, pendingChargeIds: includedCharges.map((c) => c.id) })
    show(`Invoice ${created.number} created`)
    onCreated?.(created)
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Invoice"
      width="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            Create Invoice
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
          <Label hint={`${selected.length} selected`}>Services</Label>
          <div className="flex flex-col gap-2">
            {flattenServices(services).map(({ service: s, depth }) => {
              const active = selected.includes(s.id)
              return (
                <button
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors',
                    depth > 0 && 'ml-5',
                    active ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20' : 'border-ink-200 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800',
                  )}
                >
                  <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-md border', active ? 'border-accent-600 bg-accent-600 text-white' : 'border-ink-300 dark:border-ink-600')}>
                    {active && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="flex-1 flex items-center gap-2 text-ink-700 dark:text-ink-200">
                    {depth > 0 && <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-ink-300 dark:text-ink-600" />}
                    <span>{s.name}</span>
                  </span>
                  <span className="font-normal text-ink-500 dark:text-ink-400">{formatAED(effectivePrice(s, services))}</span>
                </button>
              )
            })}
          </div>
          {showErrors && lines.length === 0 && <ErrorText>Select at least one service</ErrorText>}
        </div>
        {clientCharges.length > 0 && (
          <div>
            <Label hint={`${includedCharges.length} of ${clientCharges.length} included`}>Pending charges</Label>
            <p className="-mt-0.5 mb-2 text-xs text-ink-500 dark:text-ink-400">
              Raised outside the catalog and waiting to be billed. Unticked charges stay in the queue for a later invoice.
            </p>
            <div className="flex flex-col gap-2">
              {clientCharges.map((c) => {
                const included = !excludedCharges.includes(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => setExcludedCharges((prev) => (included ? [...prev, c.id] : prev.filter((x) => x !== c.id)))}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors',
                      included ? 'border-warning-500 bg-warning-50 dark:bg-warning-900/20' : 'border-ink-200 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                        included ? 'border-warning-600 bg-warning-600 text-white' : 'border-ink-300 dark:border-ink-600',
                      )}
                    >
                      {included && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="flex-1 text-ink-700 dark:text-ink-200">
                      {c.description}
                      {!c.vatApplicable && <span className="ml-2 text-xs text-ink-400">VAT exempt</span>}
                    </span>
                    <span className="text-ink-500 dark:text-ink-400">{formatAED(c.amount)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <div>
          <Label>Due Date</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        {lines.length > 0 && (
          <div className="flex flex-col gap-1 rounded-lg bg-ink-50 px-3.5 py-3 text-sm dark:bg-ink-800">
            <div className="flex justify-between text-ink-500 dark:text-ink-400">
              <span>Subtotal</span>
              <span>{formatAED(subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-500 dark:text-ink-400">
              <span>VAT (5%)</span>
              <span>{formatAED(vat)}</span>
            </div>
            <div className="flex justify-between font-semibold text-ink-900 dark:text-ink-50">
              <span>Total</span>
              <span>{formatAED(total)}</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
