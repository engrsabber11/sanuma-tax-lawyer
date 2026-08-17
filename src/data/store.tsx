import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as seed from './mockData'
import type {
  Client,
  ClientDocument,
  ComplianceDeadline,
  CreditNote,
  DocumentTypeDef,
  Expense,
  Invoice,
  InvoiceLine,
  LedgerEntry,
  Matter,
  Quote,
  ReferralBonusRule,
  ReminderLogEntry,
  ReminderRule,
  Service,
  WalletTransaction,
} from './types'
import { addDays, genId, urgencyFromDate } from '../lib/utils'
import { defaultChecklistForService } from './matterChecklists'

export const TODAY = seed.TODAY

interface FirmProfile {
  name: string
  trn: string
  address: string
  phone: string
  email: string
}

interface DataContextValue {
  clients: Client[]
  clientDocuments: ClientDocument[]
  complianceDeadlines: ComplianceDeadline[]
  documentTypes: DocumentTypeDef[]
  reminderRules: ReminderRule[]
  reminderLog: ReminderLogEntry[]
  matters: Matter[]
  services: Service[]
  quotes: Quote[]
  invoices: Invoice[]
  creditNotes: CreditNote[]
  expenses: Expense[]
  ledgerEntries: LedgerEntry[]
  walletTransactions: WalletTransaction[]
  referralBonusRules: ReferralBonusRule[]
  firmProfile: FirmProfile

  addClient: (input: Omit<Client, 'id' | 'createdAt' | 'avatarColor'> & { avatarColor?: string }) => Client
  updateClient: (id: string, patch: Partial<Client>) => void

  addDocument: (input: { clientId: string; typeId: string; number?: string; issueDate: string; expiryDate: string; matterId?: string }) => void
  addDocumentType: (input: Omit<DocumentTypeDef, 'id'>) => void
  linkDocumentToMatter: (documentId: string, matterId: string) => void
  unlinkDocumentFromMatter: (documentId: string) => void

  addMatter: (input: { clientId: string; title: string; serviceId: string; dueDate?: string }) => Matter
  updateMatter: (id: string, patch: Partial<Matter>) => void
  toggleMatterChecklistItem: (matterId: string, itemId: string) => void
  addMatterChecklistItem: (matterId: string, label: string) => void
  removeMatterChecklistItem: (matterId: string, itemId: string) => void

  addService: (input: Omit<Service, 'id'>) => void
  updateService: (id: string, patch: Partial<Service>) => void

  addQuote: (input: { clientId: string; serviceIds: string[]; amount: number }) => void
  convertQuoteToInvoice: (quoteId: string) => Invoice | undefined

  addInvoice: (input: { clientId: string; matterId?: string; lines: InvoiceLine[]; dueDate: string }) => Invoice
  recordPayment: (invoiceId: string, amount: number) => void

  addCreditNote: (input: { kind: 'firm-issued' | 'client-advisory'; clientId: string; invoiceId?: string; reason: string; amount: number; vatAmount: number }) => void

  addExpense: (input: Omit<Expense, 'id'>) => void

  addWalletTransaction: (input: { clientId: string; type: 'credit' | 'debit'; reason: string; amount: number }) => void
  applyWalletToInvoice: (clientId: string, invoiceId: string, amount: number) => void

  updateReminderRule: (id: string, patch: Partial<ReminderRule>) => void
  toggleReminderRule: (id: string) => void

  updateReferralBonusRule: (level: number, patch: Partial<ReferralBonusRule>) => void

  updateFirmProfile: (patch: Partial<FirmProfile>) => void
}

const DataContext = createContext<DataContextValue | null>(null)

const AVATAR_COLORS = ['bg-accent-500', 'bg-warning-500', 'bg-success-500', 'bg-danger-500', 'bg-accent-700', 'bg-warning-600', 'bg-success-600', 'bg-accent-600', 'bg-danger-600', 'bg-ink-500']

const STORAGE_KEY = 'sanuma-app-state-v1'

interface PersistedState {
  clients?: Client[]
  clientDocuments?: ClientDocument[]
  documentTypes?: DocumentTypeDef[]
  reminderRules?: ReminderRule[]
  matters?: Matter[]
  services?: Service[]
  quotes?: Quote[]
  invoices?: Invoice[]
  creditNotes?: CreditNote[]
  expenses?: Expense[]
  ledgerEntries?: LedgerEntry[]
  walletTransactions?: WalletTransaction[]
  referralBonusRules?: ReferralBonusRule[]
  firmProfile?: FirmProfile
}

function loadPersisted(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function docStatusFromExpiry(expiryDate: string): ClientDocument['status'] {
  const urgency = urgencyFromDate(expiryDate)
  if (urgency === 'danger') return 'expired'
  if (urgency === 'warning') return 'expiring'
  return 'valid'
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [persisted] = useState(loadPersisted)
  const [clients, setClients] = useState<Client[]>(persisted.clients ?? seed.clients)
  const [clientDocuments, setClientDocuments] = useState<ClientDocument[]>(persisted.clientDocuments ?? seed.clientDocuments)
  const [complianceDeadlines] = useState<ComplianceDeadline[]>(seed.complianceDeadlines)
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeDef[]>(persisted.documentTypes ?? seed.documentTypes)
  const [reminderRules, setReminderRules] = useState<ReminderRule[]>(persisted.reminderRules ?? seed.reminderRules)
  const [reminderLog] = useState<ReminderLogEntry[]>(seed.reminderLog)
  const [matters, setMattersState] = useState<Matter[]>(
    (persisted.matters ?? seed.matters).map((m) => ({ ...m, checklist: m.checklist ?? [] })),
  )
  const [services, setServices] = useState<Service[]>(persisted.services ?? seed.services)
  const [quotes, setQuotes] = useState<Quote[]>(persisted.quotes ?? seed.quotes)
  const [invoices, setInvoices] = useState<Invoice[]>(persisted.invoices ?? seed.invoices)
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>(persisted.creditNotes ?? seed.creditNotes)
  const [expenses, setExpenses] = useState<Expense[]>(persisted.expenses ?? seed.expenses)
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(persisted.ledgerEntries ?? seed.ledgerEntries)
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(persisted.walletTransactions ?? seed.walletTransactions)
  const [referralBonusRules, setReferralBonusRules] = useState<ReferralBonusRule[]>(persisted.referralBonusRules ?? seed.referralBonusRules)
  const [firmProfile, setFirmProfile] = useState<FirmProfile>(
    persisted.firmProfile ?? {
      name: 'Sanuma Tax Advisory FZE',
      trn: '100234567800003',
      address: 'Office 1402, Prism Tower, Business Bay, Dubai, UAE',
      phone: '+971 4 123 4567',
      email: 'info@sanuma-tax.ae',
    },
  )

  useEffect(() => {
    const toSave: PersistedState = {
      clients,
      clientDocuments,
      documentTypes,
      reminderRules,
      matters,
      services,
      quotes,
      invoices,
      creditNotes,
      expenses,
      ledgerEntries,
      walletTransactions,
      referralBonusRules,
      firmProfile,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  }, [
    clients,
    clientDocuments,
    documentTypes,
    reminderRules,
    matters,
    services,
    quotes,
    invoices,
    creditNotes,
    expenses,
    ledgerEntries,
    walletTransactions,
    referralBonusRules,
    firmProfile,
  ])

  function addLedgerEntry(input: Omit<LedgerEntry, 'id'>) {
    setLedgerEntries((prev) => [...prev, { id: genId('l'), ...input }])
  }

  function addClient(input: Omit<Client, 'id' | 'createdAt' | 'avatarColor'> & { avatarColor?: string }) {
    const created: Client = {
      id: genId('c'),
      createdAt: TODAY,
      avatarColor: input.avatarColor ?? AVATAR_COLORS[clients.length % AVATAR_COLORS.length],
      ...input,
    }
    setClients((prev) => [...prev, created])
    return created
  }

  function updateClient(id: string, patch: Partial<Client>) {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function addDocument(input: { clientId: string; typeId: string; number?: string; issueDate: string; expiryDate: string; matterId?: string }) {
    setClientDocuments((prev) => [...prev, { id: genId('d'), status: docStatusFromExpiry(input.expiryDate), ...input }])
  }

  function linkDocumentToMatter(documentId: string, matterId: string) {
    setClientDocuments((prev) => prev.map((d) => (d.id === documentId ? { ...d, matterId } : d)))
  }

  function unlinkDocumentFromMatter(documentId: string) {
    setClientDocuments((prev) => prev.map((d) => (d.id === documentId ? { ...d, matterId: undefined } : d)))
  }

  function addDocumentType(input: Omit<DocumentTypeDef, 'id'>) {
    const id = genId('dt')
    setDocumentTypes((prev) => [...prev, { id, ...input }])
    if (input.hasExpiry) {
      setReminderRules((prev) => [
        ...prev,
        { id: genId('rr'), typeId: id, typeName: input.name, daysBefore: input.defaultReminderDays, channels: input.defaultChannels, enabled: true },
      ])
    }
  }

  function addMatter(input: { clientId: string; title: string; serviceId: string; dueDate?: string }) {
    const created: Matter = {
      id: genId('m'),
      status: 'intake',
      openedAt: TODAY,
      checklist: defaultChecklistForService(input.serviceId),
      ...input,
    }
    setMattersState((prev) => [...prev, created])
    return created
  }

  function updateMatter(id: string, patch: Partial<Matter>) {
    setMattersState((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m
        const next = { ...m, ...patch }
        if (patch.status !== undefined) {
          next.completedAt = patch.status === 'completed' ? (patch.completedAt ?? TODAY) : undefined
        }
        return next
      }),
    )
  }

  function toggleMatterChecklistItem(matterId: string, itemId: string) {
    setMattersState((prev) =>
      prev.map((m) => (m.id === matterId ? { ...m, checklist: m.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) } : m)),
    )
  }

  function addMatterChecklistItem(matterId: string, label: string) {
    setMattersState((prev) =>
      prev.map((m) => (m.id === matterId ? { ...m, checklist: [...m.checklist, { id: genId('mc'), label, done: false }] } : m)),
    )
  }

  function removeMatterChecklistItem(matterId: string, itemId: string) {
    setMattersState((prev) =>
      prev.map((m) => (m.id === matterId ? { ...m, checklist: m.checklist.filter((c) => c.id !== itemId) } : m)),
    )
  }

  function addService(input: Omit<Service, 'id'>) {
    setServices((prev) => [...prev, { id: genId('svc'), ...input }])
  }

  function updateService(id: string, patch: Partial<Service>) {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function addQuote(input: { clientId: string; serviceIds: string[]; amount: number }) {
    setQuotes((prev) => [...prev, { id: genId('q'), status: 'draft', createdAt: TODAY, ...input }])
  }

  function addInvoice(input: { clientId: string; matterId?: string; lines: InvoiceLine[]; dueDate: string }) {
    let created!: Invoice
    setInvoices((prev) => {
      const nextNum = 1001 + prev.length
      created = {
        id: genId('inv'),
        number: `INV-2026-${nextNum}`,
        issueDate: TODAY,
        status: 'unpaid',
        paidAmount: 0,
        ...input,
      }
      return [...prev, created]
    })
    return created
  }

  function convertQuoteToInvoice(quoteId: string) {
    const quote = quotes.find((q) => q.id === quoteId)
    if (!quote) return undefined
    const lines: InvoiceLine[] = quote.serviceIds.map((sid) => {
      const svc = services.find((s) => s.id === sid)
      return { serviceId: sid, description: svc?.name ?? 'Service', qty: 1, unitPrice: svc?.price ?? 0 }
    })
    return addInvoice({ clientId: quote.clientId, lines, dueDate: addDays(TODAY, 14) })
  }

  function recordPayment(invoiceId: string, amount: number) {
    const invoice = invoices.find((i) => i.id === invoiceId)
    if (!invoice) return
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv
        const total = inv.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0) * 1.05
        const paidAmount = inv.paidAmount + amount
        const status: Invoice['status'] = paidAmount >= total - 0.01 ? 'paid' : paidAmount > 0 ? 'partial' : inv.status
        return { ...inv, paidAmount, status }
      }),
    )
    addLedgerEntry({ date: TODAY, account: 'Service Revenue', description: `${invoice.number} payment received`, debit: 0, credit: amount })
  }

  function addCreditNote(input: { kind: 'firm-issued' | 'client-advisory'; clientId: string; invoiceId?: string; reason: string; amount: number; vatAmount: number }) {
    setCreditNotes((prev) => {
      const number = `CN-2026-${String(prev.length + 1).padStart(3, '0')}`
      return [...prev, { id: genId('cn'), number, issueDate: TODAY, ...input }]
    })
    if (input.kind === 'firm-issued') {
      addLedgerEntry({ date: TODAY, account: 'Credit Notes Issued', description: input.reason, debit: input.amount, credit: 0 })
    }
  }

  function addExpense(input: Omit<Expense, 'id'>) {
    setExpenses((prev) => [...prev, { id: genId('e'), ...input }])
    addLedgerEntry({
      date: input.date,
      account: input.isDisbursement ? 'Disbursements Receivable' : `${input.category} Expense`,
      description: input.description,
      debit: input.amount,
      credit: 0,
    })
  }

  function addWalletTransaction(input: { clientId: string; type: 'credit' | 'debit'; reason: string; amount: number }) {
    setWalletTransactions((prev) => [...prev, { id: genId('w'), date: TODAY, ...input }])
  }

  function applyWalletToInvoice(clientId: string, invoiceId: string, amount: number) {
    const invoice = invoices.find((i) => i.id === invoiceId)
    addWalletTransaction({ clientId, type: 'debit', reason: `Applied to ${invoice?.number ?? 'invoice'}`, amount })
    recordPayment(invoiceId, amount)
  }

  function updateReminderRule(id: string, patch: Partial<ReminderRule>) {
    setReminderRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function toggleReminderRule(id: string) {
    setReminderRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)))
  }

  function updateReferralBonusRule(level: number, patch: Partial<ReferralBonusRule>) {
    setReferralBonusRules((prev) => prev.map((r) => (r.level === level ? { ...r, ...patch } : r)))
  }

  function updateFirmProfile(patch: Partial<FirmProfile>) {
    setFirmProfile((prev) => ({ ...prev, ...patch }))
  }

  return (
    <DataContext.Provider
      value={{
        clients,
        clientDocuments,
        complianceDeadlines,
        documentTypes,
        reminderRules,
        reminderLog,
        services,
        quotes,
        invoices,
        creditNotes,
        expenses,
        ledgerEntries,
        walletTransactions,
        referralBonusRules,
        firmProfile,
        matters,
        addClient,
        updateClient,
        addDocument,
        addDocumentType,
        linkDocumentToMatter,
        unlinkDocumentFromMatter,
        addMatter,
        updateMatter,
        toggleMatterChecklistItem,
        addMatterChecklistItem,
        removeMatterChecklistItem,
        addService,
        updateService,
        addQuote,
        convertQuoteToInvoice,
        addInvoice,
        recordPayment,
        addCreditNote,
        addExpense,
        addWalletTransaction,
        applyWalletToInvoice,
        updateReminderRule,
        toggleReminderRule,
        updateReferralBonusRule,
        updateFirmProfile,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
