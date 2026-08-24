# Double-Entry Ledger — Execution Status

**Last updated:** 2026-08-24
**Overall:** **0 of 5 phases complete.** Plan written. Phase 1 code is written and
compiles; its scratch-script verification has NOT been run yet, so it stays
`in-progress` rather than `done`.

Update this file **immediately after each phase is verified**, before starting the
next. Fill the Verified column with what was actually checked and the numbers
observed, not with "done".

---

## Phase status

| # | Phase | File | Status | Verified |
|---|---|---|---|---|
| 1 | Chart of accounts + journal model + balance guard | `phases/PHASE-01-journal-model.md` | **in-progress** | Code written, `tsc -b` clean, lint 14 (baseline). Verification script not yet run — see checkpoint below. |
| 2 | Post every business event; seed rebuild | `phases/PHASE-02-postings.md` | pending | — |
| 3 | Day Book, Trial Balance, Bank & Cash Book | `phases/PHASE-03-reports.md` | pending | — |
| 4 | VAT return + sub-ledger reconciliation | `phases/PHASE-04-vat-and-reconciliation.md` | pending | — |
| 5 | Manual journal entry, period lock, chart editor | `phases/PHASE-05-manual-and-lock.md` | pending | — |

Status values: `pending` · `in-progress` · `blocked` · `done`

---

## Starting state, measured before any change

The numbers this plan exists to fix, recorded so the improvement is provable:

```
seeded ledger: 10 lines, all single-sided
  total debits   15,720.00
  total credits   4,537.50
  DIFFERENCE     11,182.50        <- must be 0.00

accounts that do not exist: Bank, Cash, Accounts Receivable,
                            Output VAT Payable, Client Wallet Liability

INV-2026-1001 (AED 1,800 + 5% VAT = 1,890)
  posted:  Cr Service Revenue 1,890.00       <- VAT booked as revenue
  correct: Dr Bank 1,890.00
           Cr CT Service Income 1,800.00
           Cr Output VAT Payable 90.00
  revenue overstated by 90.00 on this invoice alone
```

`addLedgerEntry` call sites, all single-sided: `store.tsx` in `addInvoice`
(penalty income), `recordPayment` (service revenue), `addCreditNote`, `addExpense`.

---

## Checkpoint — 2026-08-24, mid Phase 1

Written and compiling, not yet verified:

| File | What it holds | State |
|---|---|---|
| `src/lib/money.ts` | `round2`, `allocate` (residual-absorbing split) | new, complete |
| `src/data/chartOfAccounts.ts` | the 20-account built-in chart, `CODES`, `accountForExpenseCategory`, `isDebitPositive`, `ledgerColumnLabels` | new, complete |
| `src/data/journal.ts` | `isBalanced` / `balanceProblem` guard, `accountBalance`, `trialBalance`, `trialBalanceByType`, `accountLedger`, `openingBalance`, `reversalLines`, `unbalancedEntries` | new, complete |
| `src/data/types.ts` | `Account`, `AccountType`, `JournalLine`, `JournalSource`, `JournalEntry` added; `LedgerEntry` deliberately left in place | edited |

`tsc -b` **0 errors** · `npm run lint` **14**, the current baseline (13 long-standing
plus one `only-export-components` in `store.tsx` from parallel staff-permissions work).

### Next action

Run Phase 1's verification (the list in `PHASE-01-journal-model.md`) as a scratch
`tsx` script, paste the real output here, then mark the phase `done`. The case
that matters most:

```
accountLedger('1000', opening) closing balance === trialBalance row for 1000
```

Two reports, one source. If that holds, Phase 2 can post against it.

### Nothing is wired up yet

`journal.ts` has no callers, the store has no `journalEntries` state, and
`addLedgerEntry` is untouched — so the app behaves exactly as before and the
Accounting page still shows the old single-sided figures. That is Phase 2's job,
and it is where `STORAGE_KEY` moves to v3.

---

## Verification gate for every phase

1. `npx tsc -b` clean
2. `npm run lint` no new findings against the baseline recorded in the phase note
3. Browser check of that phase's behaviour, zero console errors
4. This file updated with the actual numbers observed

Phases 1–4 add a fifth gate, and it is the one that matters:

**Total debits = total credits, and every control account reconciles to its
sub-ledger** — recorded as figures, not as the word "verified".

---

## Phase-specific numbers to record

| Phase | Record |
|---|---|
| 1 | Balance-guard accept/reject cases; `accountLedger` closing == `trialBalance` row |
| 2 | Total Dr and total Cr over the whole seed journal, and the difference; AR control vs open invoices; wallet liability vs wallet balances |
| 3 | Bank Book closing vs Trial Balance `1000` row, both figures; P&L revenue vs sum of invoice subtotals |
| 4 | All three reconciliation differences; the deliberate break and the exact difference it reported |
| 5 | Unbalanced draft refused; reversal restoring prior totals; period lock refusal message |

---

## Notes for whoever resumes this

- Read `SUMMARY.md` first (one page), then the phase file for the first `pending`
  row above. `PLAN.md` holds the chart and the journal templates.
- Phases 1 and 2 have no visible UI. That is deliberate, and it is the same
  reasoning `tax-year-engine` used: the postings must be provably correct before
  anything renders them.
- **Phase 2 bumps `STORAGE_KEY` to v3**, so anyone testing loses local demo data
  at that point. Mention it at hand-over.
- This plan assumes `tax-year-engine` is complete (it is, 8/8). The
  filing → matter → invoice chain from its Phase 7 is what feeds `addInvoice`, and
  Phase 4 here reuses the firm's own `Registration` periods for its VAT range.
- There is still no test runner. A balanced-journal invariant is precisely what a
  regression gate should hold, so this plan strengthens the case for `vitest`
  rather than settling it.
