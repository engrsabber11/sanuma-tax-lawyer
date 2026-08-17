import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Label, Textarea, ErrorText, invalidFieldClass } from '../ui/Field'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'
import { cn, formatAED, sleep } from '../../lib/utils'
import type { PendingCharge } from '../../data/types'

export function WaiveChargeModal({ charge, open, onClose }: { charge?: PendingCharge; open: boolean; onClose: () => void }) {
  const { waivePendingCharge } = useData()
  const { show } = useToast()
  const [reason, setReason] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setReason('')
      setShowErrors(false)
    }
  }, [open])

  const reasonError = !reason.trim() ? 'A reason is required to waive a charge' : null

  async function submit() {
    if (!charge || reasonError) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    await sleep(400 + Math.random() * 200)
    waivePendingCharge(charge.id, reason.trim())
    show('Charge waived')
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Waive Charge"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} loading={submitting}>
            Waive Fee
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {charge && (
          <div className="flex items-center justify-between rounded-lg bg-ink-50 px-3.5 py-2.5 text-sm dark:bg-ink-800">
            <span className="text-ink-600 dark:text-ink-300">{charge.description}</span>
            <span className="font-semibold text-ink-900 dark:text-ink-50">{formatAED(charge.amount)}</span>
          </div>
        )}
        <p className="text-sm text-ink-500 dark:text-ink-400">
          Waiving removes this charge from the queue, so it will never reach an invoice. The reason is kept on the record.
        </p>
        <div>
          <Label>Reason</Label>
          <Textarea
            placeholder="e.g. Goodwill — long-standing client"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={cn(showErrors && reasonError && invalidFieldClass)}
            autoFocus
          />
          {showErrors && reasonError && <ErrorText>{reasonError}</ErrorText>}
        </div>
      </div>
    </Modal>
  )
}
