# Phase 7 — Filing → Matter → Invoice Chain

**Status:** done · **Depends on:** Phase 1, 2, 4 · **UI changes:** modal + matter detail

Wiring, not new machinery. Matters, checklists, services and invoices all
already exist and work; this phase connects them to the filing spine so a due
return becomes billed work in a few clicks.

---

## Files

- `src/data/store.tsx` — `openMatterForFiling`, completion hook (edit)
- `src/components/modals/NewMatterModal.tsx` — accept a filing period (edit)
- `src/pages/matters/MatterDetail.tsx` — filing link + mark-filed (edit)
- `src/data/matterChecklists.ts` — no change expected; verify coverage

---

## The chain

```
FilingPeriod (due)
   → Open matter        auto-titled, checklist attached, dueDate = filing dueDate
   → Work the checklist (existing MatterDetail, unchanged)
   → Complete matter    → FilingPeriod.state = 'filed'
   → Create invoice     → FilingPeriod.invoiceId
```

## Auto-titling

`ObligationType.serviceId` (seeded in Phase 2) is the join. Opening a matter
from a filing period:

```ts
openMatterForFiling(filingPeriodId: string) => Matter
```

- `title` = `"{obligationType.name} — {period.label}"` →
  *"VAT Return — Aug–Oct 2026"*, *"Corporate Tax Return — FY 2025"*
- `serviceId` = `obligationType.serviceId`
- `dueDate` = `period.dueDate` (not the period end — the deadline is what the
  kanban and the matters list sort on)
- `checklist` = `defaultChecklistForService(serviceId)` — already exists
- writes `FilingPeriod.matterId` back

The existing templates in `matterChecklists.ts` already cover
`svc-vat-return` (6 steps) and `svc-corp-tax-filing` (6 steps). Verify each
seeded `ObligationType.serviceId` resolves to a template; add templates only
for obligations that have none (excise, ESR report), and keep them in the same
file and style.

Guard against duplicates: if `period.matterId` is already set, the action
navigates to the existing matter instead of creating a second one. Two matters
for one return means two invoices for one return.

## `NewMatterModal`

Add an optional `filingPeriodId` prop. When present:

- client, service, title and due date arrive pre-filled and the title field
  stays editable (a lawyer may want *"VAT Return — Aug–Oct 2026 (amended)"*)
- a small read-only line shows the period being filed, so the modal states
  what it is about
- on submit, route through `openMatterForFiling` rather than `addMatter`

When absent the modal behaves exactly as it does today — the standalone
"New Matter" path from `MattersList` must not change.

## Completion

In `MatterDetail`, when status flips to `completed` and the matter has a
linked filing period, offer — do not perform — two follow-ups:

1. **Mark the filing as filed** — checked by default. A completed VAT return
   matter almost always means the return went in.
2. **Create the invoice** — opens the existing `NewInvoiceModal` pre-filled
   from the service price, and back-links `FilingPeriod.invoiceId`.

Offer rather than auto-run: a matter can be completed because it was abandoned
or handled elsewhere, and silently telling the FTA-facing record that a return
was filed is the one mistake in this chain that cannot be walked back from
memory.

The reverse link matters too — `MatterDetail` gains a line linking back to the
filing period and its client year, so someone opening a matter cold can see
which return it belongs to.

## Reopening a filing

If a filing marked `filed` needs correcting (an amended return), allow
reverting it to `pending` from the Phase 5 compliance tab. It writes an audit
entry, keeps `matterId` and `invoiceId` intact, and — per Phase 2's locking
rule — the period stays locked against regeneration. Amended returns are
routine; needing to delete and re-enter a period to file one is not.

---

## Verification

- `npx tsc -b`, `npm run lint` clean.
- From the Filings page, open a matter on c3's Aug–Oct 2026 VAT return:
  title is *"VAT Return — Aug–Oct 2026"*, service is VAT Return Filing, due
  date matches the filing due date, and the 6-step checklist is attached.
- The same action a second time navigates to the existing matter — no
  duplicate created.
- Complete the matter → both follow-ups offered → accepting marks the filing
  `filed` and the row moves group on the Filings page.
- Declining the follow-ups leaves the filing `pending` — verify it does not
  flip anyway.
- Create the invoice → `FilingPeriod.invoiceId` set, invoice appears on the
  client's Invoices tab with the correct AED amount and 5% VAT.
- Standalone "New Matter" from `MattersList` still works unchanged.
- Revert a filed filing → audit entry written, matter and invoice links
  preserved.
- Reload after each step; everything persists.
- Zero console errors.

## Out of scope

Penalty charges on late client submissions, the credit-note snapshot rule —
both specified in `SanumaBusinessFundamentalBn.md` and both deliberately left
to the next plan.
