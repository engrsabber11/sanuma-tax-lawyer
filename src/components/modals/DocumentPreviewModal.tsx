import { useRef } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'
import { formatDate } from '../../lib/utils'
import {
  Building2,
  Copy,
  Download,
  FileCheck2,
  Printer,
  QrCode,
  Scale,
  ShieldCheck,
} from 'lucide-react'
import type { ClientDocument } from '../../data/types'

interface DocumentPreviewModalProps {
  open: boolean
  onClose: () => void
  document: ClientDocument | null
}

export function DocumentPreviewModal({ open, onClose, document }: DocumentPreviewModalProps) {
  const { clients, documentTypes } = useData()
  const { show } = useToast()
  const printRef = useRef<HTMLDivElement>(null)

  if (!document) return null

  const client = clients.find((c) => c.id === document.clientId)
  const docType = documentTypes.find((t) => t.id === document.typeId)

  const isTaxCert = docType?.category === 'tax' || docType?.name.toLowerCase().includes('certificate') || docType?.name.toLowerCase().includes('tax')
  const docNumber = document.number || (isTaxCert ? '104877501700003' : 'CN-8941029')

  function handleCopyNumber() {
    navigator.clipboard.writeText(docNumber)
    show('Document / TRN number copied to clipboard')
  }

  function handlePrint() {
    window.print()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Official Document Viewer"
      subtitle={`${docType?.name ?? 'Document'} · ${client?.businessName || client?.name}`}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={handleCopyNumber}>
              Copy Number
            </Button>
            <Button variant="secondary" icon={<Printer className="h-4 w-4" />} onClick={handlePrint}>
              Print
            </Button>
            <Button icon={<Download className="h-4 w-4" />} onClick={() => show(`Downloaded ${docType?.name ?? 'Document'}.pdf`)}>
              Download PDF
            </Button>
          </div>
        </div>
      }
    >
      <div ref={printRef} className="flex flex-col gap-5">
        {/* Certificate Paper Frame */}
        <div className="relative overflow-hidden rounded-xl border-2 border-ink-200 bg-white p-6 shadow-sm dark:border-ink-700 dark:bg-ink-950">
          {/* Header watermark & Seal */}
          <div className="flex items-start justify-between border-b-2 border-accent-700/20 pb-4 dark:border-accent-400/20">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-700 text-white shadow-xs dark:bg-accent-600">
                {isTaxCert ? <Scale className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  {isTaxCert ? 'United Arab Emirates · Federal Tax Authority' : 'United Arab Emirates · Department of Economy & Tourism'}
                </p>
                <h3 className="text-lg font-bold text-ink-900 dark:text-ink-50">
                  {docType?.name || 'Certificate of Registration'}
                </h3>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-700 dark:bg-success-900/30 dark:text-success-400">
                <ShieldCheck className="h-3.5 w-3.5" /> Authenticated
              </span>
              <p className="mt-1 text-[11px] text-ink-400">Ref: UAE-{docNumber.slice(-6)}</p>
            </div>
          </div>

          {/* Certificate Body Details */}
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-ink-50/70 p-3.5 dark:bg-ink-900/50">
              <p className="text-[11px] font-medium uppercase text-ink-400">Taxable Entity / Business Name</p>
              <p className="mt-0.5 text-sm font-bold text-ink-900 dark:text-ink-50">
                {client?.businessName || client?.name}
              </p>
              <p className="mt-0.5 text-xs text-ink-500">Contact: {client?.name}</p>
            </div>

            <div className="rounded-lg bg-ink-50/70 p-3.5 dark:bg-ink-900/50">
              <p className="text-[11px] font-medium uppercase text-ink-400">
                {isTaxCert ? 'Tax Registration Number (TRN)' : 'License / Document Number'}
              </p>
              <p className="mt-0.5 font-mono text-sm font-bold tracking-wide text-accent-700 dark:text-accent-400">
                {docNumber}
              </p>
              <p className="mt-0.5 text-xs text-ink-500">Status: Valid &amp; Active</p>
            </div>

            <div className="rounded-lg border border-ink-100 p-3 dark:border-ink-800">
              <p className="text-[11px] font-medium uppercase text-ink-400">Effective / Issue Date</p>
              <p className="mt-0.5 text-xs font-semibold text-ink-800 dark:text-ink-200">
                {formatDate(document.issueDate)}
              </p>
            </div>

            <div className="rounded-lg border border-ink-100 p-3 dark:border-ink-800">
              <p className="text-[11px] font-medium uppercase text-ink-400">Validity / Expiry Date</p>
              <p className="mt-0.5 text-xs font-semibold text-ink-800 dark:text-ink-200">
                {document.expiryDate === '2099-01-01' ? 'Perpetual (No Expiry)' : formatDate(document.expiryDate)}
              </p>
            </div>
          </div>

          {/* Verification Bar with QR Code placeholder */}
          <div className="mt-6 flex items-center justify-between border-t border-ink-100 pt-4 dark:border-ink-800">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-ink-200 bg-white p-1 shadow-2xs dark:border-ink-700 dark:bg-ink-900">
                <QrCode className="h-9 w-9 text-ink-800 dark:text-ink-200" />
              </div>
              <div>
                <p className="text-xs font-semibold text-ink-800 dark:text-ink-200">Digital EmaraTax Stamp</p>
                <p className="text-[11px] text-ink-400">Scan QR to verify official UAE Government Registry status</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-medium text-success-600 dark:text-success-400">
              <FileCheck2 className="h-4 w-4" /> Verified by Sanuma Law Firm
            </div>
          </div>
        </div>

        {/* Attached file note */}
        {document.fileName && (
          <p className="text-center text-xs text-ink-400">
            Original Source File: <span className="font-mono font-medium text-ink-600 dark:text-ink-300">{document.fileName}</span>
          </p>
        )}
      </div>
    </Modal>
  )
}
