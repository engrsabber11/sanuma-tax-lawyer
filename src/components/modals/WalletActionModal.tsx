import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Label, Select, ErrorText, invalidFieldClass } from '../ui/Field'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'
import { cn, formatAED, sleep } from '../../lib/utils'

export function WalletActionModal({
  clientId,
  balance,
  mode,
  open,
  onClose,
}: {
  clientId: string
  balance: number
  mode: 'withdraw' | 'apply'
  open: boolean
  onClose: () => void
}) {
  const { invoices, addWalletTransaction, applyWalletToInvoice } = useData()
  const { show } = useToast()
  const [amount, setAmount] = useState(0)
  const [invoiceId, setInvoiceId] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const unpaidInvoices = invoices.filter((i) => i.clientId === clientId && i.status !== 'paid')

  useEffect(() => {
    if (open) {
      setAmount(Math.max(balance, 0))
      setInvoiceId(unpaidInvoices[0]?.id ?? '')
      setShowErrors(false)
    }
  }, [open, mode])

  const exceedsBalance = amount > balance
  const amountError = amount <= 0 ? 'Amount must be greater than zero' : exceedsBalance ? 'Amount exceeds available balance' : null
  const isValid = !amountError && (mode === 'withdraw' || !!invoiceId)

  async function submit() {
    if (!isValid) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    await sleep(400 + Math.random() * 200)
    if (mode === 'withdraw') {
      addWalletTransaction({ clientId, type: 'debit', reason: 'Withdrawal — bank transfer', amount })
      show(`${formatAED(amount)} withdrawn from wallet`)
    } else {
      applyWalletToInvoice(clientId, invoiceId, amount)
      show(`${formatAED(amount)} applied to invoice`)
    }
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'withdraw' ? 'Withdraw from Wallet' : 'Apply Wallet to Invoice'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            Confirm
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex justify-between rounded-lg bg-ink-50 px-3.5 py-2.5 text-sm dark:bg-ink-800">
          <span className="text-ink-500 dark:text-ink-400">Available Balance</span>
          <span className="font-semibold text-ink-900 dark:text-ink-50">{formatAED(balance)}</span>
        </div>
        {mode === 'apply' && (
          <div>
            <Label>Invoice</Label>
            {unpaidInvoices.length === 0 ? (
              <p className="text-sm text-ink-400">No unpaid invoices for this client.</p>
            ) : (
              <Select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
                {unpaidInvoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.number}
                  </option>
                ))}
              </Select>
            )}
          </div>
        )}
        <div>
          <Label>Amount (AED)</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className={cn((exceedsBalance || (showErrors && amountError)) && invalidFieldClass)}
          />
          {exceedsBalance && <ErrorText>Amount exceeds available balance.</ErrorText>}
          {!exceedsBalance && showErrors && amountError && <ErrorText>{amountError}</ErrorText>}
        </div>
      </div>
    </Modal>
  )
}
