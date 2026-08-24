import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as seed from './mockData'
import type {
  AuditEntry,
  Client,
  ClientDocument,
  ClientYear,
  CreditNote,
  DocumentTypeDef,
  DueRule,
  Expense,
  FilingPeriod,
  Invoice,
  InvoiceLine,
  LedgerEntry,
  Matter,
  ObligationType,
  PenaltyFeeRule,
  PendingCharge,
  Periodicity,
  QuarterStagger,
  Quote,
  ReferralBonusRule,
  Registration,
  ReminderLogEntry,
  ReminderRule,
  Service,
  WalletTransaction,
} from './types'
import { addDays, genId, urgencyFromDate } from '../lib/utils'
import { invoiceTotal } from '../lib/invoice'
import { defaultChecklistForService } from './matterChecklists'
import { obligationTypes as seedObligationTypes } from './obligationTypes'
import { deriveFirstPeriod, generateFilingPeriods } from './filingPeriods'

/**
 * How far ahead filing periods are generated: the current tax year + this many.
 * One constant, one place to change it — see open decision #3 in
 * plans/tax-year-engine/PLAN.md.
 */
export const PERIOD_HORIZON_YEARS = 1

export const TODAY = seed.TODAY

interface FirmProfile {
  name: string
  trn: string
  address: string
  phone: string
  email: string
  /**
   * Whether reopening a closed tax year demands a typed reason.
   * Default on — see plans/tax-year-engine open decision #1. Turning it off
   * removes the prompt, never the audit entry.
   */
  requireReopenReason: boolean
}

interface DataContextValue {
  clients: Client[]
  clientDocuments: ClientDocument[]
  documentTypes: DocumentTypeDef[]
  obligationTypes: ObligationType[]
  registrations: Registration[]
  filingPeriods: FilingPeriod[]
  clientYears: ClientYear[]
  auditLog: AuditEntry[]
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

  addDocument: (input: { clientId: string; typeId: string; number?: string; issueDate: string; expiryDate: string; matterId?: string }) => ClientDocument
  addDocumentType: (input: Omit<DocumentTypeDef, 'id'>) => void
  linkDocumentToMatter: (documentId: string, matterId: string) => void
  unlinkDocumentFromMatter: (documentId: string) => void

  addRegistration: (input: {
    clientId: string
    obligationTypeId: string
    registrationNumber?: string
    effectiveDate: string
    periodicity?: Periodicity
    staggerGroup?: QuarterStagger
    fiscalYearEndMonth?: number
    dueRule?: DueRule
    certificateDocumentId?: string
  }) => Registration
  updateRegistration: (id: string, patch: Partial<Registration>) => void
  deregisterRegistration: (id: string, deregisteredAt: string) => void
  regeneratePeriodsFor: (registrationId: string) => void
  markFilingFiled: (filingPeriodId: string, filedAt?: string) => void
  markFilingNotRequired: (filingPeriodId: string) => void
  openClientYear: (clientId: string, taxYear: number) => void
  closeClientYear: (clientId: string, taxYear: number) => void
  reopenClientYear: (clientId: string, taxYear: number, reason: string) => void
  /** Returns the count so a disabled button can say *why*, not just be dead. */
  canCloseClientYear: (clientId: string, taxYear: number) => { ok: boolean; pendingCount: number }
  revertFilingToPending: (filingPeriodId: string) => void

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

/**
 * Bumped from v1 in Phase 2: v1 state has no registrations, so loading it would
 * render an app whose compliance spine is empty while every other slice looks
 * populated — worse than a clean reseed, and harder to diagnose.
 */
const DEFAULT_FIRM_PROFILE: FirmProfile = {
  name: 'Sanuma Tax Advisory FZE',
  trn: '100234567800003',
  address: 'Office 1402, Prism Tower, Business Bay, Dubai, UAE',
  phone: '+971 4 123 4567',
  email: 'info@sanuma-tax.ae',
  requireReopenReason: true,
}

const STORAGE_KEY = 'sanuma-app-state-v2'
const ONBOARDING_DRAFT_KEY = 'sanuma-onboarding-draft'

interface PersistedState {
  clients?: Client[]
  clientDocuments?: ClientDocument[]
  documentTypes?: DocumentTypeDef[]
  obligationTypes?: ObligationType[]
  registrations?: Registration[]
  filingPeriods?: FilingPeriod[]
  clientYears?: ClientYear[]
  auditLog?: AuditEntry[]
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

function currentTaxYear(): number {
  return Number(TODAY.slice(0, 4))
}

function horizonYear(): number {
  return currentTaxYear() + PERIOD_HORIZON_YEARS
}

/**
 * Completes the seed registrations, whose first period is left to
 * deriveFirstPeriod() rather than hand-written — the same path onboarding takes,
 * so the seed cannot drift from real entry.
 */
function hydrateSeedRegistrations(): Registration[] {
  return seed.registrations.map((r) => ({
    ...r,
    ...deriveFirstPeriod(r.effectiveDate, r.periodicity, {
      staggerGroup: r.staggerGroup,
      fiscalYearEndMonth: r.fiscalYearEndMonth,
    }),
  }))
}

function buildSeedFilingPeriods(regs: Registration[], types: ObligationType[]): FilingPeriod[] {
  const generated = regs.flatMap((r) => {
    const type = types.find((t) => t.id === r.obligationTypeId)
    return type ? generateFilingPeriods(r, type, horizonYear()) : []
  })
  // Historical periods are marked filed — see applySeedFilingHistory.
  return seed.applySeedFilingHistory(generated)
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
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeDef[]>(persisted.documentTypes ?? seed.documentTypes)
  // Setter intentionally omitted until Phase 8 adds the catalog editor.
  const [obligationTypes] = useState<ObligationType[]>(persisted.obligationTypes ?? seedObligationTypes)
  const [registrations, setRegistrations] = useState<Registration[]>(persisted.registrations ?? hydrateSeedRegistrations)
  const [filingPeriods, setFilingPeriods] = useState<FilingPeriod[]>(
    () => persisted.filingPeriods ?? buildSeedFilingPeriods(hydrateSeedRegistrations(), persisted.obligationTypes ?? seedObligationTypes),
  )
  const [clientYears, setClientYears] = useState<ClientYear[]>(persisted.clientYears ?? [])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(persisted.auditLog ?? [])
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
    // Spread over the default so a profile persisted before a field existed
    // still gets it, rather than arriving as undefined.
    { ...DEFAULT_FIRM_PROFILE, ...(persisted.firmProfile ?? {}) },
  )

  useEffect(() => {
    const toSave: PersistedState = {
      clients,
      clientDocuments,
      documentTypes,
      obligationTypes,
      registrations,
      filingPeriods,
      clientYears,
      auditLog,
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
    obligationTypes,
    registrations,
    filingPeriods,
    clientYears,
    auditLog,
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

  useEffect(() => {
    // The draft shape changes in Phase 3; a v1 draft would crash the wizard.
    localStorage.removeItem(ONBOARDING_DRAFT_KEY)
  }, [])

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
    const created: ClientDocument = { id: genId('d'), status: docStatusFromExpiry(input.expiryDate), ...input }
    setClientDocuments((prev) => [...prev, created])
    return created
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

  // --- registrations & filing periods -------------------------------------

  /**
   * Regenerates a registration's schedule WITHOUT touching history.
   *
   * A period is "locked" once it has been filed, or has a matter or invoice
   * against it. Locked periods are preserved including their original dates: if
   * a filed period's dates were recomputed, the invoice already issued against
   * it would start describing a period that no longer matches what was filed
   * with the FTA. Keying on periodStart also keeps matterId / invoiceId
   * back-links intact across a regeneration.
   *
   * Where a locked period contradicts the fresh schedule (someone corrected an
   * effective date after filing), the locked one wins and the mismatch stays
   * visible rather than being resolved silently.
   */
  function regeneratePeriodsFor(registrationId: string) {
    setFilingPeriods((prev) => {
      const reg = registrations.find((r) => r.id === registrationId)
      const type = reg && obligationTypes.find((t) => t.id === reg.obligationTypeId)
      if (!reg || !type) return prev

      const others = prev.filter((p) => p.registrationId !== registrationId)
      const mine = prev.filter((p) => p.registrationId === registrationId)
      const locked = mine.filter((p) => p.state === 'filed' || p.matterId || p.invoiceId)
      const lockedByStart = new Map(locked.map((p) => [p.periodStart, p]))

      const fresh = generateFilingPeriods(reg, type, horizonYear())
      const merged = fresh.map((p) => lockedByStart.get(p.periodStart) ?? p)

      // Locked periods the fresh schedule no longer produces are kept, never dropped.
      const orphanedLocked = locked.filter((p) => !fresh.some((f) => f.periodStart === p.periodStart))

      return [...others, ...orphanedLocked, ...merged]
    })
  }

  function addRegistration(input: {
    clientId: string
    obligationTypeId: string
    registrationNumber?: string
    effectiveDate: string
    periodicity?: Periodicity
    staggerGroup?: QuarterStagger
    fiscalYearEndMonth?: number
    dueRule?: DueRule
    certificateDocumentId?: string
  }) {
    const type = obligationTypes.find((t) => t.id === input.obligationTypeId)
    const periodicity = input.periodicity ?? type?.periodicity ?? 'quarterly'
    const staggerGroup = input.staggerGroup ?? (periodicity === 'quarterly' ? type?.staggerOptions?.[0] : undefined)
    const fiscalYearEndMonth = input.fiscalYearEndMonth ?? (periodicity === 'annual' ? (type?.fiscalYearEndMonth ?? 12) : undefined)

    // Three inputs in, a full schedule out — this is what keeps onboarding short.
    const firstPeriod = deriveFirstPeriod(input.effectiveDate, periodicity, { staggerGroup, fiscalYearEndMonth })

    const created: Registration = {
      id: genId('reg'),
      clientId: input.clientId,
      obligationTypeId: input.obligationTypeId,
      registrationNumber: input.registrationNumber,
      effectiveDate: input.effectiveDate,
      ...firstPeriod,
      periodicity,
      staggerGroup,
      fiscalYearEndMonth,
      dueRule: input.dueRule,
      certificateDocumentId: input.certificateDocumentId,
      status: 'active',
      createdAt: TODAY,
    }

    setRegistrations((prev) => [...prev, created])
    if (type) {
      setFilingPeriods((prev) => [...prev, ...generateFilingPeriods(created, type, horizonYear())])
    }
    return created
  }

  function updateRegistration(id: string, patch: Partial<Registration>) {
    const before = registrations.find((r) => r.id === id)
    if (before) {
      addAuditEntry({
        action: 'registration-edited',
        clientId: before.clientId,
        subject: obligationTypes.find((t) => t.id === before.obligationTypeId)?.name ?? 'Registration',
      })
    }
    setRegistrations((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const next = { ...r, ...patch }
        // If the cycle or effective date moved, the first period must be
        // re-derived — otherwise the whole schedule walks from a stale anchor.
        const anchorChanged =
          patch.effectiveDate !== undefined ||
          patch.periodicity !== undefined ||
          patch.staggerGroup !== undefined ||
          patch.fiscalYearEndMonth !== undefined
        if (anchorChanged && patch.firstPeriodStart === undefined) {
          Object.assign(
            next,
            deriveFirstPeriod(next.effectiveDate, next.periodicity, {
              staggerGroup: next.staggerGroup,
              fiscalYearEndMonth: next.fiscalYearEndMonth,
            }),
          )
        }
        return next
      }),
    )
  }

  function deregisterRegistration(id: string, deregisteredAt: string) {
    setRegistrations((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'deregistered', deregisteredAt } : r)))
  }

  function markFilingFiled(filingPeriodId: string, filedAt?: string) {
    setFilingPeriods((prev) =>
      prev.map((p) => (p.id === filingPeriodId ? { ...p, state: 'filed', filedAt: filedAt ?? TODAY } : p)),
    )
  }

  function markFilingNotRequired(filingPeriodId: string) {
    setFilingPeriods((prev) =>
      prev.map((p) => (p.id === filingPeriodId ? { ...p, state: 'not-required', filedAt: undefined } : p)),
    )
  }

  function addAuditEntry(input: Omit<AuditEntry, 'id' | 'at' | 'actor'>) {
    setAuditLog((prev) => [
      ...prev,
      { id: genId('au'), at: `${TODAY}T00:00:00`, actor: firmProfile.name, ...input },
    ])
  }

  /**
   * A year can close only when nothing in it is still pending. There is
   * deliberately no force-close: a year closed over unfiled returns is a false
   * statement about the client's compliance, and the record's only value is
   * that it can be trusted.
   */
  function canCloseClientYear(clientId: string, taxYear: number) {
    const pendingCount = filingPeriods.filter(
      (p) => p.clientId === clientId && p.taxYear === taxYear && p.state === 'pending',
    ).length
    return { ok: pendingCount === 0, pendingCount }
  }

  function closeClientYear(clientId: string, taxYear: number) {
    if (!canCloseClientYear(clientId, taxYear).ok) return
    setClientYears((prev) => {
      const exists = prev.some((y) => y.clientId === clientId && y.taxYear === taxYear)
      const closed: ClientYear = { clientId, taxYear, status: 'closed', closedAt: TODAY }
      return exists
        ? prev.map((y) => (y.clientId === clientId && y.taxYear === taxYear ? { ...y, ...closed } : y))
        : [...prev, closed]
    })
    addAuditEntry({ action: 'year-closed', clientId, subject: `Tax year ${taxYear}` })
  }

  function reopenClientYear(clientId: string, taxYear: number, reason: string) {
    setClientYears((prev) =>
      prev.map((y) =>
        y.clientId === clientId && y.taxYear === taxYear
          ? { ...y, status: 'open', reopenedAt: TODAY, reopenReason: reason || undefined, closedAt: undefined }
          : y,
      ),
    )
    addAuditEntry({ action: 'year-reopened', clientId, subject: `Tax year ${taxYear}`, note: reason || undefined })
  }

  /**
   * Amended returns are routine. Reverting keeps matterId and invoiceId intact,
   * and the period stays locked against regeneration for the same reason it was
   * locked when filed.
   */
  function revertFilingToPending(filingPeriodId: string) {
    const period = filingPeriods.find((p) => p.id === filingPeriodId)
    setFilingPeriods((prev) =>
      prev.map((p) => (p.id === filingPeriodId ? { ...p, state: 'pending', filedAt: undefined } : p)),
    )
    if (period) {
      addAuditEntry({
        action: 'filing-reverted',
        clientId: period.clientId,
        subject: period.label,
        note: 'Reopened for amendment',
      })
    }
  }

  function openClientYear(clientId: string, taxYear: number) {
    setClientYears((prev) =>
      prev.some((y) => y.clientId === clientId && y.taxYear === taxYear)
        ? prev
        : [...prev, { clientId, taxYear, status: 'open' }],
    )
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
        documentTypes,
        obligationTypes,
        registrations,
        filingPeriods,
        clientYears,
        auditLog,
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
        addRegistration,
        updateRegistration,
        deregisterRegistration,
        regeneratePeriodsFor,
        markFilingFiled,
        markFilingNotRequired,
        openClientYear,
        closeClientYear,
        reopenClientYear,
        canCloseClientYear,
        revertFilingToPending,
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
