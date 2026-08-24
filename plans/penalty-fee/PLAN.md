# Minimum Penalty Fee for Firm-Initiated Matters — Plan

## Context

When the firm opens a matter that the client did not ask for — compliance work
started on the client's behalf, chasing a deadline the client ignored — that
work still costs the practice time. The rule: **a matter created without client
involvement carries a standard minimum penalty fee, which is automatically
added to the client's upcoming invoice.**

The app has no separate "Task" entity today; the closest thing is a matter
checklist item, which is a sub-step of a matter and is never billed on its own.
So "Matter or Task" is implemented as **Matter** only. If a standalone Task
entity is added later, it reuses the same pending-charge mechanism (see
"Extending to Tasks" below).

Decisions taken (agreed before writing this plan):

| Question | Decision |
| --- | --- |
| How is "without client involvement" known? | Manual **Client-initiated** toggle on the New Matter form, default ON. Turning it off = firm-initiated = penalty applies. |
| How is the fee defined? | One **flat, firm-wide amount** configured in Settings, with a VAT flag and an editable invoice-line label. |
| How does it reach the invoice? | A **pending-charge queue** on the client. The charge is unbilled until the next invoice for that client is created, where it appears pre-selected and removable. Already-issued invoices are never mutated. |
| Can it be reversed? | **Waivable with a reason while still pending.** Once billed, reversal goes through the existing credit note flow. |

See `PROGRESS.md` in this folder for live status — check it before resuming
work if a session was interrupted.

## Data model

New types in `src/data/types.ts`:

```ts
export interface PenaltyFeeRule {
  enabled: boolean
  amount: number          // flat minimum, AED
  vatApplicable: boolean
  label: string           // invoice line description
}

export interface PendingCharge {
  id: string
  clientId: string
  matterId?: string
  kind: 'penalty'         // room for other auto-charges later
  description: string
  amount: number          // snapshotted at creation — later rule edits do not rewrite history
  vatApplicable: boolean
  createdAt: string
  status: 'pending' | 'billed' | 'waived'
  invoiceId?: string      // set when billed
  waivedReason?: string
  waivedAt?: string
}
```

Changes to existing types:

- `Matter` gains `clientInitiated: boolean` and `penaltyChargeId?: string`.
- `InvoiceLine.serviceId` becomes optional and the line gains
  `kind?: 'service' | 'penalty'`. A penalty line has no service behind it.
  Safe: no screen currently resolves `line.serviceId` back to a service —
  only `store.convertQuoteToInvoice` builds lines from service ids, and every
  render path uses `line.description`.

## Phases

### Phase 1 — Fee rule + Settings UI
Add `PenaltyFeeRule` to types, seed a default in `mockData.ts`
(`{ enabled: true, amount: 250, vatApplicable: true, label: 'Minimum engagement fee — firm-initiated matter' }`),
hold it in the store with `updatePenaltyFeeRule(patch)`, and persist it
(`PersistedState`). Add a **Billing Rules** card under Settings → Preferences:
enable switch, amount input, VAT switch, label input, Save button + toast —
same shape as the existing firm-profile card.

Nothing charges anything yet; this phase just makes the rule real and editable.

**Files:** `src/data/types.ts`, `src/data/mockData.ts`, `src/data/store.tsx`,
`src/pages/settings/SettingsPage.tsx`

### Phase 2 — Matter flag + charge creation
- `PendingCharge[]` state in the store, persisted, with `addPendingCharge`
  (internal) and `pendingChargesForClient(clientId)`.
- `addMatter` accepts `clientInitiated: boolean`. When it is `false` **and**
  the rule is enabled, it creates a `pending` penalty charge for that client,
  snapshotting amount/VAT/label, and stores `penaltyChargeId` back on the
  matter. One penalty per matter — guarded by `penaltyChargeId`.
- Legacy-state migration: hydrate matters as `clientInitiated: m.clientInitiated ?? true`
  (same pattern already used for `checklist`), and default
  `pendingCharges` / `penaltyFeeRule` when absent from localStorage.
- `NewMatterModal`: a "Client-initiated matter" switch (default ON). When
  switched off, an inline notice states the exact consequence — *"A minimum
  penalty fee of AED 250 will be added to Ahmed Khan's next invoice."* The
  switch is hidden when the rule is disabled. Success toast mentions the fee.
- `MattersList` + `MatterDetail`: a "Firm-initiated" badge on the matter.

**Files:** `src/data/types.ts`, `src/data/store.tsx`,
`src/components/modals/NewMatterModal.tsx`, `src/pages/matters/MattersList.tsx`,
`src/pages/matters/MatterDetail.tsx`

### Phase 3 — Auto-add to the upcoming invoice
- Extract a shared `invoiceSubtotal(lines)` / `invoiceTotal(invoice)` helper.
  Today the 5% VAT multiplier is written inline in **8 places**
  (`store.recordPayment`, `NewInvoiceModal`, `RecordPaymentModal`,
  `AccountingPage`, `ClientsList`, `Dashboard`, `MatterDetail`,
  `InvoicesPage`). A VAT-exempt penalty line would silently corrupt totals and
  payment status in every one of them, so the helper lands before penalty
  lines can reach an invoice, and each call site switches to it.
- `NewInvoiceModal`: a **Pending charges** section listing that client's
  pending penalties (re-evaluated when the client dropdown changes),
  pre-selected and individually removable, folded into subtotal/total.
- `addInvoice` accepts `pendingChargeIds` and marks those charges `billed`
  with the new `invoiceId`.
- Invoice detail rows render a penalty line with a distinct tone/badge so it
  reads clearly on the document.

**Files:** `src/lib/utils.ts` (or a new `src/lib/invoice.ts`),
`src/data/store.tsx`, `src/components/modals/NewInvoiceModal.tsx`,
`src/pages/sales/InvoicesPage.tsx`, plus the total call sites listed above.

### Phase 4 — Waiver + visibility
- `waivePendingCharge(id, reason)` in the store — allowed only while `pending`.
- `MatterDetail`: a "Penalty Fee" card showing status (Pending / Billed on
  INV-2026-xxxx, linked / Waived with reason) and a **Waive fee** button
  opening a small reason modal.
- `ClientProfile`: pending charges shown in the billing area so unbilled
  amounts are visible before the next invoice is raised.
- Optional: a small "Unbilled charges" figure on the Dashboard.

**Files:** `src/data/store.tsx`, `src/pages/matters/MatterDetail.tsx`,
`src/pages/clients/ClientProfile.tsx`,
`src/components/modals/WaiveChargeModal.tsx` (new)

### Phase 5 — Accounting trail (optional)
Post a ledger entry when a penalty is billed (account: *Penalty Income*) so it
shows separately from service revenue in `AccountingPage`, and add a penalty
column/filter to the reports section.

**Files:** `src/data/store.tsx`, `src/pages/accounting/AccountingPage.tsx`

## Edge cases to handle

- **Rule disabled** → no charge, no toggle shown on the matter form.
- **Rule edited later** → pending charges keep their snapshotted amount;
  only new matters use the new amount.
- **Matter status changes or completes** → the charge stays pending until
  billed or waived; it is not tied to matter lifecycle.
- **Client has several pending penalties** → all appear on the next invoice,
  each removable independently.
- **Charge removed from the invoice at creation time** → stays `pending` and
  reappears on the following invoice.
- **Existing localStorage state** → migrated with defaults, never wiped.
- **Duplicate protection** → a matter can only ever own one penalty charge.

## Extending to Tasks

If a standalone `Task` entity arrives later, it needs only the same two
fields (`clientInitiated`, `penaltyChargeId`) and one call into
`addPendingCharge`. Everything downstream — settings, invoice pickup, waiver,
ledger — is already generic over `PendingCharge.kind`.

## Verification (every phase)

- `npx tsc -b` clean for touched files (note: `ClientOnboarding.tsx` and
  `ClientProfile.tsx` carry 9 pre-existing type errors unrelated to this work).
- `npx oxlint src` introduces no new warnings.
- Browser check of the phase's behaviour with zero console errors; for
  Phase 3 specifically, verify a penalty-carrying invoice's total, the
  payment-status calculation, and the client's outstanding-balance figures.
- Update `PROGRESS.md` immediately after a phase is verified, before starting
  the next.
