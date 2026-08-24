import type { StaffRole } from './types'

/**
 * Who can do what.
 *
 * One matrix, one place. The alternative — `activeStaff.role === 'partner' &&`
 * scattered through components — spreads the rule across forty files, and the
 * one place it gets forgotten is a hole nobody notices until it matters.
 *
 * The principle behind the split: **a decision that cannot be walked back
 * belongs to the owner.** Every partner-only permission below is either money
 * leaving the firm or a record that has already gone to the FTA.
 */

export type Permission =
  // --- everyday client work -------------------------------------------------
  | 'client.write'
  | 'document.write'
  | 'reminder.send'
  | 'matter.write'
  // --- fee-earning work, needs judgement ------------------------------------
  | 'registration.write'
  | 'filing.file'
  | 'invoice.create'
  | 'expense.write'
  // --- owner only ------------------------------------------------------------
  | 'penalty.waive'
  | 'year.reopen'
  | 'creditnote.create'
  | 'journal.post'
  | 'accounting.view'
  | 'config.write'
  | 'staff.manage'

/** Why a permission is restricted — shown on the disabled control, so a blocked user learns rather than guesses. */
export const PERMISSION_REASON: Partial<Record<Permission, string>> = {
  'penalty.waive': 'Waiving a fee is money the firm gives up. Owner only.',
  'year.reopen': 'Reopening a closed tax year changes a signed-off compliance record. Owner only.',
  'creditnote.create': 'A credit note reverses an issued tax invoice. Owner only.',
  'journal.post': 'A manual journal moves the books directly. Owner only.',
  'accounting.view': "The firm's own profit and ledgers. Owner only.",
  'config.write': 'Changing the obligation catalog or chart of accounts affects every client. Owner only.',
  'staff.manage': 'Owner only.',
  'registration.write': 'A registration generates a client’s filing calendar. Consultant or owner.',
  'filing.file': 'Recording a return as filed is a statement to the FTA. Consultant or owner.',
  'invoice.create': 'Issuing a tax invoice. Consultant or owner.',
  'expense.write': 'Firm expenses affect the books. Consultant or owner.',
}

const EVERYDAY: Permission[] = ['client.write', 'document.write', 'reminder.send', 'matter.write']

const FEE_EARNING: Permission[] = ['registration.write', 'filing.file', 'invoice.create', 'expense.write']

const OWNER_ONLY: Permission[] = [
  'penalty.waive',
  'year.reopen',
  'creditnote.create',
  'journal.post',
  'accounting.view',
  'config.write',
  'staff.manage',
]

export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  // The owner of the practice. Everything, by definition — there is no one to
  // escalate to.
  partner: [...EVERYDAY, ...FEE_EARNING, ...OWNER_ONLY],
  // Does the client work end to end: registrations, filings, matters, invoices.
  // Cannot give money away, reverse a tax invoice, touch the ledger, or see the
  // firm's own P&L.
  consultant: [...EVERYDAY, ...FEE_EARNING],
  // Data entry and chasing. Cannot file a return or issue an invoice — both are
  // statements to a third party.
  assistant: [...EVERYDAY],
}

export const ROLE_LABEL: Record<StaffRole, string> = {
  partner: 'Partner (Owner)',
  consultant: 'Consultant',
  assistant: 'Assistant',
}

/** What a role is for, in one line — used in the staff list and the role picker. */
export const ROLE_DESCRIPTION: Record<StaffRole, string> = {
  partner: 'Owns the practice. Full access, including the firm’s own books.',
  consultant: 'Runs client work: registrations, filings, matters, invoices.',
  assistant: 'Data entry, documents and reminders.',
}

export function roleCan(role: StaffRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

/** The message a disabled control shows. Falls back to something true rather than blank. */
export function denialReason(permission: Permission): string {
  return PERMISSION_REASON[permission] ?? 'Your role does not allow this.'
}
