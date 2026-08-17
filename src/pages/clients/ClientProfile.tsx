import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageCircle,
  Building2,
  ChevronRight,
  Wallet as WalletIcon,
  FileText,
  Briefcase,
  Receipt,
  Users2,
} from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge, UrgencyBadge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { Tabs } from '../../components/ui/Tabs'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { EditClientModal } from '../../components/modals/EditClientModal'
import { NewMatterModal } from '../../components/modals/NewMatterModal'
import { WalletActionModal } from '../../components/modals/WalletActionModal'
import { useData } from '../../data/store'
import { formatAED, formatDate, urgencyFromDate } from '../../lib/utils'

export function ClientProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { clients, clientDocuments, complianceDeadlines, documentTypes, matters, invoices, walletTransactions, services } = useData()
  const client = clients.find((c) => c.id === id)
  const [tab, setTab] = useState(params.get('tab') ?? 'overview')
  const [editOpen, setEditOpen] = useState(false)
  const [newMatterOpen, setNewMatterOpen] = useState(false)
  const [walletModal, setWalletModal] = useState<'withdraw' | 'apply' | null>(null)

  const docs = clientDocuments.filter((d) => d.clientId === id)
  const deadlines = complianceDeadlines.filter((d) => d.clientId === id)
  const clientMatters = matters.filter((m) => m.clientId === id)
  const clientInvoices = invoices.filter((i) => i.clientId === id)
  const walletTx = walletTransactions.filter((w) => w.clientId === id)
  const walletBalance = walletTx.reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0)
  const directReferrals = clients.filter((c) => c.referredById === id)
  const referrer = clients.find((c) => c.id === client?.referredById)

  const upline = useMemo(() => {
    const chain: typeof clients = []
    let cur = referrer
    while (cur) {
      chain.unshift(cur)
      cur = clients.find((c) => c.id === cur?.referredById)
    }
    return chain
  }, [referrer, clients])

  if (!client) {
    return (
      <EmptyState icon={<Users2 className="h-5 w-5" />} title="Client not found" description="This client may have been removed." />
    )
  }

  function changeTab(t: string) {
    setTab(t)
    setParams(t === 'overview' ? {} : { tab: t })
  }

  return (
    <div className="flex flex-col gap-6">
      <button onClick={() => navigate('/clients')} className="flex w-fit items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800 dark:hover:text-ink-200">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Clients
      </button>

      <Card className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={client.name} color={client.avatarColor} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-ink-900 dark:text-ink-50">{client.name}</h1>
                <Badge tone={client.status === 'active' ? 'success' : client.status === 'onboarding' ? 'accent' : 'neutral'}>
                  {client.status}
                </Badge>
              </div>
              {client.businessName && (
                <p className="flex items-center gap-1.5 text-sm text-ink-500 dark:text-ink-400">
                  <Building2 className="h-3.5 w-3.5" /> {client.businessName} · TRN {client.trn ?? '—'}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-ink-500 dark:text-ink-400">
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {client.phone}
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5" /> {client.whatsapp ?? '—'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {client.email}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
              Edit Client
            </Button>
            <Button size="sm" onClick={() => setNewMatterOpen(true)}>
              New Matter
            </Button>
          </div>
        </div>

        {upline.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-ink-100 pt-4 text-sm dark:border-ink-800">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-400">Referral chain</span>
            {upline.map((u) => (
              <span key={u.id} className="flex items-center gap-1.5">
                <Link to={`/clients/${u.id}`}>
                  <Badge tone="neutral">{u.name}</Badge>
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-ink-300" />
              </span>
            ))}
            <Badge tone="accent">{client.name}</Badge>
          </div>
        )}
      </Card>

      <Tabs
        active={tab}
        onChange={changeTab}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'documents', label: 'Documents', count: docs.length + deadlines.length },
          { id: 'matters', label: 'Matters', count: clientMatters.length },
          { id: 'invoices', label: 'Invoices', count: clientInvoices.length },
          { id: 'referrals', label: 'Referral Tree', count: directReferrals.length },
          { id: 'wallet', label: 'Wallet' },
        ]}
      />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Documents needing attention</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-1 pt-2">
              {docs
                .filter((d) => urgencyFromDate(d.expiryDate) !== 'ok')
                .map((d) => {
                  const type = documentTypes.find((t) => t.id === d.typeId)
                  return (
                    <div key={d.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5">
                      <FileText className="h-4 w-4 text-ink-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{type?.name}</p>
                        <p className="text-xs text-ink-400">Expires {formatDate(d.expiryDate)}</p>
                      </div>
                      <UrgencyBadge urgency={urgencyFromDate(d.expiryDate)} />
                    </div>
                  )
                })}
              {docs.filter((d) => urgencyFromDate(d.expiryDate) !== 'ok').length === 0 && (
                <p className="px-2 py-3 text-sm text-ink-400">Everything is valid — no action needed.</p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Wallet</CardTitle>
            </CardHeader>
            <CardBody className="pt-2">
              <p className="text-3xl font-semibold text-ink-900 dark:text-ink-50">{formatAED(walletBalance)}</p>
              <p className="mt-1 text-xs text-ink-400">{walletTx.length} transactions</p>
              <Button size="sm" variant="secondary" className="mt-4 w-full" onClick={() => changeTab('wallet')}>
                View Wallet
              </Button>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'documents' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-1 pt-2">
              {docs.map((d) => {
                const type = documentTypes.find((t) => t.id === d.typeId)
                const linkedMatter = d.matterId ? matters.find((m) => m.id === d.matterId) : undefined
                return (
                  <div key={d.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-ink-50 dark:hover:bg-ink-800">
                    <FileText className="h-4 w-4 shrink-0 text-ink-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{type?.name}</p>
                      <p className="text-xs text-ink-400">{d.number} · Issued {formatDate(d.issueDate)} · Expires {formatDate(d.expiryDate)}</p>
                      {linkedMatter && (
                        <Link to={`/matters/${linkedMatter.id}`} className="text-xs text-accent-600 hover:underline">
                          Linked to: {linkedMatter.title}
                        </Link>
                      )}
                    </div>
                    <UrgencyBadge urgency={urgencyFromDate(d.expiryDate)} />
                  </div>
                )
              })}
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Compliance Deadlines</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-1 pt-2">
              {deadlines.length === 0 && <p className="px-2 py-3 text-sm text-ink-400">No recurring filings tracked.</p>}
              {deadlines.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-ink-50 dark:hover:bg-ink-800">
                  <Receipt className="h-4 w-4 shrink-0 text-ink-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{d.name}</p>
                    <p className="text-xs text-ink-400 capitalize">{d.recurrence} · Next due {formatDate(d.nextDueDate)}</p>
                  </div>
                  <Badge tone={d.status === 'overdue' ? 'danger' : d.status === 'due-soon' ? 'warning' : 'neutral'}>{d.status}</Badge>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'matters' && (
        <Card>
          <CardBody className="flex flex-col gap-1 pt-5">
            {clientMatters.length === 0 && <EmptyState icon={<Briefcase className="h-5 w-5" />} title="No matters yet" description="Open a matter once a service engagement starts." />}
            {clientMatters.map((m) => {
              const service = services.find((s) => s.id === m.serviceId)
              return (
                <Link key={m.id} to={`/matters/${m.id}`} className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-ink-50 dark:hover:bg-ink-800">
                  <Briefcase className="h-4 w-4 shrink-0 text-ink-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{m.title}</p>
                    <p className="text-xs text-ink-400">{service?.name} · Opened {formatDate(m.openedAt)}</p>
                  </div>
                  <Badge tone="accent">{m.status.replace('-', ' ')}</Badge>
                </Link>
              )
            })}
          </CardBody>
        </Card>
      )}

      {tab === 'invoices' && (
        <Card>
          <CardBody className="flex flex-col gap-1 pt-5">
            {clientInvoices.length === 0 && <EmptyState icon={<Receipt className="h-5 w-5" />} title="No invoices yet" description="Sales invoices for this client will appear here." />}
            {clientInvoices.map((inv) => (
              <Link key={inv.id} to={`/sales/invoices/${inv.id}`} className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-ink-50 dark:hover:bg-ink-800">
                <Receipt className="h-4 w-4 shrink-0 text-ink-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{inv.number}</p>
                  <p className="text-xs text-ink-400">Issued {formatDate(inv.issueDate)} · Due {formatDate(inv.dueDate)}</p>
                </div>
                <Badge tone={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'danger' : inv.status === 'partial' ? 'warning' : 'neutral'}>
                  {inv.status}
                </Badge>
              </Link>
            ))}
          </CardBody>
        </Card>
      )}

      {tab === 'referrals' && (
        <Card>
          <CardHeader>
            <CardTitle>Clients referred by {client.name}</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-1 pt-2">
            {directReferrals.length === 0 && (
              <EmptyState icon={<Users2 className="h-5 w-5" />} title="No referrals yet" description="Clients this person refers will show up here, including their own sub-referrals." />
            )}
            {directReferrals.map((r) => {
              const subCount = clients.filter((c) => c.referredById === r.id).length
              return (
                <Link key={r.id} to={`/clients/${r.id}`} className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-ink-50 dark:hover:bg-ink-800">
                  <Avatar name={r.name} color={r.avatarColor} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{r.name}</p>
                    <p className="text-xs text-ink-400">{r.businessName}</p>
                  </div>
                  {subCount > 0 && <Badge tone="accent">{subCount} sub-referral{subCount > 1 ? 's' : ''}</Badge>}
                </Link>
              )
            })}
          </CardBody>
        </Card>
      )}

      {tab === 'wallet' && (
        <Card>
          <CardHeader>
            <CardTitle>Wallet Balance: {formatAED(walletBalance)}</CardTitle>
            <div className="flex gap-2">
              <span title={walletBalance <= 0 ? 'No wallet balance available' : undefined}>
                <Button size="sm" variant="secondary" onClick={() => setWalletModal('withdraw')} disabled={walletBalance <= 0}>
                  Withdraw
                </Button>
              </span>
              <span title={walletBalance <= 0 ? 'No wallet balance available' : undefined}>
                <Button size="sm" variant="secondary" icon={<WalletIcon className="h-3.5 w-3.5" />} onClick={() => setWalletModal('apply')} disabled={walletBalance <= 0}>
                  Apply to Invoice
                </Button>
              </span>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-1 pt-3">
            {walletTx.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink-700 dark:text-ink-200">{t.reason}</p>
                  <p className="text-xs text-ink-400">{formatDate(t.date)}</p>
                </div>
                <span className={t.type === 'credit' ? 'text-success-600 font-medium' : 'text-danger-600 font-medium'}>
                  {t.type === 'credit' ? '+' : '-'}
                  {formatAED(t.amount)}
                </span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <EditClientModal client={client} open={editOpen} onClose={() => setEditOpen(false)} />
      <NewMatterModal
        open={newMatterOpen}
        onClose={() => setNewMatterOpen(false)}
        defaultClientId={client.id}
        onCreated={(m) => navigate(`/matters/${m.id}`)}
      />
      {walletModal && (
        <WalletActionModal clientId={client.id} balance={walletBalance} mode={walletModal} open={!!walletModal} onClose={() => setWalletModal(null)} />
      )}
    </div>
  )
}
