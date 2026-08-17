import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Receipt, Building2, Users } from 'lucide-react'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { NewCreditNoteModal } from '../../components/modals/NewCreditNoteModal'
import { useData } from '../../data/store'
import { formatAED, formatDate } from '../../lib/utils'

export function CreditNotesPage() {
  const { creditNotes, clients, invoices } = useData()
  const [filter, setFilter] = useState<'all' | 'firm-issued' | 'client-advisory'>('all')
  const [newOpen, setNewOpen] = useState(false)

  const rows = creditNotes.filter((c) => (filter === 'all' ? true : c.kind === filter))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">Tax Credit Notes</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">FTA-compliant credit notes — both for the firm's own invoices and as an advisory deliverable for clients.</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setNewOpen(true)}>
          New Credit Note
        </Button>
      </div>

      <div className="flex gap-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'firm-issued', label: 'Firm-Issued' },
          { id: 'client-advisory', label: 'Client-Advisory' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as typeof filter)}
            className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              filter === f.id ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-400' : 'border-ink-200 text-ink-500 dark:border-ink-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Receipt className="h-5 w-5" />} title="No credit notes" description="Credit notes adjusting an invoice, or prepared as advisory work for a client, will appear here." />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((cn) => {
            const client = clients.find((c) => c.id === cn.clientId)
            const invoice = invoices.find((i) => i.id === cn.invoiceId)
            return (
              <Card key={cn.id} className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cn.kind === 'firm-issued' ? 'bg-accent-50 text-accent-600 dark:bg-accent-900/30' : 'bg-warning-50 text-warning-600 dark:bg-warning-500/10'}`}>
                      {cn.kind === 'firm-issued' ? <Building2 className="h-4.5 w-4.5" /> : <Users className="h-4.5 w-4.5" />}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-ink-900 dark:text-ink-50">{cn.number}</p>
                        <Badge tone={cn.kind === 'firm-issued' ? 'accent' : 'warning'}>
                          {cn.kind === 'firm-issued' ? 'Firm-Issued (own invoice)' : 'Client-Advisory (deliverable)'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{cn.reason}</p>
                      <p className="mt-1 text-xs text-ink-400">
                        {client && (
                          <Link to={`/clients/${client.id}`} className="hover:text-accent-600 hover:underline">
                            {client.name}
                          </Link>
                        )}
                        {' · '}
                        {formatDate(cn.issueDate)}
                        {invoice && (
                          <>
                            {' · Ref: '}
                            <Link to={`/sales/invoices/${invoice.id}`} className="hover:text-accent-600 hover:underline">
                              {invoice.number}
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink-900 dark:text-ink-50">{formatAED(cn.amount + cn.vatAmount)}</p>
                    <p className="text-xs text-ink-400">incl. {formatAED(cn.vatAmount)} VAT</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Card className="border-dashed bg-transparent p-5">
        <CardBody className="flex flex-col gap-1 p-0 text-sm text-ink-500 dark:text-ink-400">
          <p className="font-medium text-ink-700 dark:text-ink-200">About the two credit note types</p>
          <p><strong className="text-ink-800 dark:text-ink-100">Firm-Issued</strong> — adjusts one of Sanuma's own invoices (discount, waived fee, cancellation); flows automatically into Accounting.</p>
          <p><strong className="text-ink-800 dark:text-ink-100">Client-Advisory</strong> — a credit note prepared or reviewed as a billable deliverable for a client's own business, tracked like any other Matter/service.</p>
        </CardBody>
      </Card>

      <NewCreditNoteModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  )
}
