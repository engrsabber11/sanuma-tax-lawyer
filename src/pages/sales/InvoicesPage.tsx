import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, FileSpreadsheet } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Tabs } from '../../components/ui/Tabs'
import { EmptyState } from '../../components/ui/EmptyState'
import { NewQuoteModal } from '../../components/modals/NewQuoteModal'
import { NewInvoiceModal } from '../../components/modals/NewInvoiceModal'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'
import { formatAED, formatDate } from '../../lib/utils'
import type { Invoice, Quote } from '../../data/types'

function invoiceTotal(inv: Invoice) {
  const subtotal = inv.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  return subtotal * 1.05
}

const quoteStatusTone: Record<Quote['status'], 'neutral' | 'accent' | 'success' | 'danger'> = {
  draft: 'neutral',
  sent: 'accent',
  accepted: 'success',
  declined: 'danger',
}

const invoiceStatusTone: Record<Invoice['status'], 'success' | 'warning' | 'danger' | 'neutral'> = {
  paid: 'success',
  partial: 'warning',
  unpaid: 'neutral',
  overdue: 'danger',
}

export function InvoicesPage({ initialTab }: { initialTab: 'quotes' | 'invoices' }) {
  const { clients, quotes, invoices, services, convertQuoteToInvoice } = useData()
  const { show } = useToast()
  const navigate = useNavigate()
  const [tab, setTab] = useState(initialTab)
  const [newQuoteOpen, setNewQuoteOpen] = useState(false)
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false)
  const [converted, setConverted] = useState<Set<string>>(new Set())

  function handleConvert(quoteId: string) {
    const invoice = convertQuoteToInvoice(quoteId)
    if (!invoice) return
    setConverted((prev) => new Set(prev).add(quoteId))
    show(`Converted to invoice ${invoice.number}`)
    setTab('invoices')
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">Quotes &amp; Invoices</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Treat every engagement as a sale — from quote to paid invoice.</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => (tab === 'quotes' ? setNewQuoteOpen(true) : setNewInvoiceOpen(true))}>
          {tab === 'quotes' ? 'New Quote' : 'New Invoice'}
        </Button>
      </div>

      <Tabs
        active={tab}
        onChange={(t) => setTab(t as 'quotes' | 'invoices')}
        tabs={[
          { id: 'quotes', label: 'Quotes', count: quotes.length },
          { id: 'invoices', label: 'Invoices', count: invoices.length },
        ]}
      />

      {tab === 'quotes' ? (
        quotes.length === 0 ? (
          <EmptyState icon={<FileSpreadsheet className="h-5 w-5" />} title="No quotes yet" description="Draft a quote before converting it into an invoice." />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800">
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="px-5 py-3 font-medium">Service(s)</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Created</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => {
                    const client = clients.find((c) => c.id === q.clientId)
                    return (
                      <tr key={q.id} className="border-b border-ink-50 last:border-0 dark:border-ink-800/60">
                        <td className="px-5 py-3.5">
                          <Link to={`/clients/${client?.id}`} className="font-medium text-ink-800 hover:text-accent-600 dark:text-ink-100">
                            {client?.name}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-ink-500 dark:text-ink-400">
                          {q.serviceIds.map((id) => services.find((s) => s.id === id)?.name).join(', ')}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-ink-700 dark:text-ink-200">{formatAED(q.amount)}</td>
                        <td className="px-5 py-3.5 text-ink-500 dark:text-ink-400">{formatDate(q.createdAt)}</td>
                        <td className="px-5 py-3.5">
                          <Badge tone={quoteStatusTone[q.status]}>{q.status}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {q.status === 'accepted' && (
                            <Button size="sm" variant="secondary" onClick={() => handleConvert(q.id)} disabled={converted.has(q.id)}>
                              {converted.has(q.id) ? 'Converted' : 'Convert to Invoice'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : invoices.length === 0 ? (
        <EmptyState icon={<FileSpreadsheet className="h-5 w-5" />} title="No invoices yet" description="Invoices generated from accepted quotes will appear here." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800">
                  <th className="px-5 py-3 font-medium">Invoice</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Amount (incl. VAT)</th>
                  <th className="px-5 py-3 font-medium">Due Date</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const client = clients.find((c) => c.id === inv.clientId)
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => navigate(`/sales/invoices/${inv.id}`)}
                      className="cursor-pointer border-b border-ink-50 last:border-0 hover:bg-ink-50/70 dark:border-ink-800/60 dark:hover:bg-ink-800/40"
                    >
                      <td className="px-5 py-3.5">
                        <Link to={`/sales/invoices/${inv.id}`} className="font-medium text-ink-800 hover:text-accent-600 dark:text-ink-100" onClick={(e) => e.stopPropagation()}>
                          {inv.number}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-ink-600 dark:text-ink-300">{client?.name}</td>
                      <td className="px-5 py-3.5 font-medium text-ink-700 dark:text-ink-200">{formatAED(invoiceTotal(inv))}</td>
                      <td className="px-5 py-3.5 text-ink-500 dark:text-ink-400">{formatDate(inv.dueDate)}</td>
                      <td className="px-5 py-3.5">
                        <Badge tone={invoiceStatusTone[inv.status]}>{inv.status}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <NewQuoteModal open={newQuoteOpen} onClose={() => setNewQuoteOpen(false)} />
      <NewInvoiceModal open={newInvoiceOpen} onClose={() => setNewInvoiceOpen(false)} onCreated={(inv) => navigate(`/sales/invoices/${inv.id}`)} />
    </div>
  )
}
