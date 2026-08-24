import type {
  Client,
  ClientDocument,
  CreditNote,
  DocumentTypeDef,
  Expense,
  Invoice,
  LedgerEntry,
  Matter,
  PenaltyFeeRule,
  PendingCharge,
  Quote,
  FilingPeriod,
  ReferralBonusRule,
  Registration,
  ReminderLogEntry,
  ReminderRule,
  Service,
  WalletTransaction,
} from './types'
import { defaultChecklistForService } from './matterChecklists'
import { obligationTypes } from './obligationTypes'

export const TODAY = '2026-07-21'

function checklistAt(serviceId: string, doneCount: number) {
  return defaultChecklistForService(serviceId).map((item, i) => ({ ...item, done: i < doneCount }))
}

export const documentTypes: DocumentTypeDef[] = [
  { id: 'dt-eid', name: 'Emirates ID', category: 'personal', hasExpiry: true, defaultReminderDays: [60, 30, 7], defaultChannels: ['whatsapp', 'email'] },
  { id: 'dt-passport', name: 'Passport', category: 'personal', hasExpiry: true, defaultReminderDays: [90, 30], defaultChannels: ['whatsapp', 'email'] },
  { id: 'dt-visa', name: 'Residence Visa', category: 'personal', hasExpiry: true, defaultReminderDays: [90, 30, 7], defaultChannels: ['whatsapp', 'email', 'sms'] },
  { id: 'dt-labor', name: 'Labor / Establishment Card', category: 'personal', hasExpiry: true, defaultReminderDays: [30, 7], defaultChannels: ['whatsapp'] },
  { id: 'dt-trade-license', name: 'Trade License', category: 'business', hasExpiry: true, defaultReminderDays: [60, 30, 7], defaultChannels: ['whatsapp', 'email'] },
  { id: 'dt-chamber', name: 'Chamber of Commerce Certificate', category: 'business', hasExpiry: true, defaultReminderDays: [30], defaultChannels: ['email'] },
  { id: 'dt-municipality-permit', name: 'Municipality Trade/Food Permit', category: 'business', hasExpiry: true, defaultReminderDays: [45, 14], defaultChannels: ['whatsapp', 'email'] },
  { id: 'dt-civil-defense', name: 'Civil Defense / Fire Safety NOC', category: 'business', hasExpiry: true, defaultReminderDays: [45, 14], defaultChannels: ['whatsapp', 'email'] },
  { id: 'dt-ejari', name: 'Ejari (Tenancy Contract)', category: 'business', hasExpiry: true, defaultReminderDays: [30, 7], defaultChannels: ['whatsapp'] },
  { id: 'dt-signage', name: 'Signage / Advertisement Permit', category: 'business', hasExpiry: true, defaultReminderDays: [30], defaultChannels: ['email'] },
  { id: 'dt-customs', name: 'Import/Export Customs Code', category: 'business', hasExpiry: true, defaultReminderDays: [30], defaultChannels: ['email'] },
  { id: 'dt-vat-cert', name: 'VAT Registration Certificate (TRN)', category: 'tax', hasExpiry: false, defaultReminderDays: [], defaultChannels: [] },
  { id: 'dt-corp-tax-cert', name: 'Corporate Tax Registration Certificate', category: 'tax', hasExpiry: false, defaultReminderDays: [], defaultChannels: [] },
  { id: 'dt-excise', name: 'Excise Tax Registration', category: 'tax', hasExpiry: false, defaultReminderDays: [], defaultChannels: [] },
  { id: 'dt-ubo', name: 'UBO Declaration', category: 'tax', hasExpiry: true, defaultReminderDays: [30], defaultChannels: ['email'] },
  { id: 'dt-aml', name: 'AML/CTF (goAML) Registration', category: 'tax', hasExpiry: true, defaultReminderDays: [30], defaultChannels: ['email'] },
  { id: 'dt-bank-kyc', name: 'Bank Account KYC Documents', category: 'financial', hasExpiry: true, defaultReminderDays: [30], defaultChannels: ['email'] },
  { id: 'dt-insurance', name: 'Insurance Policy', category: 'financial', hasExpiry: true, defaultReminderDays: [30, 7], defaultChannels: ['whatsapp', 'email'] },
]

export const clients: Client[] = [
  { id: 'c1', personType: 'legal', name: 'Ahmed Al Falasi', businessName: 'Al Falasi Grocery LLC', businessType: 'grocery', trn: '10034**********', phone: '+971 50 111 2233', whatsapp: '+971 50 111 2233', email: 'ahmed.falasi@example.ae', status: 'active', createdAt: '2024-02-10', avatarColor: 'bg-accent-500' },
  { id: 'c2', personType: 'legal', name: 'Fatima Hassan', businessName: 'Hassan Trading Co.', businessType: 'trading', trn: '10087**********', phone: '+971 52 222 3344', whatsapp: '+971 52 222 3344', email: 'fatima.hassan@example.ae', referredById: 'c1', status: 'active', createdAt: '2024-05-18', avatarColor: 'bg-warning-500' },
  { id: 'c3', personType: 'legal', name: 'Mohammed Rashid', businessName: 'Rashid Mart', businessType: 'grocery', trn: '10091**********', phone: '+971 55 333 4455', whatsapp: '+971 55 333 4455', email: 'm.rashid@example.ae', referredById: 'c2', status: 'active', createdAt: '2024-09-02', avatarColor: 'bg-success-500' },
  { id: 'c4', personType: 'legal', name: 'Sara Abdullah', businessName: 'Deira Fresh Grocery', businessType: 'grocery', trn: '10102**********', phone: '+971 56 444 5566', whatsapp: '+971 56 444 5566', email: 'sara.abdullah@example.ae', referredById: 'c1', status: 'active', createdAt: '2025-01-14', avatarColor: 'bg-danger-500' },
  { id: 'c5', personType: 'legal', name: 'Yousef Khan', businessName: 'Khan F&B Ventures', businessType: 'f&b', trn: '10119**********', phone: '+971 50 555 6677', whatsapp: '+971 50 555 6677', email: 'yousef.khan@example.ae', status: 'active', createdAt: '2024-11-30', avatarColor: 'bg-accent-700' },
  { id: 'c6', personType: 'legal', name: 'Layla Ahmed', businessName: 'Al Barsha Retail', businessType: 'services', trn: '10125**********', phone: '+971 54 666 7788', whatsapp: '+971 54 666 7788', email: 'layla.ahmed@example.ae', referredById: 'c5', status: 'active', createdAt: '2025-03-05', avatarColor: 'bg-warning-600' },
  { id: 'c7', personType: 'legal', name: 'Omar Saeed', businessName: 'Saeed Consulting Services', businessType: 'services', trn: '10133**********', phone: '+971 58 777 8899', whatsapp: '+971 58 777 8899', email: 'omar.saeed@example.ae', referredById: 'c6', status: 'active', createdAt: '2025-06-21', avatarColor: 'bg-success-600' },
  { id: 'c8', personType: 'legal', name: 'Noora Salem', businessName: 'Salem Trading LLC', businessType: 'trading', trn: '10140**********', phone: '+971 50 888 9900', whatsapp: '+971 50 888 9900', email: 'noora.salem@example.ae', status: 'active', createdAt: '2025-02-11', avatarColor: 'bg-accent-600' },
  { id: 'c9', personType: 'legal', name: 'Khalid Nasser', businessName: 'Nasser Grocery & Supermarket', businessType: 'grocery', trn: '10148**********', phone: '+971 52 999 0011', whatsapp: '+971 52 999 0011', email: 'khalid.nasser@example.ae', referredById: 'c8', status: 'active', createdAt: '2025-07-09', avatarColor: 'bg-danger-600' },
  { id: 'c10', personType: 'natural', name: 'Priya Sharma', businessType: 'other', phone: '+971 55 000 1122', whatsapp: '+971 55 000 1122', email: 'priya.sharma@example.com', referredById: 'c1', status: 'onboarding', createdAt: '2026-07-18', avatarColor: 'bg-ink-500' },
]

export const clientDocuments: ClientDocument[] = [
  { id: 'd1', clientId: 'c1', typeId: 'dt-trade-license', number: 'DED-778213', issueDate: '2025-08-01', expiryDate: '2026-08-01', status: 'expiring', matterId: 'm1' },
  { id: 'd2', clientId: 'c1', typeId: 'dt-eid', number: '784-1985-1234567-1', issueDate: '2023-08-15', expiryDate: '2027-08-15', status: 'valid' },
  { id: 'd3', clientId: 'c1', typeId: 'dt-visa', number: 'V-556213', issueDate: '2023-08-15', expiryDate: '2026-08-10', status: 'expiring' },
  { id: 'd4', clientId: 'c1', typeId: 'dt-municipality-permit', number: 'MUN-33210', issueDate: '2025-06-01', expiryDate: '2026-08-05', status: 'expiring' },
  { id: 'd5', clientId: 'c1', typeId: 'dt-civil-defense', number: 'CD-90211', issueDate: '2025-01-10', expiryDate: '2027-01-10', status: 'valid' },
  { id: 'd6', clientId: 'c1', typeId: 'dt-ejari', number: 'EJ-4471102', issueDate: '2025-09-01', expiryDate: '2026-09-01', status: 'valid' },
  { id: 'd7', clientId: 'c1', typeId: 'dt-vat-cert', number: 'TRN 10034XXXXXXXXXX', issueDate: '2019-01-15', expiryDate: '2099-01-01', status: 'valid' },

  { id: 'd8', clientId: 'c2', typeId: 'dt-trade-license', number: 'DED-661832', issueDate: '2025-05-20', expiryDate: '2026-05-20', status: 'expired' },
  { id: 'd9', clientId: 'c2', typeId: 'dt-eid', number: '784-1990-2234567-2', issueDate: '2024-06-01', expiryDate: '2028-06-01', status: 'valid' },
  { id: 'd10', clientId: 'c2', typeId: 'dt-passport', number: 'P2245781', issueDate: '2021-03-01', expiryDate: '2031-03-01', status: 'valid' },
  { id: 'd11', clientId: 'c2', typeId: 'dt-vat-cert', number: 'TRN 10087XXXXXXXXXX', issueDate: '2020-04-01', expiryDate: '2099-01-01', status: 'valid' },

  { id: 'd12', clientId: 'c3', typeId: 'dt-trade-license', number: 'DED-990441', issueDate: '2025-09-10', expiryDate: '2026-09-10', status: 'valid' },
  { id: 'd13', clientId: 'c3', typeId: 'dt-civil-defense', number: 'CD-11209', issueDate: '2024-08-01', expiryDate: '2026-08-01', status: 'expiring', matterId: 'm3' },
  { id: 'd14', clientId: 'c3', typeId: 'dt-eid', number: '784-1988-3234567-3', issueDate: '2022-09-01', expiryDate: '2026-09-01', status: 'valid' },

  { id: 'd15', clientId: 'c4', typeId: 'dt-trade-license', number: 'DED-552210', issueDate: '2024-07-01', expiryDate: '2026-07-01', status: 'expired', matterId: 'm4' },
  { id: 'd16', clientId: 'c4', typeId: 'dt-municipality-permit', number: 'MUN-77812', issueDate: '2024-07-05', expiryDate: '2026-07-05', status: 'expired', matterId: 'm4' },
  { id: 'd17', clientId: 'c4', typeId: 'dt-visa', number: 'V-778120', issueDate: '2023-06-01', expiryDate: '2026-07-15', status: 'expired' },
  { id: 'd18', clientId: 'c4', typeId: 'dt-ejari', number: 'EJ-220198', issueDate: '2025-08-01', expiryDate: '2026-08-01', status: 'expiring' },

  { id: 'd19', clientId: 'c5', typeId: 'dt-trade-license', number: 'DED-114420', issueDate: '2025-12-01', expiryDate: '2026-12-01', status: 'valid' },
  { id: 'd20', clientId: 'c5', typeId: 'dt-civil-defense', number: 'CD-55021', issueDate: '2025-11-01', expiryDate: '2026-11-01', status: 'valid' },
  { id: 'd21', clientId: 'c5', typeId: 'dt-eid', number: '784-1992-4234567-4', issueDate: '2024-01-01', expiryDate: '2028-01-01', status: 'valid' },

  { id: 'd22', clientId: 'c6', typeId: 'dt-trade-license', number: 'DED-330214', issueDate: '2025-08-12', expiryDate: '2026-08-12', status: 'expiring' },
  { id: 'd23', clientId: 'c6', typeId: 'dt-visa', number: 'V-991022', issueDate: '2023-10-01', expiryDate: '2026-10-01', status: 'valid' },

  { id: 'd24', clientId: 'c7', typeId: 'dt-trade-license', number: 'DED-771002', issueDate: '2025-06-21', expiryDate: '2026-06-21', status: 'expired', matterId: 'm10' },
  { id: 'd25', clientId: 'c7', typeId: 'dt-eid', number: '784-1995-5234567-5', issueDate: '2024-06-21', expiryDate: '2028-06-21', status: 'valid' },

  { id: 'd26', clientId: 'c8', typeId: 'dt-trade-license', number: 'DED-441209', issueDate: '2025-02-11', expiryDate: '2027-02-11', status: 'valid' },
  { id: 'd27', clientId: 'c8', typeId: 'dt-vat-cert', number: 'TRN 10140XXXXXXXXXX', issueDate: '2021-01-01', expiryDate: '2099-01-01', status: 'valid' },

  { id: 'd28', clientId: 'c9', typeId: 'dt-trade-license', number: 'DED-889021', issueDate: '2025-07-09', expiryDate: '2026-08-09', status: 'expiring' },
  { id: 'd29', clientId: 'c9', typeId: 'dt-municipality-permit', number: 'MUN-99021', issueDate: '2025-07-09', expiryDate: '2026-08-01', status: 'expiring' },
  { id: 'd30', clientId: 'c9', typeId: 'dt-civil-defense', number: 'CD-77801', issueDate: '2025-07-09', expiryDate: '2027-07-09', status: 'valid' },
]


/**
 * Reminder rules for document expiry AND filing deadlines.
 *
 * Filing rules are listed first because the practice's primary work is returns,
 * not licences. Document defaults are left as they are — a passport genuinely
 * wants 90 days' notice and a VAT return does not.
 */
export const reminderRules: ReminderRule[] = [
  ...obligationTypes.map((t, i) => ({
    id: `rr-ob-${i + 1}`,
    subjectKind: 'obligation' as const,
    subjectTypeId: t.id,
    subjectName: t.name,
    daysBefore: t.defaultReminderDays,
    channels: t.defaultChannels,
    // Filing deadlines need chasing on both sides: the client owes records, the
    // firm owes the submission.
    audience: 'both' as const,
    enabled: true,
  })),
  ...documentTypes
    .filter((t) => t.hasExpiry)
    .map((t, i) => ({
      id: `rr-doc-${i + 1}`,
      subjectKind: 'document' as const,
      subjectTypeId: t.id,
      subjectName: t.name,
      daysBefore: t.defaultReminderDays,
      channels: t.defaultChannels,
      audience: 'client' as const,
      enabled: true,
    })),
]

export const reminderLog: ReminderLogEntry[] = [
  { id: 'rl1', clientId: 'c1', subject: 'Trade License expires in 7 days', channel: 'whatsapp', sentAt: '2026-07-21T09:00:00', status: 'delivered' },
  { id: 'rl2', clientId: 'c1', subject: 'Residence Visa expires in 20 days', channel: 'email', sentAt: '2026-07-21T09:00:00', status: 'sent' },
  { id: 'rl3', clientId: 'c2', subject: 'Trade License expired', channel: 'whatsapp', sentAt: '2026-07-20T09:00:00', status: 'delivered' },
  { id: 'rl4', clientId: 'c2', subject: 'VAT Return overdue', channel: 'sms', sentAt: '2026-07-16T09:00:00', status: 'failed' },
  { id: 'rl5', clientId: 'c4', subject: 'Municipality Permit expired', channel: 'email', sentAt: '2026-07-06T09:00:00', status: 'delivered' },
  { id: 'rl6', clientId: 'c4', subject: 'Residence Visa expired', channel: 'whatsapp', sentAt: '2026-07-16T09:00:00', status: 'delivered' },
  { id: 'rl7', clientId: 'c9', subject: 'Trade License expires in 19 days', channel: 'whatsapp', sentAt: '2026-07-21T09:00:00', status: 'sent' },
  { id: 'rl8', clientId: 'c3', subject: 'Civil Defense NOC expires in 11 days', channel: 'email', sentAt: '2026-07-21T09:00:00', status: 'delivered' },
]

export const services: Service[] = [
  { id: 'svc-vat-reg', name: 'VAT Registration', description: 'End-to-end FTA VAT registration and TRN issuance.', price: 1500, vatApplicable: true },
  { id: 'svc-vat-return', name: 'VAT Return Filing', description: 'Periodic VAT return preparation and submission.', price: 750, vatApplicable: true },
  { id: 'svc-trade-license-renewal', name: 'Trade License Renewal', description: 'DED / Free Zone trade license renewal handling.', price: 950, vatApplicable: true },
  { id: 'svc-corp-tax-reg', name: 'Corporate Tax Registration', description: 'Corporate Tax registration with the FTA.', price: 1800, vatApplicable: true },
  { id: 'svc-corp-tax-filing', name: 'Corporate Tax Return Filing', description: 'Annual Corporate Tax return preparation and filing.', price: 2500, vatApplicable: true },
  { id: 'svc-credit-note', name: 'Tax Credit Note Preparation', description: 'FTA-compliant tax credit note drafting and review.', price: 400, vatApplicable: true },
  { id: 'svc-esr-report', name: 'ESR Notification & Report', description: 'Economic Substance Regulations filing support.', price: 1200, vatApplicable: true },
  { id: 'svc-ubo-update', name: 'UBO Declaration Update', description: 'Ultimate Beneficial Owner declaration update.', price: 600, vatApplicable: true },
  { id: 'svc-vat-reg-doc-prep', parentId: 'svc-vat-reg', name: 'Document Preparation', description: 'Collecting and formatting the FTA registration pack.', price: 1500, vatApplicable: true },
  { id: 'svc-vat-reg-portal', parentId: 'svc-vat-reg', name: 'FTA Portal Submission', description: 'Submitting the registration application on EmaraTax.', price: 1500, vatApplicable: true },
  { id: 'svc-corp-tax-reg-advisory', parentId: 'svc-corp-tax-reg', name: 'Eligibility Advisory', description: 'Assessing Corporate Tax applicability and free zone status.', price: 1800, vatApplicable: true },
]

export const matters: Matter[] = [
  { id: 'm1', clientId: 'c1', title: 'Trade License Renewal 2026', serviceId: 'svc-trade-license-renewal', status: 'in-progress', openedAt: '2026-07-01', dueDate: '2026-08-01', invoiceId: 'inv-1005', clientInitiated: true, checklist: checklistAt('svc-trade-license-renewal', 2) },
  { id: 'm2', clientId: 'c2', title: 'VAT Return — June 2026', serviceId: 'svc-vat-return', status: 'submitted', openedAt: '2026-07-05', dueDate: '2026-07-15', invoiceId: 'inv-1003', clientInitiated: true, checklist: checklistAt('svc-vat-return', 5) },
  { id: 'm3', clientId: 'c3', title: 'Civil Defense NOC Renewal', serviceId: 'svc-trade-license-renewal', status: 'documents-collected', openedAt: '2026-07-10', dueDate: '2026-08-01', clientInitiated: true, checklist: checklistAt('svc-trade-license-renewal', 1) },
  { id: 'm4', clientId: 'c4', title: 'Trade License + Municipality Permit Renewal', serviceId: 'svc-trade-license-renewal', status: 'intake', openedAt: '2026-07-18', dueDate: '2026-08-05', clientInitiated: true, checklist: checklistAt('svc-trade-license-renewal', 0) },
  { id: 'm5', clientId: 'c5', title: 'VAT Return — Q2 2026', serviceId: 'svc-vat-return', status: 'in-progress', openedAt: '2026-07-12', dueDate: '2026-07-28', clientInitiated: true, checklist: checklistAt('svc-vat-return', 2) },
  { id: 'm6', clientId: 'c6', title: 'Corporate Tax Registration', serviceId: 'svc-corp-tax-reg', status: 'completed', openedAt: '2026-05-01', dueDate: '2026-06-01', completedAt: '2026-06-05', invoiceId: 'inv-1001', clientInitiated: true, checklist: checklistAt('svc-corp-tax-reg', 4) },
  { id: 'm7', clientId: 'c8', title: 'ESR Notification 2026', serviceId: 'svc-esr-report', status: 'in-progress', openedAt: '2026-07-08', dueDate: '2026-08-30', clientInitiated: true, checklist: checklistAt('svc-esr-report', 2) },
  { id: 'm8', clientId: 'c9', title: 'VAT Registration', serviceId: 'svc-vat-reg', status: 'completed', openedAt: '2026-07-09', dueDate: '2026-07-20', completedAt: '2026-07-20', invoiceId: 'inv-1002', clientInitiated: true, checklist: checklistAt('svc-vat-reg', 5) },
  { id: 'm9', clientId: 'c1', title: 'Credit Note for Discounted Renewal Fee', serviceId: 'svc-credit-note', status: 'completed', openedAt: '2026-06-15', dueDate: '2026-06-20', completedAt: '2026-06-22', invoiceId: 'inv-1004', clientInitiated: true, checklist: checklistAt('svc-credit-note', 4) },
  { id: 'm10', clientId: 'c7', title: 'Trade License Renewal 2026', serviceId: 'svc-trade-license-renewal', status: 'intake', openedAt: '2026-07-19', dueDate: '2026-08-10', clientInitiated: true, checklist: checklistAt('svc-trade-license-renewal', 0) },
  { id: 'm11', clientId: 'c3', title: 'UBO Declaration Update — filed on client behalf', serviceId: 'svc-ubo-update', status: 'in-progress', openedAt: '2026-07-20', dueDate: '2026-08-15', clientInitiated: false, penaltyChargeId: 'pc-1', checklist: checklistAt('svc-ubo-update', 1) },
]

export const penaltyFeeRule: PenaltyFeeRule = {
  enabled: true,
  amount: 250,
  vatApplicable: true,
  label: 'Minimum engagement fee — firm-initiated matter',
}

export const pendingCharges: PendingCharge[] = [
  {
    id: 'pc-1',
    clientId: 'c3',
    matterId: 'm11',
    kind: 'penalty',
    description: 'Minimum engagement fee — firm-initiated matter',
    amount: 250,
    vatApplicable: true,
    createdAt: '2026-07-20',
    status: 'pending',
  },
]

export const quotes: Quote[] = [
  { id: 'q1', clientId: 'c4', serviceIds: ['svc-trade-license-renewal'], amount: 997.5, status: 'sent', createdAt: '2026-07-18' },
  { id: 'q2', clientId: 'c7', serviceIds: ['svc-trade-license-renewal'], amount: 997.5, status: 'accepted', createdAt: '2026-07-19' },
  { id: 'q3', clientId: 'c10', serviceIds: ['svc-vat-reg'], amount: 1575, status: 'draft', createdAt: '2026-07-19' },
  { id: 'q4', clientId: 'c3', serviceIds: ['svc-trade-license-renewal'], amount: 997.5, status: 'accepted', createdAt: '2026-07-10' },
]

export const invoices: Invoice[] = [
  { id: 'inv-1001', number: 'INV-2026-1001', clientId: 'c6', matterId: 'm6', lines: [{ serviceId: 'svc-corp-tax-reg', description: 'Corporate Tax Registration', qty: 1, unitPrice: 1800 }], issueDate: '2026-06-01', dueDate: '2026-06-15', status: 'paid', paidAmount: 1890 },
  { id: 'inv-1002', number: 'INV-2026-1002', clientId: 'c9', matterId: 'm8', lines: [{ serviceId: 'svc-vat-reg', description: 'VAT Registration', qty: 1, unitPrice: 1500 }], issueDate: '2026-07-09', dueDate: '2026-07-23', status: 'paid', paidAmount: 1575 },
  { id: 'inv-1003', number: 'INV-2026-1003', clientId: 'c2', matterId: 'm2', lines: [{ serviceId: 'svc-vat-return', description: 'VAT Return Filing — June 2026', qty: 1, unitPrice: 750 }], issueDate: '2026-07-05', dueDate: '2026-07-19', status: 'overdue', paidAmount: 0 },
  { id: 'inv-1004', number: 'INV-2026-1004', clientId: 'c1', matterId: 'm9', lines: [{ serviceId: 'svc-trade-license-renewal', description: 'Trade License Renewal 2026', qty: 1, unitPrice: 950 }], issueDate: '2026-06-15', dueDate: '2026-06-29', status: 'paid', paidAmount: 907.5 },
  { id: 'inv-1005', number: 'INV-2026-1005', clientId: 'c1', matterId: 'm1', lines: [{ serviceId: 'svc-trade-license-renewal', description: 'Trade License Renewal 2026', qty: 1, unitPrice: 950 }], issueDate: '2026-07-01', dueDate: '2026-07-15', status: 'partial', paidAmount: 500 },
  { id: 'inv-1006', number: 'INV-2026-1006', clientId: 'c5', lines: [{ serviceId: 'svc-vat-return', description: 'VAT Return Filing — Q2 2026', qty: 1, unitPrice: 750 }], issueDate: '2026-07-12', dueDate: '2026-07-26', status: 'unpaid', paidAmount: 0 },
  { id: 'inv-1007', number: 'INV-2026-1007', clientId: 'c8', lines: [{ serviceId: 'svc-esr-report', description: 'ESR Notification & Report', qty: 1, unitPrice: 1200 }], issueDate: '2026-07-08', dueDate: '2026-07-22', status: 'unpaid', paidAmount: 0 },
]

export const creditNotes: CreditNote[] = [
  { id: 'cn1', number: 'CN-2026-001', kind: 'firm-issued', clientId: 'c1', invoiceId: 'inv-1004', reason: 'Loyalty discount applied after invoice was issued', amount: 47.5, vatAmount: 2.5, issueDate: '2026-06-20' },
  { id: 'cn2', number: 'CN-2026-002', kind: 'client-advisory', clientId: 'c9', reason: 'Advisory: credit note for returned stock issued to Nasser Grocery’s own customer', amount: 1200, vatAmount: 60, issueDate: '2026-07-14' },
  { id: 'cn3', number: 'CN-2026-003', kind: 'client-advisory', clientId: 'c1', reason: 'Advisory: bulk order cancellation credit note for Al Falasi Grocery’s wholesale client', amount: 3400, vatAmount: 170, issueDate: '2026-05-28' },
]

export const expenses: Expense[] = [
  { id: 'e1', category: 'Office Rent', description: 'Monthly office rent — Business Bay', amount: 8000, date: '2026-07-01', isDisbursement: false, billed: false },
  { id: 'e2', category: 'Software', description: 'Practice management SaaS subscription', amount: 350, date: '2026-07-02', isDisbursement: false, billed: false },
  { id: 'e3', category: 'Government Fees', description: 'DED Trade License renewal fee paid on behalf of client', amount: 620, date: '2026-07-01', isDisbursement: true, clientId: 'c1', billed: true },
  { id: 'e4', category: 'Government Fees', description: 'FTA VAT registration fee paid on behalf of client', amount: 300, date: '2026-07-09', isDisbursement: true, clientId: 'c9', billed: true },
  { id: 'e5', category: 'Government Fees', description: 'Civil Defense NOC processing fee paid on behalf of client', amount: 450, date: '2026-07-10', isDisbursement: true, clientId: 'c3', billed: false },
  { id: 'e6', category: 'Marketing', description: 'Google Ads — lead generation', amount: 1200, date: '2026-07-05', isDisbursement: false, billed: false },
  { id: 'e7', category: 'Salaries', description: 'Admin assistant salary', amount: 5500, date: '2026-07-01', isDisbursement: false, billed: false },
  { id: 'e8', category: 'Utilities', description: 'DEWA + internet', amount: 480, date: '2026-07-03', isDisbursement: false, billed: false },
  { id: 'e9', category: 'Government Fees', description: 'Corporate Tax registration fee paid on behalf of client', amount: 250, date: '2026-06-01', isDisbursement: true, clientId: 'c6', billed: true },
  { id: 'e10', category: 'Professional Fees', description: 'External auditor consultation', amount: 900, date: '2026-06-20', isDisbursement: false, billed: false },
]

export const ledgerEntries: LedgerEntry[] = [
  { id: 'l1', date: '2026-07-01', account: 'Service Revenue', description: 'INV-2026-1001 payment received', debit: 0, credit: 1890 },
  { id: 'l2', date: '2026-07-09', account: 'Service Revenue', description: 'INV-2026-1002 payment received', debit: 0, credit: 1575 },
  { id: 'l3', date: '2026-06-15', account: 'Service Revenue', description: 'INV-2026-1004 payment received', debit: 0, credit: 907.5 },
  { id: 'l4', date: '2026-06-20', account: 'Credit Notes Issued', description: 'CN-2026-001 applied to INV-2026-1004', debit: 50, credit: 0 },
  { id: 'l5', date: '2026-07-01', account: 'Rent Expense', description: 'Office rent — July 2026', debit: 8000, credit: 0 },
  { id: 'l6', date: '2026-07-02', account: 'Software Expense', description: 'Practice management SaaS', debit: 350, credit: 0 },
  { id: 'l7', date: '2026-07-01', account: 'Disbursements Receivable', description: 'DED fee paid on behalf of Al Falasi Grocery', debit: 620, credit: 0 },
  { id: 'l8', date: '2026-07-05', account: 'Marketing Expense', description: 'Google Ads', debit: 1200, credit: 0 },
  { id: 'l9', date: '2026-07-01', account: 'Salary Expense', description: 'Admin assistant', debit: 5500, credit: 0 },
  { id: 'l10', date: '2026-07-01', account: 'VAT Payable', description: 'Output VAT collected — July invoices', debit: 0, credit: 165 },
]

export const walletTransactions: WalletTransaction[] = [
  { id: 'w1', clientId: 'c1', type: 'credit', reason: 'Referral bonus — Fatima Hassan onboarded (Level 1)', amount: 150, date: '2024-05-18' },
  { id: 'w2', clientId: 'c1', type: 'credit', reason: 'Referral bonus — Sara Abdullah onboarded (Level 1)', amount: 150, date: '2025-01-14' },
  { id: 'w3', clientId: 'c1', type: 'credit', reason: 'Referral bonus — Mohammed Rashid onboarded (Level 2)', amount: 60, date: '2024-09-02' },
  { id: 'w4', clientId: 'c1', type: 'debit', reason: 'Applied to INV-2026-1005', amount: 100, date: '2026-07-01' },
  { id: 'w5', clientId: 'c2', type: 'credit', reason: 'Referral bonus — Mohammed Rashid onboarded (Level 1)', amount: 150, date: '2024-09-02' },
  { id: 'w6', clientId: 'c5', type: 'credit', reason: 'Referral bonus — Layla Ahmed onboarded (Level 1)', amount: 150, date: '2025-03-05' },
  { id: 'w7', clientId: 'c5', type: 'credit', reason: 'Referral bonus — Omar Saeed onboarded (Level 2)', amount: 60, date: '2025-06-21' },
  { id: 'w8', clientId: 'c6', type: 'credit', reason: 'Referral bonus — Omar Saeed onboarded (Level 1)', amount: 150, date: '2025-06-21' },
  { id: 'w9', clientId: 'c8', type: 'credit', reason: 'Referral bonus — Khalid Nasser onboarded (Level 1)', amount: 150, date: '2025-07-09' },
  { id: 'w10', clientId: 'c8', type: 'debit', reason: 'Withdrawal — bank transfer', amount: 100, date: '2026-06-01' },
]

export const referralBonusRules: ReferralBonusRule[] = [
  { level: 1, label: 'Direct referral', type: 'flat', value: 150, enabled: true },
  { level: 2, label: 'Sub-referral (one level down)', type: 'flat', value: 60, enabled: true },
  { level: 3, label: 'Third level', type: 'percentage', value: 2, enabled: false },
]

/**
 * Seed registrations. The matrix is chosen for coverage: every generator code
 * path should be visible in the running app, not only in the golden tests.
 *
 * `firstPeriodStart` / `firstPeriodEnd` are left to the store, which calls
 * deriveFirstPeriod() from the effective date + cycle — the same path the
 * onboarding wizard takes, so the seed cannot drift from real entry.
 */
export const registrations: Array<Omit<Registration, 'firstPeriodStart' | 'firstPeriodEnd'>> = [
  // Quarterly VAT across all three FTA stagger groups, so the staggering is
  // visible in the UI rather than theoretical.
  { id: 'reg-1', clientId: 'c1', obligationTypeId: 'ob-vat-return', registrationNumber: '100341234500003', effectiveDate: '2019-01-15', periodicity: 'quarterly', staggerGroup: 'jan-apr-jul-oct', certificateDocumentId: 'd7', status: 'active', createdAt: '2019-01-15' },
  { id: 'reg-3', clientId: 'c3', obligationTypeId: 'ob-vat-return', registrationNumber: '100915678900003', effectiveDate: '2021-05-01', periodicity: 'quarterly', staggerGroup: 'feb-may-aug-nov', status: 'active', createdAt: '2021-05-01' },
  { id: 'reg-5', clientId: 'c5', obligationTypeId: 'ob-vat-return', registrationNumber: '101192345600003', effectiveDate: '2022-03-01', periodicity: 'quarterly', staggerGroup: 'mar-jun-sep-dec', status: 'active', createdAt: '2022-03-01' },

  // Monthly filer — the other VAT path.
  { id: 'reg-2', clientId: 'c2', obligationTypeId: 'ob-vat-return-monthly', registrationNumber: '100878765400003', effectiveDate: '2020-04-01', periodicity: 'monthly', certificateDocumentId: 'd11', status: 'active', createdAt: '2020-04-01' },

  // Registered mid-period and recently — produces a visible stub first period.
  { id: 'reg-9', clientId: 'c9', obligationTypeId: 'ob-vat-return', registrationNumber: '101483456700003', effectiveDate: '2026-07-20', periodicity: 'quarterly', staggerGroup: 'jan-apr-jul-oct', status: 'active', createdAt: '2026-07-20' },

  // Corporate Tax — annual, 9-month due rule.
  { id: 'reg-4', clientId: 'c4', obligationTypeId: 'ob-ct-return', registrationNumber: '101026543200001', effectiveDate: '2025-01-01', periodicity: 'annual', fiscalYearEndMonth: 12, status: 'active', createdAt: '2025-01-01' },
  // Effective 1 Feb, so the first CT period is an 11-month stub — the exact
  // shape of the sample Corporate Tax certificate.
  { id: 'reg-6', clientId: 'c6', obligationTypeId: 'ob-ct-return', registrationNumber: '101259876500001', effectiveDate: '2025-02-01', periodicity: 'annual', fiscalYearEndMonth: 12, status: 'active', createdAt: '2025-02-01' },

  // Multi-registration client: VAT and Corporate Tax on one file.
  { id: 'reg-8a', clientId: 'c8', obligationTypeId: 'ob-vat-return', registrationNumber: '101401112200003', effectiveDate: '2021-01-01', periodicity: 'quarterly', staggerGroup: 'jan-apr-jul-oct', certificateDocumentId: 'd27', status: 'active', createdAt: '2021-01-01' },
  { id: 'reg-8b', clientId: 'c8', obligationTypeId: 'ob-ct-return', registrationNumber: '101401112200001', effectiveDate: '2025-01-01', periodicity: 'annual', fiscalYearEndMonth: 12, status: 'active', createdAt: '2025-01-01' },

  // Natural person — the "personal tax" case. No UAE personal income tax; a
  // sole establishment over the AED 1M threshold registers for Corporate Tax
  // on a calendar-year period.
  { id: 'reg-10', clientId: 'c10', obligationTypeId: 'ob-ct-return', registrationNumber: '101507778800001', effectiveDate: '2026-01-01', periodicity: 'annual', fiscalYearEndMonth: 12, status: 'active', createdAt: '2026-07-18' },

  // c7 Saeed Consulting has NO registration on purpose — a licence-only client.
  // Every screen must render correctly for them.
]

/**
 * Registrations deliberately left with a lapsed filing, so the overdue state is
 * exercised by the seed. reg-2 is Hassan Trading, which the seed already
 * describes as behind: invoice inv-1003 is overdue and reminderLog rl4 is a
 * failed "VAT Return overdue" message.
 */
const LAPSED_REGISTRATIONS = ['reg-2']
const LAPSE_STARTS_FROM = '2026-05-01'

/**
 * A client registered in 2019 has filed their returns. Without this, every
 * historical period generates as `pending` and the dashboard claims ~160
 * overdue filings — which would be the app's most visible lie on first load.
 *
 * Past periods are marked filed on their due date; the lapsed registration
 * keeps its recent periods pending so "overdue" is still represented.
 */
export function applySeedFilingHistory(periods: FilingPeriod[]): FilingPeriod[] {
  return periods.map((p) => {
    if (p.dueDate >= TODAY) return p
    if (LAPSED_REGISTRATIONS.includes(p.registrationId) && p.dueDate >= LAPSE_STARTS_FROM) return p
    return { ...p, state: 'filed', filedAt: p.dueDate }
  })
}
