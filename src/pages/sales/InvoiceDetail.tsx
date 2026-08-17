import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Download, Scale } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { RecordPaymentModal } from '../../components/modals/RecordPaymentModal'
import { useData } from '../../data/store'
import { formatAED, formatDate } from '../../lib/utils'
import { invoiceSubtotal, invoiceVat } from '../../lib/invoice'

export function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { clients, invoices, matters, firmProfile } = useData()
  const invoice = invoices.find((i) => i.id === id)
  const [paymentOpen, setPaymentOpen] = useState(false)

  if (!invoice) {
    return (
      <Card className="p-10 text-center text-ink-400">
        Invoice not found. <Link to="/sales/invoices" className="text-accent-600 hover:underline">Back to Invoices</Link>
      </Card>
    )
  }

  const client = clients.find((c) => c.id === invoice.clientId)
  const matter = matters.find((m) => m.id === invoice.matterId)
  const subtotal = invoiceSubtotal(invoice.lines)
  const vat = invoiceVat(invoice.lines)
  const total = subtotal + vat
  const balanceDue = total - invoice.paidAmount

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/sales/invoices')} className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800 dark:hover:text-ink-200">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Invoices
        </button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={() => window.print()}>
            Download PDF
          </Button>
          {invoice.status !== 'paid' && (
            <Button size="sm" onClick={() => setPaymentOpen(true)}>
              Record Payment
            </Button>
          )}
        </div>
      </div>

      <Card className="p-8 sm:p-10">
        <div className="flex flex-col justify-between gap-6 border-b border-ink-100 pb-6 sm:flex-row sm:items-start dark:border-ink-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-600 text-white">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-ink-900 dark:text-ink-50">{firmProfile.name}</p>
              <p className="text-xs text-ink-400">{firmProfile.address}</p>
              <p className="text-xs text-ink-400">TRN {firmProfile.trn}</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <h1 className="text-lg font-semibold text-ink-900 dark:text-ink-50">TAX INVOICE</h1>
            <p className="text-sm text-ink-500 dark:text-ink-400">{invoice.number}</p>
            <Badge tone={invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'danger' : invoice.status === 'partial' ? 'warning' : 'neutral'} className="mt-2">
              {invoice.status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 py-6 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Billed To</p>
            <p className="mt-1 font-medium text-ink-800 dark:text-ink-100">{client?.name}</p>
            <p className="text-ink-500 dark:text-ink-400">{client?.businessName}</p>
            <p className="text-ink-400">TRN {client?.trn ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Issue Date</p>
            <p className="mt-1 text-ink-700 dark:text-ink-200">{formatDate(invoice.issueDate)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Due Date</p>
            <p className="mt-1 text-ink-700 dark:text-ink-200">{formatDate(invoice.dueDate)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Matter</p>
            <p className="mt-1 text-ink-700 dark:text-ink-200">{matter?.title ?? '—'}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800">
              <th className="py-2.5 font-medium">Description</th>
              <th className="py-2.5 text-right font-medium">Qty</th>
              <th className="py-2.5 text-right font-medium">Unit Price</th>
              <th className="py-2.5 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((l, i) => (
              <tr key={i} className="border-b border-ink-50 dark:border-ink-800/60">
                <td className="py-3 text-ink-700 dark:text-ink-200">
                  <span className="flex items-center gap-2">
                    {l.description}
                    {l.kind === 'penalty' && <Badge tone="warning">Penalty</Badge>}
                    {l.vatApplicable === false && <span className="text-xs text-ink-400">VAT exempt</span>}
                  </span>
                </td>
                <td className="py-3 text-right text-ink-500 dark:text-ink-400">{l.qty}</td>
                <td className="py-3 text-right text-ink-500 dark:text-ink-400">{formatAED(l.unitPrice)}</td>
                <td className="py-3 text-right font-medium text-ink-800 dark:text-ink-100">{formatAED(l.qty * l.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-4 flex w-full max-w-xs flex-col gap-2 text-sm sm:w-64">
          <div className="flex justify-between text-ink-500 dark:text-ink-400">
            <span>Subtotal</span>
            <span>{formatAED(subtotal)}</span>
          </div>
          <div className="flex justify-between text-ink-500 dark:text-ink-400">
            <span>VAT (5%)</span>
            <span>{formatAED(vat)}</span>
          </div>
          <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-semibold text-ink-900 dark:border-ink-800 dark:text-ink-50">
            <span>Total</span>
            <span>{formatAED(total)}</span>
          </div>
          {invoice.paidAmount > 0 && (
            <div className="flex justify-between text-success-600">
              <span>Paid</span>
              <span>-{formatAED(invoice.paidAmount)}</span>
            </div>
          )}
          <div className="flex justify-between rounded-lg bg-ink-50 px-3 py-2 font-semibold text-ink-900 dark:bg-ink-800 dark:text-ink-50">
            <span>Balance Due</span>
            <span>{formatAED(balanceDue)}</span>
          </div>
        </div>
      </Card>

      <RecordPaymentModal invoice={invoice} open={paymentOpen} onClose={() => setPaymentOpen(false)} />
    </div>
  )
}
