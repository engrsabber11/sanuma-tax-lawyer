import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { ErrorText, Label, Textarea } from '../ui/Field'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'

const MIN_REASON = 10

/**
 * Reopening a closed tax year.
 *
 * By the time a year is closed, invoices have been issued against its filings
 * and its numbers have been reported to the FTA. A silent reopen means nobody
 * can later say when it happened, by whom, or why — and that is exactly the
 * question that gets asked when it is least convenient to have no answer.
 *
 * The typed reason is gated by the firm's `requireReopenReason` setting. The
 * audit entry is not: losing the reason is a preference, losing the record is a
 * defect.
 */
export function ReopenYearModal({
  open,
  onClose,
  clientId,
  clientName,
  taxYear,
}: {
  open: boolean
  onClose: () => void
  clientId: string
  clientName: string
  taxYear: number
}) {
  const { firmProfile, reopenClientYear } = useData()
  const { show } = useToast()
  const [reason, setReason] = useState('')
  const [showError, setShowError] = useState(false)

  const required = firmProfile.requireReopenReason

  useEffect(() => {
    if (open) {
      setReason('')
      setShowError(false)
    }
  }, [open])

  const tooShort = reason.trim().length < MIN_REASON

  function submit() {
    if (required && tooShort) {
      setShowError(true)
      return
    }
    reopenClientYear(clientId, taxYear, reason.trim())
    show(`Tax year ${taxYear} reopened for ${clientName}`)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Reopen tax year ${taxYear}?`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2.5 rounded-lg bg-warning-50 px-3.5 py-3 text-sm text-warning-800 dark:bg-warning-500/10 dark:text-warning-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>{clientName}</strong>&rsquo;s tax year {taxYear} was closed. Reopening makes its filings editable
            again and is recorded in the client&rsquo;s audit trail.
          </span>
        </div>

        <div>
          <Label hint={required ? undefined : 'optional'}>Reason for reopening {required && '*'}</Label>
          <Textarea
            placeholder="e.g. FTA raised a query on the Aug–Oct return and it needs amending"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
          {showError && required && tooShort && <ErrorText>Give a reason of at least {MIN_REASON} characters.</ErrorText>}
        </div>

        <div className="flex justify-end gap-2 border-t border-ink-100 pt-4 dark:border-ink-800">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Reopen Year</Button>
        </div>
      </div>
    </Modal>
  )
}
