import type { Account, AccountType, JournalEntry, JournalLine } from './types'
import { ACCOUNT_TYPE_ORDER, isDebitPositive } from './chartOfAccounts'
import { round2 } from '../lib/money'

/**
 * Journal derivation.
 *
 * Every accounting report in the app is a pure function of `JournalEntry[]`.
 * There is no second store to keep in step, which is the whole reason the Bank
 * Book and the Trial Balance cannot disagree about the bank balance.
 *
 * Signed convention throughout: balances are `debits - credits`. Whether that
 * reads as positive is a question about the account's TYPE, and only the
 * presentation layer applies it — so an asset sitting in credit shows as
 * negative and stays visible instead of being flipped into looking normal.
 */

/** Half a fil. Floating-point noise from a 5% VAT split must not fail a correct entry; a real 1-fil error must. */
export const BALANCE_TOLERANCE = 0.005

export function balanceOf(lines: JournalLine[]): { debit: number; credit: number; diff: number } {
  const debit = round2(lines.reduce((s, l) => s + (l.debit || 0), 0))
  const credit = round2(lines.reduce((s, l) => s + (l.credit || 0), 0))
  return { debit, credit, diff: round2(debit - credit) }
}

/**
 * The guard the whole plan rests on.
 *
 * Rejects an entry with no lines, a line carrying both a debit and a credit, a
 * line carrying neither, a negative amount, or an unbalanced total. A negative
 * debit is a credit written the wrong way round: allowing it would mean the same
 * entry could be expressed two ways, and reports would have to handle both.
 */
export function isBalanced(lines: JournalLine[]): boolean {
  if (lines.length === 0) return false
  for (const l of lines) {
    const dr = l.debit || 0
    const cr = l.credit || 0
    if (dr < 0 || cr < 0) return false
    if (dr > 0 && cr > 0) return false
    if (dr === 0 && cr === 0) return false
    if (!l.accountCode) return false
  }
  return Math.abs(balanceOf(lines).diff) < BALANCE_TOLERANCE
}

/** Why an entry was refused, for the console message a developer will actually read. */
export function balanceProblem(lines: JournalLine[]): string | null {
  if (lines.length === 0) return 'no lines'
  for (const [i, l] of lines.entries()) {
    if (!l.accountCode) return `line ${i + 1} has no account`
    const dr = l.debit || 0
    const cr = l.credit || 0
    if (dr < 0 || cr < 0) return `line ${i + 1} is negative — write it on the other side instead`
    if (dr > 0 && cr > 0) return `line ${i + 1} has both a debit and a credit`
    if (dr === 0 && cr === 0) return `line ${i + 1} has no amount`
  }
  const { debit, credit, diff } = balanceOf(lines)
  if (Math.abs(diff) >= BALANCE_TOLERANCE) return `out of balance by ${diff.toFixed(2)} (Dr ${debit.toFixed(2)} vs Cr ${credit.toFixed(2)})`
  return null
}

// --- derivation ------------------------------------------------------------

function withinRange(date: string, from?: string, to?: string): boolean {
  if (from && date < from) return false
  if (to && date > to) return false
  return true
}

export interface DateRange {
  from?: string
  to?: string
}

export function journalLines(entries: JournalEntry[], range: DateRange = {}) {
  return entries
    .filter((e) => withinRange(e.date, range.from, range.to))
    .flatMap((e) => e.lines.map((l) => ({ entry: e, line: l })))
}

/** `debits - credits` for one account. Sign is raw; the caller decides how to read it. */
export function accountBalance(entries: JournalEntry[], code: string, range: DateRange = {}): number {
  let bal = 0
  for (const { line } of journalLines(entries, range)) {
    if (line.accountCode !== code) continue
    bal += (line.debit || 0) - (line.credit || 0)
  }
  return round2(bal)
}

/**
 * Balance as the account's own type reads it: a positive number means "normal"
 * for that account. Revenue of 1,800 reads +1,800 even though it is a credit.
 */
export function naturalBalance(entries: JournalEntry[], account: Account, range: DateRange = {}): number {
  const raw = accountBalance(entries, account.code, range)
  return isDebitPositive(account.type) ? raw : round2(-raw)
}

export interface TrialRow {
  account: Account
  debit: number
  credit: number
}

export interface TrialBalanceResult {
  rows: TrialRow[]
  totalDebit: number
  totalCredit: number
  /** Must be 0. Anything else means a posting path is broken. */
  difference: number
  balanced: boolean
}

/**
 * The trial balance. Accounts with a zero balance are dropped — a report padded
 * with zero rows buries the ones that matter.
 */
export function trialBalance(entries: JournalEntry[], accounts: Account[], range: DateRange = {}): TrialBalanceResult {
  const rows: TrialRow[] = []
  for (const account of accounts) {
    const bal = accountBalance(entries, account.code, range)
    if (Math.abs(bal) < BALANCE_TOLERANCE) continue
    rows.push({ account, debit: bal > 0 ? bal : 0, credit: bal < 0 ? round2(-bal) : 0 })
  }
  rows.sort((a, b) => a.account.code.localeCompare(b.account.code))
  const totalDebit = round2(rows.reduce((s, r) => s + r.debit, 0))
  const totalCredit = round2(rows.reduce((s, r) => s + r.credit, 0))
  const difference = round2(totalDebit - totalCredit)
  return { rows, totalDebit, totalCredit, difference, balanced: Math.abs(difference) < BALANCE_TOLERANCE }
}

/** Trial-balance rows grouped under their type, in statement order. */
export function trialBalanceByType(result: TrialBalanceResult): { type: AccountType; rows: TrialRow[]; debit: number; credit: number }[] {
  return ACCOUNT_TYPE_ORDER.map((type) => {
    const rows = result.rows.filter((r) => r.account.type === type)
    return {
      type,
      rows,
      debit: round2(rows.reduce((s, r) => s + r.debit, 0)),
      credit: round2(rows.reduce((s, r) => s + r.credit, 0)),
    }
  }).filter((g) => g.rows.length > 0)
}

export interface LedgerRow {
  entryId: string
  date: string
  reference: string
  narration: string
  sourceType: JournalEntry['sourceType']
  debit: number
  credit: number
  /** Running balance after this row, signed as debits-minus-credits. */
  balance: number
}

/**
 * One account's ledger with a running balance — this is the Bank Book, the Cash
 * Book, and every other account ledger. One function, one component, N reports.
 *
 * `opening` is passed in rather than derived so the same function can produce a
 * period ledger: the caller computes the balance before `range.from` and hands it
 * over as the opening figure.
 */
export function accountLedger(entries: JournalEntry[], code: string, opening = 0, range: DateRange = {}): LedgerRow[] {
  const rows = journalLines(entries, range)
    .filter(({ line }) => line.accountCode === code)
    .map(({ entry, line }) => ({ entry, line }))
    // Date first, then reference, so a day's entries render in a stable order
    // rather than shuffling on every re-render.
    .sort((a, b) => a.entry.date.localeCompare(b.entry.date) || a.entry.reference.localeCompare(b.entry.reference))

  let balance = round2(opening)
  return rows.map(({ entry, line }) => {
    balance = round2(balance + (line.debit || 0) - (line.credit || 0))
    return {
      entryId: entry.id,
      date: entry.date,
      reference: entry.reference,
      narration: entry.narration,
      sourceType: entry.sourceType,
      debit: line.debit || 0,
      credit: line.credit || 0,
      balance,
    }
  })
}

/** Balance strictly before `date` — the opening figure for a period ledger. */
export function openingBalance(entries: JournalEntry[], code: string, date?: string): number {
  if (!date) return 0
  let bal = 0
  for (const e of entries) {
    if (e.date >= date) continue
    for (const l of e.lines) {
      if (l.accountCode !== code) continue
      bal += (l.debit || 0) - (l.credit || 0)
    }
  }
  return round2(bal)
}

/** Every account that has at least one posting, for a ledger picker. */
export function accountsWithActivity(entries: JournalEntry[]): Set<string> {
  const s = new Set<string>()
  for (const e of entries) for (const l of e.lines) s.add(l.accountCode)
  return s
}

/** Entries whose lines do not balance. Should always be empty; Phase 3 shows the count. */
export function unbalancedEntries(entries: JournalEntry[]): JournalEntry[] {
  return entries.filter((e) => !isBalanced(e.lines))
}

/**
 * Reverses an entry: the same lines with Dr and Cr swapped. Used instead of
 * editing, so both the mistake and the correction stay on the record — the same
 * rule the app already applies with credit notes and filing reverts.
 */
export function reversalLines(lines: JournalLine[]): JournalLine[] {
  return lines.map((l) => ({ accountCode: l.accountCode, debit: l.credit || 0, credit: l.debit || 0 }))
}
