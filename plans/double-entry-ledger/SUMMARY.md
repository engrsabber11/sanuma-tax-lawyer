# Double-Entry Ledger — Summary

One page. Read this first.

---

## The problem

The app has an Accounting page, a `LedgerEntry` type, and four places that write
to it. None of it is double-entry.

`LedgerEntry` is **one line with one account**. Every call site posts a single
side and nothing posts the contra side:

```ts
addLedgerEntry({ account: 'Service Revenue', debit: 0, credit: amount })
```

So the books do not balance, and not by a rounding error:

```
seeded ledger: 10 lines
  total debits   15,720.00
  total credits   4,537.50
  DIFFERENCE     11,182.50      <- must be 0.00
```

There is no Bank account, no Cash account, and no Accounts Receivable. A trial
balance, a balance sheet, a bank book and a cash book are all impossible to
produce, because the data they read does not exist.

## The second problem, which is worse

`recordPayment` credits **Service Revenue with the VAT-inclusive amount**:

```
INV-2026-1001   AED 1,800 + 5% VAT = 1,890

posted:    Cr Service Revenue        1,890.00
correct:   Dr Bank                   1,890.00
           Cr CT Service Income      1,800.00
           Cr Output VAT Payable        90.00
```

Two consequences, on every invoice:

1. **Revenue is overstated by the VAT.** It is not the firm's money.
2. **The VAT collected is never recorded as owed to the FTA.** There is no
   liability account, so the amount payable cannot be computed from the books.

`SanumaBusinessFundamentalBn.md` §6 specifies exactly that three-line journal.
The code does not implement it. For a firm whose business is filing other
people's VAT returns, its own VAT position being unrepresentable is the defect
that matters most.

Revenue is also recognised **on payment**, not on invoice. That is cash-basis
accounting in a system that has invoices, credit notes and receivables — and it
means AR exists in `invoices` but nowhere in the ledger, so the two can drift
with nothing to detect it.

## What changes

One structural change, and everything else follows from it.

**Now:** one ledger line = one entry.
**After:** one entry = a balanced **group** of lines, and an unbalanced group
cannot be saved.

```
JournalEntry  { id, date, reference, sourceType, sourceId, narration, lines[] }
JournalLine   { accountCode, debit, credit }

postJournal(...)  ->  refuses unless sum(debits) === sum(credits)
```

Plus a real **Chart of Accounts**: a typed, coded, controlled list, replacing
free-text account strings. Today `addExpense` writes
``account: `${input.category} Expense` `` — the chart is whatever anyone typed in
a category box.

## What that buys, for free

Day Book, Trial Balance, Bank Book, Cash Book, any account's ledger, and the VAT
return are all **views over the same journal lines**. No new tables, no syncing,
no chance of two reports disagreeing:

| Report | How it is derived |
|---|---|
| Day Book | entries in date order, lines nested |
| Bank Book / Cash Book | `lines.filter(l => l.accountCode === '1000')` + running balance |
| Any account ledger | the same component, different code |
| Trial Balance | `groupBy(accountCode)` → `sum(dr) - sum(cr)` |
| VAT return | Output VAT Payable balance − Input VAT Recoverable balance |
| P&L / Balance Sheet | account **type** decides which statement a balance lands on |

Proven on a worked example before any code was written — bank book closing
balance and the trial balance's Bank line agree to the fil, because they read
the same rows.

## What this plan does not do

- No bank feed, no reconciliation against a real statement.
- No multi-currency. Everything is AED.
- No depreciation schedules or fixed-asset register.
- No year-end closing journals to Retained Earnings. The account exists; the
  automated close is a later decision.

## Cost

Five phases. Phases 1 and 2 have no visible UI, which is deliberate — the same
reason `tax-year-engine` front-loaded its generator: the postings have to be
provably correct before anything renders them.

Phase 2 **bumps the localStorage key**, because the shape of the ledger changes
completely and single-sided history cannot be reliably converted into balanced
journals.
