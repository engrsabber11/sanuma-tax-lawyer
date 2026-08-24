# Phase 3 — Day Book, Trial Balance, Bank & Cash Book

**Status:** pending · **Depends on:** Phases 1, 2 · **UI changes:** major

The phase the client will judge the work by, and the cheapest of the five — every
report is a view over `journalEntries`, so there is no new data to build.

---

## Files

- `src/pages/accounting/AccountingPage.tsx` (rewrite the tabs)
- `src/components/accounting/DayBook.tsx` (new)
- `src/components/accounting/TrialBalance.tsx` (new)
- `src/components/accounting/AccountLedger.tsx` (new) — Bank Book, Cash Book, and every other account
- `src/data/types.ts` (edit) — delete `LedgerEntry` once nothing reads it

---

## Day Book

Entries in date order, each rendering its lines nested beneath it. One row per
entry, expandable, showing reference, narration and the entry total.

Each entry shows its own Dr/Cr totals, because a day book whose entries visibly
balance is the fastest way to trust the rest of the page.

Filters: date range, source type, account, and free text over reference and
narration.

## Trial Balance

`groupBy(accountCode)` then `sum(dr) - sum(cr)`; positive into the Debit column,
negative into Credit. Grouped under type headings (Assets, Liabilities, Equity,
Revenue, Expenses) with a subtotal per group.

The totals row is the point of the report. It shows both totals **and** their
difference as figures — not a green tick. "Balanced" as a word is exactly the
claim a reader should be able to check for themselves.

An "as at" date filter, so a period can be examined.

## Account Ledger — the Bank Book and Cash Book

One component, driven by an account code:

```
Date        Ref            Narration            Debit      Credit     Balance
------------------------------------------------------------------------------
                           Opening                                 50,000.00
2026-07-01  BILL-RENT-07   Office rent July               8,400.00  41,600.00
2026-07-01  INV-2026-1001  Payment received    1,890.00             42,870.00
------------------------------------------------------------------------------
                           Closing                                  38,577.50
```

The component labels the two columns from the account's **type** rather than
hardcoding "Money In / Money Out": on a liability account the same columns mean
the opposite.

Bank Book and Cash Book are therefore not features — they are this component with
`1000` and `1010`. An account picker exposes the rest, which is how the AR
ledger, the VAT ledger and every expense ledger arrive for free.

## Accounting page structure

| Tab | Content |
|---|---|
| Day Book | every journal entry |
| Trial Balance | all accounts, both totals |
| Ledgers | account picker, defaulting to Bank |
| Profit & Loss | revenue and expense accounts, derived from type |
| Receivables | unchanged (reads `invoices`) |
| VAT Summary | Phase 4 rewrites this |
| Expense Breakdown | unchanged (reads `expenses`) |

The stat cards move onto ledger figures: **Revenue** = total of `4xxx`
(VAT-exclusive, which it was not before), **Expenses** = total of `5xxx`, **Net**
= the difference. A fourth tile shows the trial-balance difference, which should
read `0.00` forever and is the first thing to look at when it does not.

## Deleting `LedgerEntry`

`tsc -b` is the check: zero references to `LedgerEntry`, `ledgerEntries` or
`addLedgerEntry` anywhere in `src/`, including `PersistedState`.

---

## Verification

- **Bank Book closing balance === the Trial Balance `1000` row**, to the fil.
  Same for Cash on Hand. This is the invariant that proves the reports share one
  source; record both numbers.
- Trial balance totals equal, printed in full.
- Day Book entry count equals the journal length; every rendered entry balances.
- P&L revenue equals the sum of `4xxx` and **excludes VAT** — cross-checked
  against the sum of invoice subtotals.
- Switching the ledger picker to `1100` shows AR closing equal to the
  open-invoice total.
- Zero references to the deleted type, per `tsc`.
- Zero console errors.
