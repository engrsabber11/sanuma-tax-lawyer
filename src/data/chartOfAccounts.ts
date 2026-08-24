import type { Account, AccountType } from './types'

/**
 * The built-in Chart of Accounts.
 *
 * Numbered in blocks because the number carries the statement mapping — 1xxx is
 * always an asset, 4xxx always revenue. Sorting by code sorts into balance-sheet
 * then P&L order for free.
 *
 * Defaults, not hardcoded behaviour: Phase 5 makes this editable in Settings,
 * which is how the firm adds its own accounts without a code change.
 *
 * The four revenue accounts follow SanumaBusinessFundamentalBn.md §6, which
 * splits income by service line (VAT / CT / Business / Penalty) so the firm can
 * see which line actually earns.
 */

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expenses',
}

/** Statement order, so a trial balance reads the way an accountant expects. */
export const ACCOUNT_TYPE_ORDER: AccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense']

/**
 * A debit increases an asset or an expense and decreases everything else. This is
 * the only place that fact is encoded; presentation reads it rather than
 * hardcoding a sign per report.
 */
export function isDebitPositive(type: AccountType): boolean {
  return type === 'asset' || type === 'expense'
}

/** Column headings for an account ledger — they invert on a credit-balance account. */
export function ledgerColumnLabels(type: AccountType): { debit: string; credit: string } {
  return isDebitPositive(type) ? { debit: 'In', credit: 'Out' } : { debit: 'Out', credit: 'In' }
}

export const CODES = {
  bank: '1000',
  cash: '1010',
  receivables: '1100',
  inputVat: '1200',
  disbursements: '1300',
  outputVat: '2100',
  walletLiability: '2200',
  capital: '3000',
  retained: '3900',
  vatIncome: '4100',
  ctIncome: '4200',
  businessIncome: '4300',
  penaltyIncome: '4400',
  rent: '5100',
  salary: '5200',
  software: '5300',
  marketing: '5400',
  bankCharges: '5500',
  referralExpense: '5600',
  otherExpense: '5900',
} as const

export const accounts: Account[] = [
  { code: CODES.bank, name: 'Bank', type: 'asset', builtIn: true, description: 'Default settlement account for receipts and payments.' },
  { code: CODES.cash, name: 'Cash on Hand', type: 'asset', builtIn: true, description: 'Petty cash.' },
  {
    code: CODES.receivables,
    name: 'Accounts Receivable',
    type: 'asset',
    control: 'receivables',
    builtIn: true,
    description: 'Invoiced but unpaid. Must equal the sum of open invoice balances.',
  },
  { code: CODES.inputVat, name: 'Input VAT Recoverable', type: 'asset', builtIn: true, description: "VAT paid on the firm's own costs, reclaimable from the FTA." },
  {
    code: CODES.disbursements,
    name: 'Disbursements Receivable',
    type: 'asset',
    control: 'disbursements',
    builtIn: true,
    description: "Paid on a client's behalf and not yet recharged. The client's cost, not the firm's.",
  },

  { code: CODES.outputVat, name: 'Output VAT Payable', type: 'liability', builtIn: true, description: 'VAT collected on sales. Owed to the FTA — never revenue.' },
  {
    code: CODES.walletLiability,
    name: 'Client Wallet Liability',
    type: 'liability',
    control: 'wallet',
    builtIn: true,
    description: 'Referral bonuses owed to clients. Must equal the sum of wallet balances.',
  },

  { code: CODES.capital, name: 'Partner Capital', type: 'equity', builtIn: true },
  { code: CODES.retained, name: 'Retained Earnings', type: 'equity', builtIn: true, description: 'Target of a year-end close. The close itself is out of scope.' },

  { code: CODES.vatIncome, name: 'VAT Service Income', type: 'revenue', builtIn: true },
  { code: CODES.ctIncome, name: 'Corporate Tax Service Income', type: 'revenue', builtIn: true },
  { code: CODES.businessIncome, name: 'Business & Licensing Income', type: 'revenue', builtIn: true, description: 'Default for services with no explicit revenue account.' },
  { code: CODES.penaltyIncome, name: 'Penalty Income', type: 'revenue', builtIn: true, description: 'Minimum engagement fees on firm-initiated matters (§5).' },

  { code: CODES.rent, name: 'Rent Expense', type: 'expense', builtIn: true },
  { code: CODES.salary, name: 'Salary Expense', type: 'expense', builtIn: true },
  { code: CODES.software, name: 'Software Expense', type: 'expense', builtIn: true },
  { code: CODES.marketing, name: 'Marketing Expense', type: 'expense', builtIn: true },
  { code: CODES.bankCharges, name: 'Bank Charges', type: 'expense', builtIn: true },
  { code: CODES.referralExpense, name: 'Referral Commission Expense', type: 'expense', builtIn: true, description: 'The cost side of a wallet bonus.' },
  { code: CODES.otherExpense, name: 'Other Expense', type: 'expense', builtIn: true, description: 'Default for expense categories with no explicit account.' },
]

export function accountByCode(all: Account[], code: string): Account | undefined {
  return all.find((a) => a.code === code)
}

export function accountName(all: Account[], code: string): string {
  return accountByCode(all, code)?.name ?? code
}

/** `1000 · Bank` — how an account reads in a picker or a ledger header. */
export function accountLabel(all: Account[], code: string): string {
  const a = accountByCode(all, code)
  return a ? `${a.code} · ${a.name}` : code
}

/**
 * Expense category to account. The category field is free text typed by staff,
 * so an unmapped one lands in Other Expense rather than nowhere — a
 * misclassified expense is a reporting problem, an unposted one is a broken
 * ledger.
 */
const EXPENSE_CATEGORY_ACCOUNT: Record<string, string> = {
  rent: CODES.rent,
  salary: CODES.salary,
  salaries: CODES.salary,
  payroll: CODES.salary,
  software: CODES.software,
  subscription: CODES.software,
  marketing: CODES.marketing,
  advertising: CODES.marketing,
  bank: CODES.bankCharges,
  'bank charge': CODES.bankCharges,
  'bank charges': CODES.bankCharges,
}

export function accountForExpenseCategory(category: string): string {
  return EXPENSE_CATEGORY_ACCOUNT[category.trim().toLowerCase()] ?? CODES.otherExpense
}
