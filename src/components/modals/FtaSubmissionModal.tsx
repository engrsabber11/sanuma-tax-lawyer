import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Label } from '../ui/Field'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'
import { todayIso } from '../../lib/utils'
import { FileCheck, FileText, Sparkles, Upload } from 'lucide-react'
import type { FilingPeriod } from '../../data/types'

interface FtaSubmissionModalProps {
  open: boolean
  onClose: () => void
  period: FilingPeriod | null
}

export function FtaSubmissionModal({ open, onClose, period }: FtaSubmissionModalProps) {
  const { clients, obligationTypes, markFilingFiled, activeStaff } = useData()
  const { show } = useToast()

  const client = clients.find((c) => c.id === period?.clientId)
  const obligation = obligationTypes.find((t) => t.id === period?.obligationTypeId)

  const isVat = obligation?.id.includes('vat')
  const defaultRefPrefix = isVat ? 'FTA-VAT-' : 'FTA-CT-'
  const sampleRef = `${defaultRefPrefix}${Math.floor(100000 + Math.random() * 900000)}`

  const [ftaRef, setFtaRef] = useState(period?.ftaReferenceNo || '')
  const [submissionDate, setSubmissionDate] = useState(period?.filedAt || todayIso())
  const [taxType, setTaxType] = useState<'payable' | 'refund' | 'nil'>('payable')
  const [amount, setAmount] = useState<string>('0')
  const [receiptFileName, setReceiptFileName] = useState(
    period?.submissionReceiptName || `${obligation?.shortName || 'Tax'}_Return_Ack_${period?.label.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!period) return null

  function handleSubmit() {
    if (!period) return
    setIsSubmitting(true)

    const netTax = taxType === 'nil' ? 0 : taxType === 'refund' ? -Math.abs(Number(amount) || 0) : Math.abs(Number(amount) || 0)

    markFilingFiled(period.id, {
      filedAt: submissionDate,
      ftaReferenceNo: ftaRef.trim() || undefined,
      taxPayableOrRefund: netTax,
      submissionReceiptName: receiptFileName.trim() || undefined,
      submittedBy: activeStaff.name,
    })

    show(`Filing marked as submitted to FTA (Ref: ${ftaRef || 'Logged'})`)
    setIsSubmitting(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record FTA Return Submission"
      subtitle={`${obligation?.name ?? 'Tax Return'} — ${period.label}`}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={isSubmitting} icon={<FileCheck className="h-4 w-4" />}>
            Confirm FTA Filing
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Filing summary banner */}
        <div className="rounded-lg border border-accent-200/70 bg-accent-50/50 p-3.5 dark:border-accent-900/50 dark:bg-accent-900/10">
          <div className="flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
            <span>Client: <strong className="text-ink-800 dark:text-ink-200">{client?.businessName || client?.name}</strong></span>
            <span>Due Date: <strong className="text-ink-800 dark:text-ink-200">{period.dueDate}</strong></span>
          </div>
          <p className="mt-1 text-xs text-ink-600 dark:text-ink-300">
            Official Period: <strong>{period.periodStart}</strong> to <strong>{period.periodEnd}</strong>
          </p>
        </div>

        {/* FTA Reference */}
        <div>
          <div className="flex items-center justify-between">
            <Label>FTA Application / Reference Number</Label>
            <button
              type="button"
              onClick={() => setFtaRef(sampleRef)}
              className="flex items-center gap-1 text-xs text-accent-600 hover:underline"
            >
              <Sparkles className="h-3 w-3" /> Auto-generate sample
            </button>
          </div>
          <Input
            placeholder="e.g. FTA-2026-VAT-940212"
            value={ftaRef}
            onChange={(e) => setFtaRef(e.target.value)}
            autoFocus
          />
          <p className="mt-1 text-xs text-ink-400">EmaraTax portal submission or acknowledgement number</p>
        </div>

        {/* Submission Date & Submitter */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Filing / Submission Date *</Label>
            <Input type="date" value={submissionDate} onChange={(e) => setSubmissionDate(e.target.value)} />
          </div>
          <div>
            <Label>Submitted By (Tax Agent / Staff)</Label>
            <Input value={activeStaff.name} disabled className="bg-ink-50 text-ink-600 dark:bg-ink-800 dark:text-ink-400" />
          </div>
        </div>

        {/* Tax Settlement Status */}
        <div className="rounded-lg border border-ink-200 p-3.5 dark:border-ink-700">
          <Label className="mb-2">Net Tax Position on Return</Label>
          <div className="flex gap-2">
            {[
              { id: 'payable', label: 'Tax Payable to FTA' },
              { id: 'refund', label: 'Refund Claimed' },
              { id: 'nil', label: 'Nil Return (AED 0)' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTaxType(t.id as any)
                  if (t.id === 'nil') setAmount('0')
                }}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  taxType === t.id
                    ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-400'
                    : 'border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {taxType !== 'nil' && (
            <div className="mt-3">
              <Label>{taxType === 'payable' ? 'Amount Due to FTA (AED)' : 'Refund Amount (AED)'}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 5250.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Receipt Attachment Name */}
        <div>
          <Label hint="optional">Submission Confirmation Receipt PDF</Label>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-ink-200 bg-ink-50/50 px-3 py-2 text-xs text-ink-700 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200">
              <FileText className="h-4 w-4 text-accent-600" />
              <input
                className="flex-1 bg-transparent outline-none"
                value={receiptFileName}
                onChange={(e) => setReceiptFileName(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Upload className="h-3.5 w-3.5" />}
              onClick={() => show('Uploaded submission confirmation receipt PDF')}
            >
              Attach
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
