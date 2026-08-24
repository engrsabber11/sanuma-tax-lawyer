export type BusinessType = 'grocery' | 'trading' | 'f&b' | 'services' | 'other'

export interface Client {
  id: string
  name: string
  businessName?: string
  businessType: BusinessType
  trn?: string
  phone: string
  whatsapp?: string
  email: string
  referredById?: string
  subReferredById?: string
  status: 'active' | 'onboarding' | 'inactive'
  createdAt: string
  avatarColor: string
  /**
   * 'natural' = sole establishment / freelancer. The UAE has no personal income
   * tax — a "personal tax" client is a natural person registered for Corporate
   * Tax (calendar-year period, return due 30 Sep following) or for VAT.
   */
  personType?: 'legal' | 'natural'
}

export type DocumentCategory = 'personal' | 'business' | 'tax' | 'financial'

export interface DocumentTypeDef {
  id: string
  name: string
  category: DocumentCategory
  hasExpiry: boolean
  defaultReminderDays: number[]
  defaultChannels: Channel[]
}

export interface ClientDocument {
  id: string
  clientId: string
  typeId: string
  number?: string
  issueDate: string
  expiryDate: string
  fileName?: string
  status: 'valid' | 'expiring' | 'expired' | 'renewal-in-progress'
  matterId?: string
}

export type Channel = 'whatsapp' | 'email' | 'sms'

/** What a reminder rule watches: a document's expiry, or a filing's due date. */
export type ReminderSubjectKind = 'document' | 'obligation'

/**
 * Who a reminder is for.
 *
 * 'client' and 'internal' are different jobs: a client reminder says "send us
 * your records"; an internal one says "this return is due in a week and nobody
 * has opened a matter for it". The lawyer needs the second even when the client
 * has already been chased.
 */
export type ReminderAudience = 'client' | 'internal' | 'both'

export interface ReminderRule {
  id: string
  subjectKind: ReminderSubjectKind
  /** DocumentTypeDef.id or ObligationType.id, per subjectKind. */
  subjectTypeId: string
  /** Denormalised for display, as typeName was before. */
  subjectName: string
  /** Days before the target date. 0 = D-Day. */
  daysBefore: number[]
  channels: Channel[]
  audience: ReminderAudience
  enabled: boolean
}

export interface ReminderLogEntry {
  id: string
  clientId: string
  subject: string
  channel: Channel
  sentAt: string
  status: 'sent' | 'delivered' | 'failed'
  audience?: ReminderAudience
  /**
   * What the reminder was about. This is what answers "did we warn this client
   * before the deadline" per filing — the question that matters when a client
   * disputes a penalty.
   */
  filingPeriodId?: string
  documentId?: string
}

export type MatterStatus = 'intake' | 'documents-collected' | 'in-progress' | 'submitted' | 'completed'

export interface MatterChecklistItem {
  id: string
  label: string
  done: boolean
}

export interface Matter {
  id: string
  clientId: string
  title: string
  serviceId: string
  status: MatterStatus
  openedAt: string
  dueDate?: string
  completedAt?: string
  invoiceId?: string
  notes?: string
  checklist: MatterChecklistItem[]
  /** False when the firm opened this matter without the client asking — triggers the penalty fee. */
  clientInitiated: boolean
  /** The penalty charge raised for this matter, if any. */
  penaltyChargeId?: string
}

export interface Service {
  id: string
  name: string
  description: string
  price: number
  vatApplicable: boolean
  /** Set when this service is a child of another service. Only one level deep. */
  parentId?: string
}

export interface Quote {
  id: string
  clientId: string
  serviceIds: string[]
  amount: number
  status: 'draft' | 'sent' | 'accepted' | 'declined'
  createdAt: string
}

export interface InvoiceLine {
  /** Absent on lines that are not a catalog service, e.g. a penalty fee. */
  serviceId?: string
  description: string
  qty: number
  unitPrice: number
  kind?: 'service' | 'penalty'
  /** Absent means VAT-rated, which is how every catalog service line behaves. */
  vatApplicable?: boolean
}

/** Firm-wide rule for the minimum fee charged when a matter is opened without client involvement. */
export interface PenaltyFeeRule {
  enabled: boolean
  amount: number
  vatApplicable: boolean
  label: string
}

export type PendingChargeStatus = 'pending' | 'billed' | 'waived'

/**
 * A charge raised outside the invoicing flow that waits to be picked up by the
 * client's next invoice. Amount and VAT are snapshotted so later rule edits
 * never rewrite what was already raised.
 */
export interface PendingCharge {
  id: string
  clientId: string
  matterId?: string
  kind: 'penalty'
  description: string
  amount: number
  vatApplicable: boolean
  createdAt: string
  status: PendingChargeStatus
  invoiceId?: string
  waivedReason?: string
  waivedAt?: string
}

export interface Invoice {
  id: string
  number: string
  clientId: string
  matterId?: string
  lines: InvoiceLine[]
  issueDate: string
  dueDate: string
  status: 'unpaid' | 'partial' | 'paid' | 'overdue'
  paidAmount: number
}

export interface CreditNote {
  id: string
  number: string
  kind: 'firm-issued' | 'client-advisory'
  clientId: string
  invoiceId?: string
  reason: string
  amount: number
  vatAmount: number
  issueDate: string
}

export interface Expense {
  id: string
  category: string
  description: string
  amount: number
  date: string
  isDisbursement: boolean
  clientId?: string
  billed: boolean
}

export interface LedgerEntry {
  id: string
  date: string
  account: string
  description: string
  debit: number
  credit: number
}

export interface WalletTransaction {
  id: string
  clientId: string
  type: 'credit' | 'debit'
  reason: string
  amount: number
  date: string
}

export interface ReferralBonusRule {
  level: number
  label: string
  type: 'percentage' | 'flat'
  value: number
  enabled: boolean
}

// ---------------------------------------------------------------------------
// Tax year & filing obligations
// See plans/tax-year-engine/ — Phase 1.
// ---------------------------------------------------------------------------

export type Periodicity = 'monthly' | 'quarterly' | 'annual' | 'expiry'

/**
 * Quarterly stagger groups the FTA assigns, named by their period START months.
 * UAE quarterly VAT is staggered, not calendar Q1-Q4 — assuming Jan-Mar is
 * wrong for roughly two thirds of clients.
 */
export type QuarterStagger =
  | 'jan-apr-jul-oct' // Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec
  | 'feb-may-aug-nov' // Feb-Apr, May-Jul, Aug-Oct, Nov-Jan
  | 'mar-jun-sep-dec' // Mar-May, Jun-Aug, Sep-Nov, Dec-Feb

export type DueRule =
  | { kind: 'last-day-next-month' } // VAT, per the sample certificate
  | { kind: 'day-of-next-month'; day: number } // 28 = statutory VAT, 15 = excise
  | { kind: 'months-after-period-end'; months: number } // 9 = Corporate Tax
  | { kind: 'on-expiry' } // licence-style renewals

/** Editable catalog entry — this is what makes custom obligations data, not code. */
export interface ObligationType {
  id: string
  name: string
  shortName: string
  periodicity: Periodicity
  dueRule: DueRule
  staggerOptions?: QuarterStagger[]
  fiscalYearEndMonth?: number
  serviceId?: string
  /** DocumentTypeDef this obligation's certificate is filed under, if any. */
  certificateDocumentTypeId?: string
  defaultReminderDays: number[]
  defaultChannels: Channel[]
  builtIn: boolean
}

export interface Registration {
  id: string
  clientId: string
  obligationTypeId: string
  registrationNumber?: string
  effectiveDate: string
  firstPeriodStart: string
  firstPeriodEnd: string
  periodicity: Periodicity
  staggerGroup?: QuarterStagger
  fiscalYearEndMonth?: number
  dueRule?: DueRule
  certificateDocumentId?: string
  status: 'active' | 'deregistered'
  deregisteredAt?: string
  createdAt: string
}

/**
 * Only the manual state is stored. Urgency is DERIVED from dueDate at render
 * time via urgencyFromDate() — a stored "expiring" string goes stale the moment
 * the clock moves, and a filing must never falsely claim to be on time.
 */
export type FilingState = 'pending' | 'filed' | 'not-required'

export interface FilingPeriod {
  id: string
  registrationId: string
  clientId: string
  obligationTypeId: string
  label: string
  periodStart: string
  periodEnd: string
  dueDate: string
  taxYear: number
  state: FilingState
  filedAt?: string
  matterId?: string
  invoiceId?: string
}

export interface ClientYear {
  clientId: string
  taxYear: number
  status: 'open' | 'closed'
  closedAt?: string
  reopenedAt?: string
  reopenReason?: string
}

/**
 * Append-only record of tax-year transitions. Follows the shape of
 * ReminderLogEntry rather than inventing a second log convention.
 *
 * The entry is written whether or not the reopen prompt is enabled: losing the
 * typed reason is a preference, losing the record is a defect.
 */
export interface AuditEntry {
  id: string
  at: string
  actor: string
  action: 'year-closed' | 'year-reopened' | 'registration-edited' | 'filing-reverted'
  clientId: string
  subject: string
  note?: string
}
