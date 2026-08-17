import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Label, Select, Textarea, ErrorText, invalidFieldClass } from '../ui/Field'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'
import { cn, formatAED, sleep } from '../../lib/utils'
import type { CreditNote } from '../../data/types'

export function NewCreditNoteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { clients, invoices, addCreditNote } = useData()
  const { show } = useToast()
  const [kind, setKind] = useState<CreditNote['kind']>('firm-issued')
  const [clientId, setClientId] = useState('')
  const [invoiceId, setInvoiceId] = useState('')
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState(0)
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setKind('firm-issued')
      setClientId(clients[0]?.id ?? '')
      setInvoiceId('')
      setReason('')
      setAmount(0)
      setShowErrors(false)
    }
  }, [open])

  const clientInvoices = invoices.filter((i) => i.clientId === clientId)
  const vatAmount = amount * 0.05
  const reasonError = !reason.trim() ? 'A reason is required' : null
  const amountError = amount <= 0 ? 'Amount must be greater than zero' : null

  async function submit() {
    if (!clientId || reasonError || amountError) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    await sleep(400 + Math.random() * 200)
    addCreditNote({ kind, clientId, invoiceId: kind === 'firm-issued' ? invoiceId || undefined : undefined, reason, amount, vatAmount })
    show('Credit note created')
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Tax Credit Note"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            Create Credit Note
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <Label>Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {(['firm-issued', 'client-advisory'] as CreditNote['kind'][]).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={cn(
                  'rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                  kind === k ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-400' : 'border-ink-200 text-ink-500 dark:border-ink-700',
                )}
              >
                {k === 'firm-issued' ? 'Firm-Issued (own invoice)' : 'Client-Advisory (deliverable)'}
              </button>
            ))}
          </div>
        </div>
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
        {kind === 'firm-issued' && (
          <div>
            <Label hint="optional">Reference Invoice</Label>
            <Select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
              <option value="">— none —</option>
              {clientInvoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.number}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div>
          <Label>Reason</Label>
          <Textarea
            placeholder="Reason for the credit note adjustment"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={cn(showErrors && reasonError && invalidFieldClass)}
          />
          {showErrors && reasonError && <ErrorText>{reasonError}</ErrorText>}
        </div>
        <div>
          <Label>Amount (AED, excl. VAT)</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className={cn(showErrors && amountError && invalidFieldClass)}
          />
          {showErrors && amountError && <ErrorText>{amountError}</ErrorText>}
        </div>
        {amount > 0 && (
          <div className="flex justify-between rounded-lg bg-ink-50 px-3.5 py-2.5 text-sm dark:bg-ink-800">
            <span className="text-ink-500 dark:text-ink-400">Total incl. {formatAED(vatAmount)} VAT</span>
            <span className="font-semibold text-ink-900 dark:text-ink-50">{formatAED(amount + vatAmount)}</span>
          </div>
        )}
      </div>
    </Modal>
  )
}
