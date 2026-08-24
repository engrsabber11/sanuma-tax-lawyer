# Double-Entry Ledger — Plan Index

Index and domain reference. Start with `SUMMARY.md`, then follow the phase files
in order.

| File | What it is |
|---|---|
| `SUMMARY.md` | One page: the defect and what changes. **Read first.** |
| `PLAN.md` | This file — the chart, the journal templates, phase index, open decisions |
| `STATUS.md` | Live phase status. Update after every verified phase. |
| `phases/PHASE-01…05` | One executable file per phase |

---

## Context

`tax-year-engine` (8 phases, complete) rebuilt the compliance spine: a
registration generates filing periods, a due return becomes a matter, a completed
matter becomes an invoice. That chain now ends at `addInvoice`.

This plan continues from there — what happens to the money after the invoice
exists. It is deliberately a separate plan: the compliance spine is about dates
and obligations, this is about debits and credits, and folding them together
would have turned eight phases into fourteen.

The accounting module is not a greenfield build. It has a page, four tabs, a
`LedgerEntry` type and four posting call sites. All of it is single-sided, so the
work is **replacing a categorised transaction log with a ledger**, not adding
accounting where there was none.

---

## Chart of Accounts

Numbered blocks, because the number carries the statement mapping. This is the
built-in chart; Phase 5 makes it extensible the way `tax-year-engine` Phase 8 did
for the obligation catalog.

| Code | Account | Type | Notes |
|---|---|---|---|
| 1000 | Bank | asset | Default settlement account |
| 1010 | Cash on Hand | asset | Petty cash |
| 1100 | Accounts Receivable | asset | **control** — must equal open invoice balances |
| 1200 | Input VAT Recoverable | asset | VAT paid on the firm's own costs |
| 1300 | Disbursements Receivable | asset | **control** — paid for a client, not yet recharged |
| 2100 | Output VAT Payable | liability | VAT collected, owed to the FTA |
| 2200 | Client Wallet Liability | liability | **control** — must equal wallet balances |
| 3000 | Partner Capital | equity | |
| 3900 | Retained Earnings | equity | Target of a year-end close (out of scope) |
| 4100 | VAT Service Income | revenue | §6: revenue split by service line |
| 4200 | Corporate Tax Service Income | revenue | |
| 4300 | Business & Licensing Income | revenue | Default for unmapped services |
| 4400 | Penalty Income | revenue | §6 names this explicitly |
| 5100 | Rent Expense | expense | |
| 5200 | Salary Expense | expense | |
| 5300 | Software Expense | expense | |
| 5400 | Marketing Expense | expense | |
| 5500 | Bank Charges | expense | §6 names this explicitly |
| 5600 | Referral Commission Expense | expense | The cost side of the wallet |
| 5900 | Other Expense | expense | Default for unmapped categories |

Three rules the code must enforce, not merely document:

- **Type is immutable.** Type decides sign, statement and closing behaviour.
  Changing it after postings exist rewrites history.
- **Post to leaves, never to parents.** A parent's balance must always be a
  roll-up, never a roll-up plus strays.
- **VAT accounts are never revenue or expense.** Output VAT is a liability, Input
  VAT an asset. Netting either into P&L is the most common error in UAE books and
  the one this firm can least afford.

### Mapping the two free-text fields

`Service` and `Expense` currently carry no account. Both get an optional code
with a safe default, so nothing has to be back-filled before the ledger works:

- `Service.revenueAccountCode` → defaults to `4300`
- `Expense.accountCode` → derived from `category` via a lookup, defaulting to `5900`

A default that lands in a real account is better than a blank: a
misclassified expense is a reporting problem, an unposted one is a broken ledger.

---

## Journal templates

The app never composes a journal ad hoc. Each business event maps to one
template, defined once, and `postJournal` refuses anything unbalanced.

Amounts below use `INV-2026-1001` — AED 1,800 + 5% VAT.

| # | Event | Debit | Credit |
|---|---|---|---|
| 1 | Invoice issued | 1100 AR 1,890 | 4200 CT Income 1,800 · 2100 Output VAT 90 |
| 2 | Payment received | 1000 Bank 1,890 | 1100 AR 1,890 |
| 3 | Credit note (firm-issued) | 4xxx Income 1,000 · 2100 Output VAT 50 | 1100 AR 1,050 |
| 4 | Expense, own cost | 5xxx Expense 8,000 · 1200 Input VAT 400 | 1000 Bank 8,400 |
| 5 | Disbursement for a client | 1300 Disb. Receivable 620 | 1000 Bank 620 |
| 6 | Penalty fee billed | *(part of #1 — a line on the invoice)* | 4400 Penalty Income · 2100 Output VAT |
| 7 | Referral bonus earned | 5600 Referral Expense 150 | 2200 Wallet Liability 150 |
| 8 | Wallet applied to invoice | 2200 Wallet Liability 100 | 1100 AR 100 |

Four things worth stating because the current code gets them wrong:

1. **Revenue is recognised at #1, not #2.** Accrual, per §6's IFRS 15 note.
   `recordPayment` must stop touching revenue entirely.
2. **VAT is split out at #1** and is never part of a revenue line.
3. **A disbursement is an asset, not an expense** (#5). It is the client's cost,
   advanced by the firm. Recharging it later clears 1300.
4. **The wallet is a real liability** (#7). Referral bonuses are money owed to
   clients; today they live entirely outside the ledger.

### Rounding

VAT at 5% on odd amounts produces fractions of a fil. Every journal is rounded
to 2 decimals **per line**, and the VAT line absorbs any residual so the entry
balances exactly. A journal that fails to balance by 0.01 is still a journal that
cannot be saved.

---

## Phases

| # | Phase | Depends on | Visible? |
|---|---|---|---|
| 1 | [Chart of accounts + journal model + balance guard](phases/PHASE-01-journal-model.md) | — | no |
| 2 | [Post every business event; seed rebuild](phases/PHASE-02-postings.md) | 1 | no |
| 3 | [Day Book, Trial Balance, Bank & Cash Book](phases/PHASE-03-reports.md) | 1, 2 | **major** |
| 4 | [VAT return + sub-ledger reconciliation](phases/PHASE-04-vat-and-reconciliation.md) | 1–3 | new tabs |
| 5 | [Manual journal entry, period lock, chart editor](phases/PHASE-05-manual-and-lock.md) | 1–4 | new page + settings |

Phase 2 is the one that determines whether any figure in the app is true.
Phase 3 is the one the client will judge the work by.

---

## Open decisions

Each has a recommended default, so no phase blocks on an answer.

| # | Question | Recommendation | Needed by |
|---|---|---|---|
| 1 | Convert the existing single-sided ledger, or rebuild? | **Rebuild** from the source documents. The contra side of a single-sided line is not recoverable — inferring "it must have been Bank" would fabricate a bank balance and present it as history. Bump `STORAGE_KEY` to v3. | Phase 2 |
| 2 | Opening balances for Bank / Cash / Capital? | Seed one opening journal: Bank 50,000, Cash 2,000, Cr Partner Capital 52,000. Without it the seeded expenses drive the bank overdrawn and the demo looks broken. | Phase 2 |
| 3 | Cash-basis or accrual? | **Accrual** — revenue at invoice. §6 cites IFRS 15, and the app already has invoices, credit notes and receivables, which only mean something on accrual. | Phase 2 |
| 4 | Is a disbursement an expense or an asset? | **Asset** (1300), cleared when recharged. Treating it as an expense overstates costs and hides money owed to the firm. | Phase 2 |
| 5 | Should a mis-posted entry be editable? | No. **Reverse and repost**, matching the credit-note rule the app already follows for invoices and `revertFilingToPending` for filings. | Phase 5 |
| 6 | Who can post a manual journal? | Everyone, for now, with `actor` recorded on the entry. Role gating waits for the staff-permissions work already in flight. | Phase 5 |

---

## Verification (every phase)

1. `npx tsc -b` clean
2. `npm run lint` no new findings vs the recorded baseline
3. Browser check of that phase's behaviour, zero console errors
4. `STATUS.md` updated with the numbers actually observed

Phases 1–4 add a fifth gate, and it is the one that matters:

**Total debits = total credits, and every control account reconciles to its
sub-ledger.** Recorded as real numbers in `STATUS.md`, not as "verified".

There is still no test runner in this project (`tax-year-engine` STATUS flags it
as the highest-value outstanding item). Assertions here are made with a scratch
script that is deleted afterwards, with the real output pasted into `STATUS.md`.
A balanced-journal invariant is exactly the kind of thing a regression gate
should hold, so this plan strengthens the case rather than settling it.
