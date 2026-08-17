import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Label, ErrorText, invalidFieldClass } from '../ui/Field'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'
import { cn, formatAED, sleep } from '../../lib/utils'
import { invoiceBalanceDue } from '../../lib/invoice'
import type { Invoice } from '../../data/types'

export function RecordPaymentModal({ invoice, open, onClose }: { invoice: Invoice; open: boolean; onClose: () => void }) {
  const { recordPayment } = useData()
  const { show } = useToast()
  const balanceDue = invoiceBalanceDue(invoice)
  const [amount, setAmount] = useState(balanceDue)
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setAmount(Math.max(balanceDue, 0))
      setShowErrors(false)
    }
  }, [open, invoice.id])

  const amountError = amount <= 0 ? 'Amount must be greater than zero' : null

  async function submit() {
    if (amountError) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    await sleep(400 + Math.random() * 200)
    recordPayment(invoice.id, amount)
    show(`Payment of ${formatAED(amount)} recorded on ${invoice.number}`)
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Record Payment — ${invoice.number}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            Record Payment
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex justify-between rounded-lg bg-ink-50 px-3.5 py-2.5 text-sm dark:bg-ink-800">
          <span className="text-ink-500 dark:text-ink-400">Balance Due</span>
          <span className="font-semibold text-ink-900 dark:text-ink-50">{formatAED(balanceDue)}</span>
        </div>
        <div>
          <Label>Amount Received (AED)</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className={cn(showErrors && amountError && invalidFieldClass)}
            autoFocus
          />
          {showErrors && amountError && <ErrorText>{amountError}</ErrorText>}
        </div>
      </div>
    </Modal>
  )
}
