# Phase 1 — Chart of Accounts, Journal Model, Balance Guard

**Status:** pending · **Depends on:** — · **UI changes:** none

No UI at all. This phase makes an unbalanced journal impossible to represent,
which is what every later phase relies on.

---

## Files

- `src/data/chartOfAccounts.ts` (new) — the built-in chart + helpers
- `src/data/journal.ts` (new) — pure posting/derivation functions
- `src/data/types.ts` (edit) — `Account`, `JournalEntry`, `JournalLine`
- `src/lib/money.ts` (new) — rounding, used by every template

---

## Types

```ts
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'

export interface Account {
  code: string                 // '1000' — sorts and carries the statement mapping
  name: string
  type: AccountType
  /** Reconciles against a sub-ledger; Phase 4 asserts it. */
  control?: 'receivables' | 'wallet' | 'disbursements'
  builtIn: boolean
  description?: string
}

export interface JournalLine {
  accountCode: string
  debit: number
  credit: number
}

export type JournalSource =
  | 'invoice' | 'payment' | 'credit-note' | 'expense'
  | 'wallet-accrual' | 'wallet-applied' | 'opening' | 'manual'

export interface JournalEntry {
  id: string
  date: string                 // ISO, the accounting date
  reference: string            // 'INV-2026-1001'
  narration: string
  sourceType: JournalSource
  sourceId?: string            // the invoice/expense/... this came from
  actor: string
  lines: JournalLine[]
  /** Set on a reversal, pointing at what it reverses. Phase 5. */
  reversesEntryId?: string
}
```

`LedgerEntry` is **not** deleted in this phase — Phase 2 replaces its call sites
and Phase 3 its only reader. Deleting it now would break the Accounting page for
two phases.

## The balance guard

The whole point of the phase:

```ts
export function balanceOf(lines: JournalLine[]): { debit: number; credit: number; diff: number }
export function isBalanced(lines: JournalLine[]): boolean
```

`isBalanced` compares to a 0.005 tolerance — half a fil — so floating-point
noise from a 5% VAT computation does not reject a correct entry, while a real
1-fil error still does.

A line must have exactly one side non-zero. `{ debit: 100, credit: 40 }` is not a
net-60 debit, it is a data-entry mistake, and `isBalanced` must reject it rather
than net it silently.

## Deriving everything else

Pure functions over `JournalEntry[]`, no state:

```ts
accountBalance(entries, code): number          // dr - cr, signed
trialBalance(entries, accounts): TrialRow[]    // one row per account with a balance
accountLedger(entries, code, opening): LedgerRow[]   // running balance, date order
```

`accountLedger` is what the Bank Book, the Cash Book and every other account
ledger are made of. One function, one component in Phase 3, N reports.

Signed convention: `accountBalance` returns `debits - credits` always. Whether
that reads as positive depends on the account's *type*, and only the presentation
layer applies that — so an asset with a credit balance shows as negative and
stays visible instead of being flipped into looking normal.

## Rounding

```ts
// src/lib/money.ts
export function round2(n: number): number
```

`Math.round(n * 100) / 100`. Every template rounds each line before posting.
Where a 5% VAT split leaves a residual fil, the **VAT line** absorbs it — the
revenue figure is the one that has to tie to the invoice.

---

## Verification

Scratch script (`npx tsx`, deleted after), output pasted into `STATUS.md`:

- `isBalanced` accepts a correct 3-line invoice journal.
- `isBalanced` rejects: a 1-fil imbalance; a line with both sides set; an empty
  line array.
- `round2` on `1800 * 0.05` and on an amount that produces a residual.
- `trialBalance` over a hand-built set of 5 entries: totals equal, and the
  per-account rows match hand-computed values.
- `accountLedger('1000', opening)` closing balance **equals** that account's
  `trialBalance` row. This is the invariant the whole plan rests on — two
  reports, one source, always agreeing.
- Chart integrity: no duplicate codes, every code numeric-4, every type valid,
  every `control` code is an asset or liability.

`tsc -b` and `npm run lint` clean.

## Out of scope

Posting anything (Phase 2). Rendering anything (Phase 3). The chart is a
constant here; Phase 5 makes it editable.
