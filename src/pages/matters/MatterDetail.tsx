import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Briefcase, Check, FileText, Link2, Plus, Receipt, X } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge, UrgencyBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { Input, Textarea } from '../../components/ui/Field'
import { NewInvoiceModal } from '../../components/modals/NewInvoiceModal'
import { NewDocumentModal } from '../../components/modals/NewDocumentModal'
import { LinkDocumentModal } from '../../components/modals/LinkDocumentModal'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'
import type { MatterStatus } from '../../data/types'
import { cn, formatAED, formatDate, urgencyFromDate } from '../../lib/utils'

const STATUS_FLOW: MatterStatus[] = ['intake', 'documents-collected', 'in-progress', 'submitted', 'completed']
const STATUS_LABEL: Record<MatterStatus, string> = {
  intake: 'Intake',
  'documents-collected': 'Documents Collected',
  'in-progress': 'In Progress',
  submitted: 'Submitted to Authority',
  completed: 'Completed',
}

export function MatterDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    clients,
    matters,
    services,
    invoices,
    clientDocuments,
    documentTypes,
    updateMatter,
    toggleMatterChecklistItem,
    addMatterChecklistItem,
    removeMatterChecklistItem,
    unlinkDocumentFromMatter,
  } = useData()
  const { show } = useToast()
  const matter = matters.find((m) => m.id === id)
  const [notes, setNotes] = useState(matter?.notes ?? '')
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [addDocOpen, setAddDocOpen] = useState(false)
  const [linkDocOpen, setLinkDocOpen] = useState(false)
  const [newStep, setNewStep] = useState('')

  useEffect(() => {
    setNotes(matter?.notes ?? '')
  }, [matter?.id])

  if (!matter) {
    return (
      <Card className="p-10 text-center text-ink-400">
        Matter not found. <Link to="/matters" className="text-accent-600 hover:underline">Back to Matters</Link>
      </Card>
    )
  }

  const client = clients.find((c) => c.id === matter.clientId)
  const service = services.find((s) => s.id === matter.serviceId)
  const invoice = invoices.find((i) => i.id === matter.invoiceId)
  const linkedDocs = clientDocuments.filter((d) => d.matterId === matter.id)
  const currentIndex = STATUS_FLOW.indexOf(matter.status)
  const doneCount = matter.checklist.filter((c) => c.done).length

  function submitNewStep() {
    if (!newStep.trim()) return
    addMatterChecklistItem(matter!.id, newStep.trim())
    setNewStep('')
  }

  return (
    <div className="flex flex-col gap-6">
      <button onClick={() => navigate('/matters')} className="flex w-fit items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800 dark:hover:text-ink-200">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Matters
      </button>

      <Card className="p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-400">
              <Briefcase className="h-3.5 w-3.5" /> Matter
            </div>
            <h1 className="mt-1 text-xl font-semibold text-ink-900 dark:text-ink-50">{matter.title}</h1>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{service?.name} · Opened {formatDate(matter.openedAt)}</p>
          </div>
          {client && (
            <Link to={`/clients/${client.id}`} className="flex items-center gap-2.5 rounded-xl border border-ink-200/70 px-3.5 py-2.5 dark:border-ink-800">
              <Avatar name={client.name} color={client.avatarColor} size="sm" />
              <div>
                <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{client.name}</p>
                <p className="text-xs text-ink-400">{client.businessName}</p>
              </div>
            </Link>
          )}
        </div>

        <div className="mt-6 flex items-center overflow-x-auto pb-2">
          {STATUS_FLOW.map((s, i) => (
            <div key={s} className="flex flex-1 items-center last:flex-none">
              <button
                onClick={() => updateMatter(matter.id, { status: s })}
                className={`flex flex-col items-center gap-2 rounded-lg px-2 py-1 transition-opacity ${i > currentIndex ? 'opacity-40' : ''}`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${i <= currentIndex ? 'bg-accent-600 text-white' : 'bg-ink-100 text-ink-400 dark:bg-ink-800'}`}>
                  {i + 1}
                </div>
                <span className="hidden whitespace-nowrap text-xs font-medium text-ink-500 sm:block dark:text-ink-400">{STATUS_LABEL[s]}</span>
              </button>
              {i < STATUS_FLOW.length - 1 && <div className={`mx-1 h-0.5 flex-1 rounded-full ${i < currentIndex ? 'bg-accent-600' : 'bg-ink-100 dark:bg-ink-800'}`} />}
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {currentIndex > 0 && (
            <Button variant="secondary" size="sm" onClick={() => updateMatter(matter.id, { status: STATUS_FLOW[currentIndex - 1] })}>
              Move Back
            </Button>
          )}
          {currentIndex < STATUS_FLOW.length - 1 && (
            <Button size="sm" onClick={() => updateMatter(matter.id, { status: STATUS_FLOW[currentIndex + 1] })}>
              Advance to {STATUS_LABEL[STATUS_FLOW[currentIndex + 1]]}
            </Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardBody className="pt-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                if (notes !== matter.notes) {
                  updateMatter(matter.id, { notes })
                  show('Notes saved')
                }
              }}
              placeholder="Add notes about this matter…"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Linked Invoice</CardTitle>
          </CardHeader>
          <CardBody className="pt-2">
            {invoice ? (
              <Link to={`/sales/invoices/${invoice.id}`} className="flex items-center gap-3 rounded-lg border border-ink-200/70 p-3.5 hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800">
                <Receipt className="h-4 w-4 text-ink-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{invoice.number}</p>
                  <p className="text-xs text-ink-400">{formatAED(invoice.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0) * 1.05)}</p>
                </div>
                <Badge tone={invoice.status === 'paid' ? 'success' : 'warning'}>{invoice.status}</Badge>
              </Link>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <p className="text-sm text-ink-400">No invoice linked yet.</p>
                <Button size="sm" variant="secondary" onClick={() => setInvoiceModalOpen(true)}>
                  Create Invoice
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Checklist</CardTitle>
            <Badge tone={doneCount === matter.checklist.length && matter.checklist.length > 0 ? 'success' : 'neutral'}>
              {doneCount}/{matter.checklist.length} done
            </Badge>
          </CardHeader>
          <CardBody className="flex flex-col gap-1 pt-2">
            {matter.checklist.length === 0 && <p className="px-1 py-2 text-sm text-ink-400">No steps yet — add the first one below.</p>}
            {matter.checklist.map((item) => (
              <div key={item.id} className="group flex items-center gap-3 rounded-lg px-1 py-2 hover:bg-ink-50 dark:hover:bg-ink-800">
                <button
                  onClick={() => toggleMatterChecklistItem(matter.id, item.id)}
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                    item.done ? 'border-success-500 bg-success-500 text-white' : 'border-ink-300 dark:border-ink-600',
                  )}
                >
                  {item.done && <Check className="h-3.5 w-3.5" />}
                </button>
                <span className={cn('flex-1 text-sm', item.done ? 'text-ink-400 line-through' : 'text-ink-700 dark:text-ink-200')}>{item.label}</span>
                <button
                  onClick={() => removeMatterChecklistItem(matter.id, item.id)}
                  className="rounded-lg p-1 text-ink-300 opacity-0 transition-opacity hover:bg-ink-100 hover:text-ink-600 group-hover:opacity-100 dark:hover:bg-ink-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <div className="mt-2 flex gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
              <Input
                placeholder="Add a step…"
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitNewStep()}
              />
              <Button variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={submitNewStep}>
                Add
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-2 pt-2">
            {linkedDocs.length === 0 && <p className="px-1 py-2 text-sm text-ink-400">No documents linked to this matter yet.</p>}
            {linkedDocs.map((d) => {
              const type = documentTypes.find((t) => t.id === d.typeId)
              return (
                <div key={d.id} className="group flex items-center gap-2.5 rounded-lg border border-ink-200/70 px-3 py-2.5 dark:border-ink-800">
                  <FileText className="h-4 w-4 shrink-0 text-ink-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800 dark:text-ink-100">{type?.name}</p>
                    <p className="text-xs text-ink-400">Expires {formatDate(d.expiryDate)}</p>
                  </div>
                  <UrgencyBadge urgency={urgencyFromDate(d.expiryDate)} />
                  <button
                    onClick={() => unlinkDocumentFromMatter(d.id)}
                    title="Unlink from this matter"
                    className="rounded-lg p-1 text-ink-300 opacity-0 transition-opacity hover:bg-ink-100 hover:text-ink-600 group-hover:opacity-100 dark:hover:bg-ink-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
            <div className="mt-1 flex gap-2">
              <Button variant="secondary" size="sm" icon={<Link2 className="h-3.5 w-3.5" />} className="flex-1" onClick={() => setLinkDocOpen(true)}>
                Link Existing
              </Button>
              <Button variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} className="flex-1" onClick={() => setAddDocOpen(true)}>
                Add New
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      <NewInvoiceModal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        defaultClientId={matter.clientId}
        defaultMatterId={matter.id}
        onCreated={(inv) => updateMatter(matter.id, { invoiceId: inv.id })}
      />
      <NewDocumentModal open={addDocOpen} onClose={() => setAddDocOpen(false)} defaultClientId={matter.clientId} defaultMatterId={matter.id} />
      <LinkDocumentModal open={linkDocOpen} onClose={() => setLinkDocOpen(false)} clientId={matter.clientId} matterId={matter.id} />
    </div>
  )
}
