# Phase 2 — Post Every Business Event, Rebuild the Seed

**Status:** pending · **Depends on:** Phase 1 · **UI changes:** none visible

The phase that decides whether any figure in the app is true.

---

## Files

- `src/data/journalTemplates.ts` (new) — one function per business event
- `src/data/store.tsx` (edit) — `postJournal`, replace all four `addLedgerEntry` sites
- `src/data/mockData.ts` (edit) — opening journal, service/expense account mapping
- `src/data/types.ts` (edit) — `Service.revenueAccountCode`, `Expense.accountCode`

---

## postJournal

```ts
postJournal(input: {
  date: string
  reference: string
  narration: string
  sourceType: JournalSource
  sourceId?: string
  lines: JournalLine[]
  actor?: string
}): JournalEntry | undefined
```

Returns `undefined` and posts **nothing** when the lines do not balance. It does
not throw: a thrown error in a React event handler takes the page down, and a
refused posting must be recoverable. It logs the imbalance to the console with
the reference, so a broken template is found in development rather than in a
trial balance six months later.

Nothing else in the store may append to the journal.

## The templates

One exported function per row of `PLAN.md`'s journal table. Each returns
`JournalLine[]` and is pure, so Phase 2's verification can assert them without a
store.

| Template | Replaces |
|---|---|
| `invoiceIssued(invoice, services)` | *nothing — invoices post nothing today* |
| `paymentReceived(invoice, amount)` | the `Service Revenue` credit in `recordPayment` |
| `creditNoteIssued(note)` | the `Credit Notes Issued` debit |
| `expenseIncurred(expense)` | the `${category} Expense` debit |
| `walletBonusAccrued(tx)` | *nothing — the wallet is off-ledger today* |
| `walletAppliedToInvoice(tx)` | *nothing* |
| `openingBalances()` | *nothing* |

`invoiceIssued` is the one with real logic: it walks the invoice lines, groups
service lines by their service's `revenueAccountCode`, sends `kind: 'penalty'`
lines to `4400`, respects `vatApplicable === false` per line, and puts the whole
VAT total on `2100`. Debit AR with the invoice total.

### The change with the widest blast radius

`recordPayment` currently credits revenue. It must credit **AR** instead, and
revenue must be recognised by `addInvoice`. This inverts when revenue appears, so
every figure derived from the ledger moves. That is the correction, not a
side-effect.

## Seed rebuild

Per open decision #1, the seeded `ledgerEntries` array is **deleted**, not
converted: the contra side of a single-sided line is not recoverable, and
guessing "it must have been Bank" would fabricate a bank balance and present it
as history.

The seed journal is instead **generated from the seed documents** — the same
approach `tax-year-engine` Phase 2 took with filing periods, so the seed cannot
drift from what real entry produces:

```
buildSeedJournal()
  = openingBalances()
  + every seed invoice        -> invoiceIssued
  + every seed payment        -> paymentReceived   (from invoice.paidAmount)
  + every seed credit note    -> creditNoteIssued
  + every seed expense        -> expenseIncurred
  + every seed wallet credit  -> walletBonusAccrued
  + every seed wallet debit   -> walletAppliedToInvoice
```

**`STORAGE_KEY` moves to `sanuma-app-state-v3`.** Anyone testing loses local demo
data at this point. Say so at hand-off.

## Mapping

`Service.revenueAccountCode` on the seed services:

| Service | Account |
|---|---|
| `svc-vat-reg`, `svc-vat-return` | 4100 VAT Service Income |
| `svc-corp-tax-reg`, `svc-corp-tax-filing` | 4200 Corporate Tax Service Income |
| everything else | 4300 Business & Licensing Income |

`Expense.accountCode` from `category` (`Rent`→5100, `Salary`→5200,
`Software`→5300, `Marketing`→5400, `Bank`→5500, else 5900). A category with no
mapping lands in 5900, never nowhere.

---

## Verification

Scratch script, output in `STATUS.md`:

- **Total debits = total credits over the whole generated seed journal.** The
  headline number. Print both totals and the difference.
- Every individual entry balances — print the count checked and any that fail.
- `INV-2026-1001` produces exactly the three lines in `PLAN.md`, to the fil.
- A VAT-exempt penalty line produces no VAT.
- Trial balance printed in full, with the totals row.
- **AR control = sum of open invoice balances.** Both numbers, and the difference.
- **Wallet liability = sum of wallet balances.** Both numbers.
- Revenue total excludes VAT: `4xxx total === sum of invoice subtotals`, not
  totals.
- `recordPayment` no longer touches any `4xxx` account — assert by posting a
  payment and checking the affected codes are `1000` and `1100` only.

Browser: every existing page still renders with zero console errors. The
Accounting page will show wrong figures until Phase 3 rewrites it — that is
expected and must be stated, not quietly tolerated.

## Out of scope

Reading the journal (Phase 3). Reversal (Phase 5).
