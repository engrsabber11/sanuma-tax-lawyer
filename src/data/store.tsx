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
  PenaltyFeeRule,
  PendingCharge,
  Quote,
  ReferralBonusRule,
  ReminderLogEntry,
  ReminderRule,
  Service,
  WalletTransaction,
} from './types'
import { addDays, genId, urgencyFromDate } from '../lib/utils'
import { invoiceTotal } from '../lib/invoice'
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
  penaltyFeeRule: PenaltyFeeRule
  pendingCharges: PendingCharge[]
  firmProfile: FirmProfile

  addClient: (input: Omit<Client, 'id' | 'createdAt' | 'avatarColor'> & { avatarColor?: string }) => Client
  updateClient: (id: string, patch: Partial<Client>) => void

  addDocument: (input: { clientId: string; typeId: string; number?: string; issueDate: string; expiryDate: string; matterId?: string }) => void
  addDocumentType: (input: Omit<DocumentTypeDef, 'id'>) => void
  linkDocumentToMatter: (documentId: string, matterId: string) => void
  unlinkDocumentFromMatter: (documentId: string) => void

  addMatter: (input: { clientId: string; title: string; serviceId: string; dueDate?: string; clientInitiated?: boolean }) => Matter
  updateMatter: (id: string, patch: Partial<Matter>) => void
  toggleMatterChecklistItem: (matterId: string, itemId: string) => void
  addMatterChecklistItem: (matterId: string, label: string) => void
  removeMatterChecklistItem: (matterId: string, itemId: string) => void

  addService: (input: Omit<Service, 'id'>) => Service
  updateService: (id: string, patch: Partial<Service>) => void
  deleteService: (id: string) => void

  addQuote: (input: { clientId: string; serviceIds: string[]; amount: number }) => void
  convertQuoteToInvoice: (quoteId: string) => Invoice | undefined

  addInvoice: (input: { clientId: string; matterId?: string; lines: InvoiceLine[]; dueDate: string; pendingChargeIds?: string[] }) => Invoice
  recordPayment: (invoiceId: string, amount: number) => void

  updatePenaltyFeeRule: (patch: Partial<PenaltyFeeRule>) => void
  pendingChargesForClient: (clientId: string) => PendingCharge[]
  waivePendingCharge: (id: string, reason: string) => void

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
  penaltyFeeRule?: PenaltyFeeRule
  pendingCharges?: PendingCharge[]
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
  // State saved before these fields existed is migrated on load: no checklist → empty,
  // no clientInitiated → treated as client-initiated, so nothing is retro-penalised.
  const [matters, setMattersState] = useState<Matter[]>(
    (persisted.matters ?? seed.matters).map((m) => ({ ...m, checklist: m.checklist ?? [], clientInitiated: m.clientInitiated ?? true })),
  )
  const [services, setServices] = useState<Service[]>(persisted.services ?? seed.services)
  const [quotes, setQuotes] = useState<Quote[]>(persisted.quotes ?? seed.quotes)
  const [invoices, setInvoices] = useState<Invoice[]>(persisted.invoices ?? seed.invoices)
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>(persisted.creditNotes ?? seed.creditNotes)
  const [expenses, setExpenses] = useState<Expense[]>(persisted.expenses ?? seed.expenses)
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(persisted.ledgerEntries ?? seed.ledgerEntries)
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(persisted.walletTransactions ?? seed.walletTransactions)
  const [referralBonusRules, setReferralBonusRules] = useState<ReferralBonusRule[]>(persisted.referralBonusRules ?? seed.referralBonusRules)
  const [penaltyFeeRule, setPenaltyFeeRule] = useState<PenaltyFeeRule>(persisted.penaltyFeeRule ?? seed.penaltyFeeRule)
  const [pendingCharges, setPendingCharges] = useState<PendingCharge[]>(persisted.pendingCharges ?? seed.pendingCharges)
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
      penaltyFeeRule,
      pendingCharges,
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
    penaltyFeeRule,
    pendingCharges,
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

  function addMatter(input: { clientId: string; title: string; serviceId: string; dueDate?: string; clientInitiated?: boolean }) {
    const clientInitiated = input.clientInitiated ?? true
    const created: Matter = {
      id: genId('m'),
      status: 'intake',
      openedAt: TODAY,
      checklist: defaultChecklistForService(input.serviceId),
      ...input,
      clientInitiated,
    }

    // Opened without the client asking: raise the firm's minimum fee, snapshotting the
    // rule as it stands today so later rule edits never rewrite this charge.
    if (!clientInitiated && penaltyFeeRule.enabled && penaltyFeeRule.amount > 0) {
      const charge: PendingCharge = {
        id: genId('pc'),
        clientId: input.clientId,
        matterId: created.id,
        kind: 'penalty',
        description: penaltyFeeRule.label,
        amount: penaltyFeeRule.amount,
        vatApplicable: penaltyFeeRule.vatApplicable,
        createdAt: TODAY,
        status: 'pending',
      }
      setPendingCharges((prev) => [...prev, charge])
      created.penaltyChargeId = charge.id
    }

    setMattersState((prev) => [...prev, created])
    return created
  }

  function updatePenaltyFeeRule(patch: Partial<PenaltyFeeRule>) {
    setPenaltyFeeRule((prev) => ({ ...prev, ...patch }))
  }

  function pendingChargesForClient(clientId: string) {
    return pendingCharges.filter((c) => c.clientId === clientId && c.status === 'pending')
  }

  function waivePendingCharge(id: string, reason: string) {
    setPendingCharges((prev) =>
      prev.map((c) => (c.id === id && c.status === 'pending' ? { ...c, status: 'waived', waivedReason: reason, waivedAt: TODAY } : c)),
    )
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
    const created: Service = { id: genId('svc'), ...input }
    setServices((prev) => [...prev, created])
    return created
  }

  function updateService(id: string, patch: Partial<Service>) {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  /** Removes the service and, when it is a parent, every sub-service under it. */
  function deleteService(id: string) {
    setServices((prev) => prev.filter((s) => s.id !== id && s.parentId !== id))
  }

  function addQuote(input: { clientId: string; serviceIds: string[]; amount: number }) {
    setQuotes((prev) => [...prev, { id: genId('q'), status: 'draft', createdAt: TODAY, ...input }])
  }

  function addInvoice(input: { clientId: string; matterId?: string; lines: InvoiceLine[]; dueDate: string; pendingChargeIds?: string[] }) {
    const { pendingChargeIds, ...invoiceInput } = input
    // Built outside the updater: StrictMode double-invokes updaters, so generating the id
    // in there hands callers an id that never reaches state (breaking every back-reference).
    const created: Invoice = {
      id: genId('inv'),
      number: `INV-2026-${1001 + invoices.length}`,
      issueDate: TODAY,
      status: 'unpaid',
      paidAmount: 0,
      ...invoiceInput,
    }
    setInvoices((prev) => [...prev, created])

    // Charges picked up by this invoice stop being pending; ones left out stay in the
    // queue and resurface on the next invoice for that client.
    if (pendingChargeIds?.length) {
      setPendingCharges((prev) =>
        prev.map((c) => (pendingChargeIds.includes(c.id) && c.status === 'pending' ? { ...c, status: 'billed', invoiceId: created.id } : c)),
      )
      const billedTotal = pendingCharges
        .filter((c) => pendingChargeIds.includes(c.id) && c.status === 'pending')
        .reduce((sum, c) => sum + c.amount, 0)
      if (billedTotal > 0) {
        addLedgerEntry({ date: TODAY, account: 'Penalty Income', description: `${created.number} — firm-initiated matter fees`, debit: 0, credit: billedTotal })
      }
    }

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
        const total = invoiceTotal(inv.lines)
        const paidAmount = inv.paidAmount + amount
        const status: Invoice['status'] = paidAmount >= total - 0.01 ? 'paid' : paidAmount > 0 ? 'partial' : inv.status
        return { ...inv, paidAmount, status }
      }),
    )
    addLedgerEntry({ date: TODAY, account: 'Service Revenue', description: `${invoice.number} payment received`, debit: 0, credit: amount })

    const client = clients.find((c) => c.id === invoice.clientId)
    if (client) {
      const l1Rule = referralBonusRules.find((r) => r.level === 1 && r.enabled)
      const l2Rule = referralBonusRules.find((r) => r.level === 2 && r.enabled)

      if (l1Rule && client.referredById) {
        const l1Bonus = l1Rule.type === 'percentage' ? Math.round((amount * l1Rule.value) / 100) : l1Rule.value
        if (l1Bonus > 0) {
          addWalletTransaction({
            clientId: client.referredById,
            type: 'credit',
            reason: `Level 1 Referral Bonus: ${invoice.number} for ${client.name}`,
            amount: l1Bonus,
          })
        }
      }

      const subReferrerId = client.subReferredById || (client.referredById ? clients.find((c) => c.id === client.referredById)?.referredById : undefined)
      if (l2Rule && subReferrerId && subReferrerId !== client.referredById) {
        const l2Bonus = l2Rule.type === 'percentage' ? Math.round((amount * l2Rule.value) / 100) : l2Rule.value
        if (l2Bonus > 0) {
          addWalletTransaction({
            clientId: subReferrerId,
            type: 'credit',
            reason: `Level 2 Sub-Referral Bonus: ${invoice.number} for ${client.name}`,
            amount: l2Bonus,
          })
        }
      }
    }
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
        penaltyFeeRule,
        pendingCharges,
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
        deleteService,
        addQuote,
        convertQuoteToInvoice,
        addInvoice,
        recordPayment,
        updatePenaltyFeeRule,
        pendingChargesForClient,
        waivePendingCharge,
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
