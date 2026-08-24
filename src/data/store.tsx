import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as seed from './mockData'
import type {
  AuditEntry,
  Channel,
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
  ReminderAudience,
  ReminderLogEntry,
  ReminderRule,
  Service,
  StaffUser,
  WalletTransaction,
} from './types'
import { addDays, formatAED, genId, isOverdue, todayIso, urgencyFromDate } from '../lib/utils'
import { invoiceTotal } from '../lib/invoice'
import { defaultChecklistForService } from './matterChecklists'
import { obligationTypes as seedObligationTypes } from './obligationTypes'
import { roleCan, type Permission } from './permissions'
import { demoPasswordMatches } from './demoCredentials'
import { deriveFirstPeriod, generateFilingPeriods, matterDefaultsForFiling } from './filingPeriods'

/**
 * How far ahead filing periods are generated: the current tax year + this many.
 * One constant, one place to change it — see open decision #3 in
 * plans/tax-year-engine/PLAN.md.
 */
export const PERIOD_HORIZON_YEARS = 1

/**
 * The seed's authoring date, re-exported for screens that anchor demo data to it
 * (default tax-year pickers, form date defaults).
 *
 * It is NOT "now". Every record this store writes about something that just
 * happened — a filed date, an audit entry, an invoice issue date, a ledger line —
 * is stamped with `todayIso()`. Phase 6 established that rule after the reminder
 * log recorded a chase sent in August as sent in July; Phase 7 finished applying
 * it here after the filing → matter → invoice chain filed a return on the real
 * date and invoiced it five weeks earlier.
 */
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
  activeStaff: StaffUser
  setActiveStaff: (staff: StaffUser) => void
  /** False until someone picks a user on the login screen. */
  signedIn: boolean
  signIn: (staffId: string) => void
  /**
   * Email + password sign-in. Returns a reason on failure rather than a bare
   * false, so the form can say which half was wrong.
   */
  signInWithCredentials: (email: string, password: string) => { ok: boolean; reason?: string }
  signOut: () => void
  staffMembers: StaffUser[]
  /**
   * Whether the signed-in staff member may do something. One matrix in
   * permissions.ts answers it — never a role comparison inside a component.
   */
  can: (permission: Permission) => boolean
  /** `actor` defaults to the signed-in staff member; pass it only to attribute the act to someone else. */
  addAuditEntry: (input: Omit<AuditEntry, 'id' | 'at' | 'actor'> & { actor?: string }) => void

  addClient: (input: Omit<Client, 'id' | 'createdAt' | 'avatarColor'> & { avatarColor?: string }) => Client
  updateClient: (id: string, patch: Partial<Client>) => void

  addDocument: (input: { clientId: string; typeId: string; number?: string; issueDate: string; expiryDate: string; matterId?: string }) => ClientDocument
  addDocumentType: (input: Omit<DocumentTypeDef, 'id'>) => void
  linkDocumentToMatter: (documentId: string, matterId: string) => void
  unlinkDocumentFromMatter: (documentId: string) => void

  addObligationType: (input: Omit<ObligationType, 'id' | 'builtIn'>) => ObligationType
  updateObligationType: (id: string, patch: Partial<Omit<ObligationType, 'id' | 'builtIn'>>) => void
  deleteObligationType: (id: string) => { ok: boolean; reason?: string }
  registrationsUsingObligation: (obligationTypeId: string) => Registration[]

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
  markFilingFiled: (
    filingPeriodId: string,
    details?:
      | {
        filedAt?: string
        ftaReferenceNo?: string
        taxPayableOrRefund?: number
        submissionReceiptName?: string
        submittedBy?: string
        note?: string
      }
      | string,
  ) => void
  markFilingNotRequired: (filingPeriodId: string) => void
  openClientYear: (clientId: string, taxYear: number) => void
  closeClientYear: (clientId: string, taxYear: number) => void
  reopenClientYear: (clientId: string, taxYear: number, reason: string) => void
  /** Returns the count so a disabled button can say *why*, not just be dead. */
  canCloseClientYear: (clientId: string, taxYear: number) => { ok: boolean; pendingCount: number }
  revertFilingToPending: (filingPeriodId: string) => void

  addMatter: (input: { clientId: string; title: string; serviceId: string; dueDate?: string; clientInitiated?: boolean }) => Matter
  /**
   * Opens the matter that files a period, auto-titled from the obligation and
   * back-linked both ways. Returns the existing matter when there already is
   * one — two matters for one return means two invoices for one return.
   */
  openMatterForFiling: (
    filingPeriodId: string,
    overrides?: { title?: string; serviceId?: string; dueDate?: string; clientInitiated?: boolean },
  ) => Matter | undefined
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
  updateExpense: (id: string, patch: Partial<Omit<Expense, 'id'>>) => void
  deleteExpense: (id: string) => void

  addWalletTransaction: (input: { clientId: string; type: 'credit' | 'debit'; reason: string; amount: number }) => void
  applyWalletToInvoice: (clientId: string, invoiceId: string, amount: number) => void

  updateReminderRule: (id: string, patch: Partial<ReminderRule>) => void
  /**
   * Records that a reminder went out. There is no real delivery in this
   * prototype — this appends the log entry that answers "did we warn them".
   */
  logReminderSent: (input: {
    clientId: string
    subject: string
    channels: Channel[]
    audience: ReminderAudience
    filingPeriodId?: string
    documentId?: string
  }) => void
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
  name: 'Sanuma Tax Advisory',
  trn: '100234567800003',
  address: 'Office 1402, Prism Tower, Business Bay, Dubai, UAE',
  phone: '+971 4 123 4567',
  email: 'info@sanuma-tax.ae',
  requireReopenReason: true,
}

const STORAGE_KEY = 'sanuma-app-state-v2'
const ONBOARDING_DRAFT_KEY = 'sanuma-onboarding-draft'

/**
 * Who is signed in, kept apart from the app state.
 *
 * Separate key on purpose: a session is not data. Clearing the demo data should
 * not sign you out, and signing out should not wipe a client's records. It also
 * survives the STORAGE_KEY bumps this project keeps needing.
 */
const SESSION_KEY = 'sanuma-session-staff-id'

function loadSessionStaffId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

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
  reminderLog?: ReminderLogEntry[]
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

/**
 * Rules persisted before Phase 6 keyed on `typeId` / `typeName` and only ever
 * watched documents. Migrated in place rather than bumping STORAGE_KEY again —
 * Phase 2 already bumped it once, and a second wipe would discard the demo data
 * a tester had just set up.
 */
interface LegacyReminderRule {
  typeId?: string
  typeName?: string
}

function migrateReminderRules(rules: ReminderRule[]): ReminderRule[] {
  return rules.map((r) => {
    if (r.subjectKind) return r
    const legacy = r as ReminderRule & LegacyReminderRule
    return {
      ...r,
      subjectKind: 'document',
      subjectTypeId: legacy.subjectTypeId ?? legacy.typeId ?? '',
      subjectName: legacy.subjectName ?? legacy.typeName ?? 'Document',
      audience: r.audience ?? 'client',
    }
  })
}

/**
 * Deliberately on `TODAY`, not the real clock: this sets how far the generator
 * runs, and the seeded filing history is written against the seed's year. Reading
 * the real clock here would silently regenerate a different number of periods
 * than the seed marked filed.
 */
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

/**
 * Reconciles the persisted catalog with the built-ins defined in code.
 *
 * Field-level merge, seed first: a key the firm has edited wins, and a key the
 * code has since ADDED still arrives (Phase 7 gave the Excise obligation a
 * `serviceId`; without this a tester with saved state would open a matter
 * against an excise return with nothing to bill).
 *
 * Phase 8 made built-ins editable, which is why the precedence is this way round
 * and not the reverse — a firm that legitimately changed the VAT due rule must
 * not have it silently reset on every reload. Custom types pass through
 * untouched.
 */
function hydrateObligationTypes(stored: ObligationType[] | undefined): ObligationType[] {
  if (!stored) return seedObligationTypes
  const storedById = new Map(stored.map((t) => [t.id, t]))
  const builtIn = seedObligationTypes.map((t) => ({ ...t, ...storedById.get(t.id), builtIn: true }))
  const custom = stored.filter((t) => !seedObligationTypes.some((s) => s.id === t.id))
  return [...builtIn, ...custom]
}

/**
 * Rebuilds one registration's schedule inside `all`, WITHOUT touching history.
 *
 * A period is "locked" once it has been filed, or has a matter or invoice
 * against it. Locked periods are preserved including their original dates: if a
 * filed period's dates were recomputed, the invoice already issued against it
 * would start describing a period that no longer matches what was filed with the
 * FTA. Keying on `periodStart` also keeps matterId / invoiceId back-links intact
 * across a regeneration.
 *
 * Where a locked period contradicts the fresh schedule (someone corrected an
 * effective date after filing), the locked one wins and the mismatch stays
 * visible rather than being resolved silently.
 *
 * Pure and reducible, so the catalog editor can reschedule many registrations in
 * a single state update without the locking rule being written twice.
 */
function mergeRegenerated(
  all: FilingPeriod[],
  reg: Registration,
  type: ObligationType,
  throughTaxYear: number,
): FilingPeriod[] {
  const others = all.filter((p) => p.registrationId !== reg.id)
  const mine = all.filter((p) => p.registrationId === reg.id)
  const locked = mine.filter((p) => p.state === 'filed' || p.matterId || p.invoiceId)
  const lockedByStart = new Map(locked.map((p) => [p.periodStart, p]))

  const fresh = generateFilingPeriods(reg, type, throughTaxYear)
  const merged = fresh.map((p) => lockedByStart.get(p.periodStart) ?? p)

  // Locked periods the fresh schedule no longer produces are kept, never dropped.
  const orphanedLocked = locked.filter((p) => !fresh.some((f) => f.periodStart === p.periodStart))

  return [...others, ...orphanedLocked, ...merged]
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
  // `critical` folds in here rather than growing the stored enum: this field is a
  // cache of a derived value, and every reader already treats 'expired' as terminal.
  if (isOverdue(urgency)) return 'expired'
  if (urgency === 'warning') return 'expiring'
  return 'valid'
}

export const DEFAULT_STAFF_MEMBERS: StaffUser[] = [
  {
    id: 'staff-1',
    name: 'Adv. Muhammad Hannan',
    title: 'Managing Partner & Registered Tax Agent',
    email: 'hannan@sanuma-tax.ae',
    role: 'partner',
    avatarColor: 'bg-emerald-600',
  },
  {
    id: 'staff-2',
    name: 'Sarah Al Zaabi',
    title: 'Senior Corporate Tax Consultant',
    email: 'sarah@sanuma-tax.ae',
    role: 'consultant',
    avatarColor: 'bg-teal-600',
  },
  {
    id: 'staff-3',
    name: 'Rashid Al Nuaimi',
    title: 'Associate Tax Advisor',
    email: 'rashid@sanuma-tax.ae',
    role: 'assistant',
    avatarColor: 'bg-sky-600',
  },
]

export function DataProvider({ children }: { children: ReactNode }) {
  const [sessionStaffId, setSessionStaffId] = useState<string | null>(loadSessionStaffId)
  const [persisted] = useState(loadPersisted)
  const [clients, setClients] = useState<Client[]>(persisted.clients ?? seed.clients)

  const currentClient = clients.find((c) => c.id === sessionStaffId)
  const activeStaff: StaffUser =
    DEFAULT_STAFF_MEMBERS.find((m) => m.id === sessionStaffId) ??
    (currentClient
      ? {
        id: currentClient.id,
        name: currentClient.name,
        title: currentClient.businessName ? `Client (${currentClient.businessName})` : 'Client User',
        email: currentClient.email,
        avatarColor: currentClient.avatarColor || 'bg-amber-600 text-white',
        role: 'assistant',
      }
      : DEFAULT_STAFF_MEMBERS[0])

  const signedIn =
    !!sessionStaffId &&
    (DEFAULT_STAFF_MEMBERS.some((m) => m.id === sessionStaffId) || clients.some((c) => c.id === sessionStaffId))

  const [clientDocuments, setClientDocuments] = useState<ClientDocument[]>(persisted.clientDocuments ?? seed.clientDocuments)
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeDef[]>(persisted.documentTypes ?? seed.documentTypes)
  const [obligationTypes, setObligationTypes] = useState<ObligationType[]>(() =>
    hydrateObligationTypes(persisted.obligationTypes),
  )
  const [registrations, setRegistrations] = useState<Registration[]>(persisted.registrations ?? hydrateSeedRegistrations)
  const [filingPeriods, setFilingPeriods] = useState<FilingPeriod[]>(
    () => persisted.filingPeriods ?? buildSeedFilingPeriods(hydrateSeedRegistrations(), hydrateObligationTypes(persisted.obligationTypes)),
  )
  const [clientYears, setClientYears] = useState<ClientYear[]>(persisted.clientYears ?? [])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(persisted.auditLog ?? [])
  const [reminderRules, setReminderRules] = useState<ReminderRule[]>(() =>
    migrateReminderRules(persisted.reminderRules ?? seed.reminderRules),
  )
  const [reminderLog, setReminderLog] = useState<ReminderLogEntry[]>(persisted.reminderLog ?? seed.reminderLog)
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
      reminderLog,
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
    reminderLog,
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

  function signIn(userId: string) {
    if (!DEFAULT_STAFF_MEMBERS.some((m) => m.id === userId) && !clients.some((c) => c.id === userId)) return
    try {
      localStorage.setItem(SESSION_KEY, userId)
    } catch {
      // A blocked storage write must not stop the sign-in; the session just
      // lasts until the tab closes.
    }
    setSessionStaffId(userId)
  }

  function signInWithCredentials(email: string, password: string) {
    const trimmed = email.trim().toLowerCase()
    const staff = DEFAULT_STAFF_MEMBERS.find((m) => m.email.toLowerCase() === trimmed)
    const client = clients.find((c) => c.email.toLowerCase() === trimmed)

    if (!staff && !client) return { ok: false, reason: 'No user with that email address.' }
    const id = staff?.id ?? client?.id ?? ''
    if (!demoPasswordMatches(id, password)) return { ok: false, reason: 'That password is not correct.' }
    signIn(id)
    return { ok: true }
  }

  function signOut() {
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch {
      /* nothing to clean up */
    }
    setSessionStaffId(null)
  }

  /** Kept for the Topbar's switcher, which is a shortcut for signing in as someone else. */
  function setActiveStaff(staff: StaffUser) {
    signIn(staff.id)
  }

  function can(permission: Permission) {
    return roleCan(activeStaff.role, permission)
  }

  function addClient(input: Omit<Client, 'id' | 'createdAt' | 'avatarColor'> & { avatarColor?: string }) {
    const created: Client = {
      id: genId('c'),
      createdAt: todayIso(),
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
        {
          id: genId('rr'),
          subjectKind: 'document',
          subjectTypeId: id,
          subjectName: input.name,
          daysBefore: input.defaultReminderDays,
          channels: input.defaultChannels,
          audience: 'client',
          enabled: true,
        },
      ])
    }
  }

  // --- obligation catalog --------------------------------------------------

  function registrationsUsingObligation(obligationTypeId: string) {
    return registrations.filter((r) => r.obligationTypeId === obligationTypeId)
  }

  /**
   * A new obligation gets a reminder rule immediately, the same way
   * `addDocumentType` does. A firm that adds "Municipality Return" and hears
   * nothing about it until they notice the silence has been given a deadline the
   * system will not chase.
   */
  function addObligationType(input: Omit<ObligationType, 'id' | 'builtIn'>) {
    const created: ObligationType = { id: genId('ob'), builtIn: false, ...input }
    setObligationTypes((prev) => [...prev, created])
    setReminderRules((prev) => [
      ...prev,
      {
        id: genId('rr'),
        subjectKind: 'obligation',
        subjectTypeId: created.id,
        subjectName: created.name,
        daysBefore: created.defaultReminderDays,
        channels: created.defaultChannels,
        // Filing deadlines need chasing on both sides — matches the seed.
        audience: 'both',
        enabled: true,
      },
    ])
    return created
  }

  function updateObligationType(id: string, patch: Partial<Omit<ObligationType, 'id' | 'builtIn'>>) {
    const before = obligationTypes.find((t) => t.id === id)
    setObligationTypes((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    // Keep the rule's display name in step; the rule is keyed on id, not name.
    if (patch.name) {
      setReminderRules((prev) =>
        prev.map((r) =>
          r.subjectKind === 'obligation' && r.subjectTypeId === id ? { ...r, subjectName: patch.name! } : r,
        ),
      )
    }
    // The cycle moved, so every schedule built from it is now wrong.
    if (!before || (patch.periodicity === undefined && patch.dueRule === undefined)) return
    const affected = registrationsUsingObligation(id)
    if (affected.length === 0) return

    // The merged type is used explicitly: `obligationTypes` still holds the
    // pre-edit value during this render, so regenerating off state would rebuild
    // the schedule from the rule the firm just changed away from.
    const next: ObligationType = { ...before, ...patch }

    // A registration stores its OWN periodicity, copied when it was created, and
    // `generateFilingPeriods` reads it from there. So changing the catalog's cycle
    // has to move each registration too — otherwise the catalog would say monthly
    // while every schedule quietly stayed quarterly.
    const moved =
      patch.periodicity !== undefined
        ? affected
          .filter((r) => r.periodicity !== patch.periodicity)
          .map((r) => {
            const periodicity = patch.periodicity!
            const staggerGroup = periodicity === 'quarterly' ? (r.staggerGroup ?? next.staggerOptions?.[0]) : undefined
            const fiscalYearEndMonth =
              periodicity === 'annual' ? (r.fiscalYearEndMonth ?? next.fiscalYearEndMonth ?? 12) : undefined
            return {
              ...r,
              periodicity,
              staggerGroup,
              fiscalYearEndMonth,
              ...deriveFirstPeriod(r.effectiveDate, periodicity, { staggerGroup, fiscalYearEndMonth }),
            }
          })
        : []

    if (moved.length > 0) {
      const movedById = new Map(moved.map((r) => [r.id, r]))
      setRegistrations((prev) => prev.map((r) => movedById.get(r.id) ?? r))
    }

    // One state update for all of them: regenerating in a loop of setState calls
    // would each read the same stale `prev` and only the last would survive.
    const movedById = new Map(moved.map((r) => [r.id, r]))
    setFilingPeriods((prev) =>
      affected.reduce((acc, r) => mergeRegenerated(acc, movedById.get(r.id) ?? r, next, horizonYear()), prev),
    )
  }

  function deleteObligationType(id: string) {
    const type = obligationTypes.find((t) => t.id === id)
    if (!type) return { ok: false, reason: 'That obligation no longer exists.' }
    if (type.builtIn) {
      return {
        ok: false,
        reason: `${type.name} is built in. It can be edited, but deleting it would orphan every registration pointing at it.`,
      }
    }
    const inUse = registrationsUsingObligation(id)
    if (inUse.length > 0) {
      return {
        ok: false,
        reason: `${inUse.length} registration${inUse.length === 1 ? '' : 's'} still use${inUse.length === 1 ? 's' : ''} ${type.name}. Remove or repoint ${inUse.length === 1 ? 'it' : 'them'} first — deleting now would take filed periods and their invoices with it.`,
      }
    }
    setObligationTypes((prev) => prev.filter((t) => t.id !== id))
    setReminderRules((prev) => prev.filter((r) => !(r.subjectKind === 'obligation' && r.subjectTypeId === id)))
    return { ok: true }
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
  function regeneratePeriodsFor(registrationId: string, typeOverride?: ObligationType) {
    setFilingPeriods((prev) => {
      const reg = registrations.find((r) => r.id === registrationId)
      const type = typeOverride ?? (reg && obligationTypes.find((t) => t.id === reg.obligationTypeId))
      if (!reg || !type) return prev
      return mergeRegenerated(prev, reg, type, horizonYear())
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
      createdAt: todayIso(),
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

  /**
   * `filedAt` defaults to the real clock, not the seed's `TODAY`. Phase 6 fixed
   * this for the reminder log; the same defect here is worse — "when did we file
   * it" is the answer to an FTA late-filing penalty, and a return filed today
   * must not be recorded as filed on the seed's authoring date.
   */
  /**
   * Marks a period filed, capturing FTA reference number and net tax payable if supplied,
   * and automatically logging an audit entry.
   */
  function markFilingFiled(
    filingPeriodId: string,
    details?:
      | {
        filedAt?: string
        ftaReferenceNo?: string
        taxPayableOrRefund?: number
        submissionReceiptName?: string
        submittedBy?: string
        note?: string
      }
      | string,
  ) {
    const filedAt = typeof details === 'string' ? details : details?.filedAt ?? todayIso()
    const ftaReferenceNo = typeof details === 'object' ? details.ftaReferenceNo : undefined
    const taxPayableOrRefund = typeof details === 'object' ? details.taxPayableOrRefund : undefined
    const submissionReceiptName = typeof details === 'object' ? details.submissionReceiptName : undefined
    const submittedBy = typeof details === 'object' ? details.submittedBy ?? activeStaff.name : activeStaff.name

    setFilingPeriods((prev) =>
      prev.map((p) =>
        p.id === filingPeriodId
          ? {
            ...p,
            state: 'filed',
            filedAt,
            ftaReferenceNo: ftaReferenceNo || p.ftaReferenceNo,
            taxPayableOrRefund: taxPayableOrRefund !== undefined ? taxPayableOrRefund : p.taxPayableOrRefund,
            submissionReceiptName: submissionReceiptName || p.submissionReceiptName,
            submittedBy,
          }
          : p,
      ),
    )

    const period = filingPeriods.find((p) => p.id === filingPeriodId)
    if (period) {
      const type = obligationTypes.find((t) => t.id === period.obligationTypeId)
      addAuditEntry({
        action: 'filing-submitted',
        clientId: period.clientId,
        subject: `${type?.name ?? 'Filing'} — ${period.label}`,
        note: ftaReferenceNo ? `FTA Ref: ${ftaReferenceNo}${taxPayableOrRefund !== undefined ? ` · Net Tax: ${formatAED(taxPayableOrRefund)}` : ''}` : undefined,
        actor: submittedBy,
      })
    }
  }

  function markFilingNotRequired(filingPeriodId: string) {
    setFilingPeriods((prev) =>
      prev.map((p) => (p.id === filingPeriodId ? { ...p, state: 'not-required', filedAt: undefined } : p)),
    )
  }

  /** Stamped from the real clock for the same reason as `filedAt` — an audit
   * trail that reports the wrong date is worse than none. */
  function addAuditEntry(input: Omit<AuditEntry, 'id' | 'at' | 'actor'> & { actor?: string }) {
    setAuditLog((prev) => [
      ...prev,
      {
        // Spread first: the computed fields below must win. With `...input` last,
        // an omitted `actor` overwrote the resolved one with undefined.
        ...input,
        id: genId('au'),
        at: `${todayIso()}T${new Date().toTimeString().slice(0, 8)}`,
        // Most actions are attributed to whoever is signed in; a caller passes
        // `actor` only when recording someone else's act (an FTA submission
        // filed by a named staff member).
        actor: input.actor || activeStaff.name,
      },
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
      const closed: ClientYear = { clientId, taxYear, status: 'closed', closedAt: todayIso() }
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
          ? { ...y, status: 'open', reopenedAt: todayIso(), reopenReason: reason || undefined, closedAt: undefined }
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
      openedAt: todayIso(),
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
        createdAt: todayIso(),
        status: 'pending',
      }
      setPendingCharges((prev) => [...prev, charge])
      created.penaltyChargeId = charge.id
    }

    setMattersState((prev) => [...prev, created])
    return created
  }

  /**
   * The filing → matter half of the chain.
   *
   * Guards against duplicates by returning the existing matter rather than
   * creating a second one: two matters for one return end up as two invoices for
   * one return, and the FTA record has no way to say which was real.
   *
   * Returns undefined only when nothing can be resolved to bill against — an
   * obligation with no service, or a service deleted from the catalog. The
   * caller then has to ask for one instead of guessing.
   */
  function openMatterForFiling(
    filingPeriodId: string,
    overrides?: { title?: string; serviceId?: string; dueDate?: string; clientInitiated?: boolean },
  ) {
    const period = filingPeriods.find((p) => p.id === filingPeriodId)
    if (!period) return undefined

    const existing = period.matterId ? matters.find((m) => m.id === period.matterId) : undefined
    if (existing) return existing

    const type = obligationTypes.find((t) => t.id === period.obligationTypeId)
    const defaults = matterDefaultsForFiling(period, type)
    const serviceId = overrides?.serviceId ?? defaults.serviceId
    if (!serviceId || !services.some((s) => s.id === serviceId)) return undefined

    const created = addMatter({
      clientId: period.clientId,
      title: overrides?.title?.trim() || defaults.title,
      serviceId,
      dueDate: overrides?.dueDate ?? defaults.dueDate,
      // No penalty fee by default. SanumaBusinessFundamentalBn.md §5 charges the
      // minimum fee when the CLIENT's delay forces the firm to act — a return
      // filed on its own schedule is the engagement being performed, not that.
      // The lawyer can still flip it when a client did stonewall.
      clientInitiated: overrides?.clientInitiated ?? true,
    })

    setFilingPeriods((prev) => prev.map((p) => (p.id === filingPeriodId ? { ...p, matterId: created.id } : p)))
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
      prev.map((c) => (c.id === id && c.status === 'pending' ? { ...c, status: 'waived', waivedReason: reason, waivedAt: todayIso() } : c)),
    )
  }

  function updateMatter(id: string, patch: Partial<Matter>) {
    setMattersState((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m
        const next = { ...m, ...patch }
        if (patch.status !== undefined) {
          next.completedAt = patch.status === 'completed' ? (patch.completedAt ?? todayIso()) : undefined
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
    setQuotes((prev) => [...prev, { id: genId('q'), status: 'draft', createdAt: todayIso(), ...input }])
  }

  function addInvoice(input: { clientId: string; matterId?: string; lines: InvoiceLine[]; dueDate: string; pendingChargeIds?: string[] }) {
    const { pendingChargeIds, ...invoiceInput } = input
    // Built outside the updater: StrictMode double-invokes updaters, so generating the id
    // in there hands callers an id that never reaches state (breaking every back-reference).
    const created: Invoice = {
      id: genId('inv'),
      number: `INV-2026-${1001 + invoices.length}`,
      issueDate: todayIso(),
      status: 'unpaid',
      paidAmount: 0,
      ...invoiceInput,
    }
    setInvoices((prev) => [...prev, created])

    // Closes the filing → matter → invoice chain. Done here rather than at the
    // call site so an invoice raised against a filing matter is back-linked
    // whichever screen raised it.
    if (created.matterId) {
      setFilingPeriods((prev) =>
        prev.map((p) => (p.matterId === created.matterId && !p.invoiceId ? { ...p, invoiceId: created.id } : p)),
      )
    }

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
        addLedgerEntry({ date: todayIso(), account: 'Penalty Income', description: `${created.number} — firm-initiated matter fees`, debit: 0, credit: billedTotal })
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
    return addInvoice({ clientId: quote.clientId, lines, dueDate: addDays(todayIso(), 14) })
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
    addLedgerEntry({ date: todayIso(), account: 'Service Revenue', description: `${invoice.number} payment received`, debit: 0, credit: amount })

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
      return [...prev, { id: genId('cn'), number, issueDate: todayIso(), ...input }]
    })
    if (input.kind === 'firm-issued') {
      addLedgerEntry({ date: todayIso(), account: 'Credit Notes Issued', description: input.reason, debit: input.amount, credit: 0 })
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

  function updateExpense(id: string, patch: Partial<Omit<Expense, 'id'>>) {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  function deleteExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  function addWalletTransaction(input: { clientId: string; type: 'credit' | 'debit'; reason: string; amount: number }) {
    setWalletTransactions((prev) => [...prev, { id: genId('w'), date: todayIso(), ...input }])
  }

  function applyWalletToInvoice(clientId: string, invoiceId: string, amount: number) {
    const invoice = invoices.find((i) => i.id === invoiceId)
    addWalletTransaction({ clientId, type: 'debit', reason: `Applied to ${invoice?.number ?? 'invoice'}`, amount })
    recordPayment(invoiceId, amount)
  }

  function logReminderSent(input: {
    clientId: string
    subject: string
    channels: Channel[]
    audience: ReminderAudience
    filingPeriodId?: string
    documentId?: string
  }) {
    // One entry per channel — the log answers "which channel reached them", and
    // a single row spanning three channels cannot.
    const entries: ReminderLogEntry[] = input.channels.map((channel) => ({
      id: genId('rl'),
      clientId: input.clientId,
      subject: input.subject,
      channel,
      // The real clock — a reminder that fired today must not be stamped with
      // the seed's authoring date.
      sentAt: `${todayIso()}T09:00:00`,
      status: 'sent',
      audience: input.audience,
      filingPeriodId: input.filingPeriodId,
      documentId: input.documentId,
    }))
    setReminderLog((prev) => [...prev, ...entries])
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
        activeStaff,
        setActiveStaff,
        signedIn,
        signIn,
        signInWithCredentials,
        signOut,
        staffMembers: DEFAULT_STAFF_MEMBERS,
        can,
        addAuditEntry,
        matters,
        addClient,
        updateClient,
        addDocument,
        addDocumentType,
        linkDocumentToMatter,
        unlinkDocumentFromMatter,
        addObligationType,
        updateObligationType,
        deleteObligationType,
        registrationsUsingObligation,
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
        openMatterForFiling,
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
        updateExpense,
        deleteExpense,
        addWalletTransaction,
        applyWalletToInvoice,
        updateReminderRule,
        logReminderSent,
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
