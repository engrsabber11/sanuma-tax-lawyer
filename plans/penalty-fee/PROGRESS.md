# Minimum Penalty Fee — Current Execution State

Last updated: 2026-08-17

| Phase | Status | Notes |
|---|---|---|
| 1. Fee rule + Settings UI | done | `PenaltyFeeRule` in types/store/persistence, seeded at AED 250 + VAT + label. New Settings → **Billing Rules** tab (enable switch, amount, VAT switch, invoice-line label, Save + toast). Verified: tab renders, amount 250, edits persist. |
| 2. Matter flag + charge creation | done | `Matter.clientInitiated` + `penaltyChargeId`; `PendingCharge[]` in store; `addMatter` raises a snapshotted charge when the toggle is off and the rule is on. New Matter modal has the "Client-initiated matter" switch (default OFF — matters count as firm-initiated unless staff say the client asked) with an inline warning naming the amount and client; toast says the fee was queued. Firm-initiated badge on Kanban card + List row + matter header. Legacy state migrates to `clientInitiated: true`. Verified in browser. |
| 3. Auto-add to the upcoming invoice | done | New `src/lib/invoice.ts` (`invoiceSubtotal`/`invoiceVat`/`invoiceTotal`/`invoiceBalanceDue`) replaces the inline `*1.05` at all 8 call sites; `InvoiceLine` gained optional `serviceId`, `kind`, `vatApplicable`. New Invoice modal shows a **Pending charges** section (pre-ticked, removable, resets on client change); `addInvoice` marks picked-up charges billed and posts a **Penalty Income** ledger entry. Invoice detail tags the line "Penalty" / "VAT exempt". Verified: 1500 service + 250 penalty = AED 1,837.50; VAT-exempt 400 penalty totals AED 400.00 with VAT 0.00. |
| 4. Waiver + visibility | done | `waivePendingCharge(id, reason)` (pending only) + `WaiveChargeModal` with required reason. Matter detail has a Penalty Fee card: Pending (Waive button) / Billed (links the invoice) / Waived (shows reason + date). Client profile → Invoices tab shows an **Unbilled Charges** card with the queued total. Verified: waive validation, waived charge disappears from both the client card and the invoice modal. |
| 5. Accounting trail | done | Folded into Phase 3 — a `Penalty Income` ledger entry is posted when charges are billed, so it reads separately from Service Revenue in Accounting. |

## Bug found and fixed during Phase 3

`addInvoice` built the invoice **inside** the `setInvoices` updater, calling `genId()` there.
React StrictMode double-invokes updaters, so the object handed back to callers carried an id
that never reached state — every back-reference to a new invoice was dangling
(`matter.invoiceId` included, pre-existing). The invoice is now built outside the updater,
matching `addMatter`/`addClient`. Verified: the matter's penalty card now resolves
"Billed on INV-2026-1008" instead of falling back to "Billed on an invoice".

## Verification performed

- `npx tsc -b` clean; `npm run build` succeeds.
- `npx oxlint src` — no new warnings (only the pre-existing exhaustive-deps set).
- Browser run against `vite` on :5199 covering settings → matter creation → client
  queue → invoice pickup → invoice detail → waiver → VAT-exempt maths. Zero console errors.

## All phases complete — 2026-08-17

A matter opened without client involvement now raises a firm-configured minimum fee that
rides onto the client's next invoice, stays visible and waivable until then, and is never
silently applied.
