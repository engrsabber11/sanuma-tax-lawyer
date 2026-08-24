# Phase 4 — VAT Return and Sub-Ledger Reconciliation

**Status:** pending · **Depends on:** Phases 1–3 · **UI changes:** two tabs

The firm's own VAT return, computed from its own books — and the three checks that
prove the books can be trusted to produce it.

---

## Files

- `src/components/accounting/VatSummary.tsx` (new, replaces the tab body)
- `src/components/accounting/Reconciliation.tsx` (new)
- `src/data/journal.ts` (edit) — `vatPosition`, `reconcile*`

---

## VAT summary

Today's tab recomputes VAT from `invoices` and `expenses` at 5% on the fly, which
is a second source of truth that can disagree with the ledger. It reads the
accounts instead:

```
Output VAT Payable    (2100)      165.00     collected on sales
Input VAT Recoverable (1200)      417.50     paid on costs
------------------------------------------------
Net position                     (252.50)    recoverable from the FTA
```

Signed honestly: a credit balance means payable, a debit means recoverable, and
the label follows the sign rather than always reading "payable to FTA".

Filtered by date range so a tax period can be selected — and because this firm is
itself a registered taxable person, its **own** `Registration` filing periods are
offered as the range. The firm's VAT period should not have to be typed by hand
in an app whose entire purpose is generating those periods.

## Reconciliation

Three assertions, each rendered as two figures and their difference — not a tick:

| Control account | Must equal | Sub-ledger |
|---|---|---|
| 1100 Accounts Receivable | sum of `invoiceBalanceDue` over unpaid invoices | `invoices` |
| 2200 Client Wallet Liability | sum of every client's wallet balance | `walletTransactions` |
| 1300 Disbursements Receivable | sum of unbilled disbursement expenses | `expenses` |

A difference shows its amount and links to that account's ledger, so the next step
after "these disagree" is one click rather than an investigation.

These three catch nearly every integration defect. A posting path added later that
forgets to touch AR shows up here immediately — which is the reason to build them
before more features land on top.

---

## Verification

- All three reconciliations show a difference of exactly `0.00` on the seed, with
  both figures recorded.
- Deliberately break one — post a payment without the AR credit from a scratch
  call — and confirm the AR row reports the exact difference rather than silently
  passing. Then revert.
- VAT net position matches a hand computation from the trial balance.
- Selecting the firm's own VAT period filters the summary to those dates.
- Zero console errors.
