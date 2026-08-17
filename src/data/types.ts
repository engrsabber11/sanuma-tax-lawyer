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

export type Recurrence = 'monthly' | 'quarterly' | 'annual'

export interface ComplianceDeadline {
  id: string
  clientId: string
  name: string
  recurrence: Recurrence
  nextDueDate: string
  status: 'upcoming' | 'due-soon' | 'overdue' | 'filed'
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
