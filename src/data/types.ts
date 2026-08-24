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

export interface ReminderRule {
  id: string
  typeId: string
  typeName: string
  daysBefore: number[]
  channels: Channel[]
  enabled: boolean
}

export interface ReminderLogEntry {
  id: string
  clientId: string
  subject: string
  channel: Channel
  sentAt: string
  status: 'sent' | 'delivered' | 'failed'
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
}

export interface Service {
  id: string
  name: string
  description: string
  price: number
  vatApplicable: boolean
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
  serviceId: string
  description: string
  qty: number
  unitPrice: number
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
