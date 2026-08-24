# What We Are Changing — Short Summary

One-page version. Full detail in `PLAN.md`, per-phase detail in `phases/`,
live progress in `STATUS.md`.

---

## The new requirement, in one line

The system's focus moves from **"track document expiry dates"** to
**"run a client's UAE tax year"** — a registration is entered once, and the
system generates every filing period, due date, and reminder that follows
from it, year after year.

## What the client asked for

| # | Requirement | Where it lands |
|---|---|---|
| 1 | Built for a lawyer handling year-based UAE VAT / Corporate Tax / natural-person tax | Whole plan; spine is Phase 1–2 |
| 2 | Collect the client's registration info once, then the system handles the schedule | Phase 1, 2, 3 |
| 3 | VAT registration = 4 filings/year, and the period date-range must be recorded at entry | Phase 1 (generator), Phase 3 (entry) |
| 4 | Corporate Tax registration = 1 filing/year | Phase 1 (annual + 9-month due rule) |
| 5 | "There are more custom types like this" | Phase 1 + 8 — obligations are an **editable catalog**, not hardcoded |
| 6 | At onboarding, capture which work we're doing → date ranges auto-generate | Phase 3 (steps 2–4) |
| 7 | Notify before expiry and before the renewal date arrives | Phase 6 (T-60/30/15/7/D-Day, client + internal) |
| 8 | Take documents at client-add time | Phase 3 (certificate attach per registration) |
| 9 | Work is added **per year**; a year can be reopened later, with or without confirmation | Phase 5 (`ClientYear`, close/reopen) |
| 10 | **Keep it simple — not too many inputs** | Phase 3: mandatory input unchanged, output far larger — see below |

## Why the current code can't do this

`complianceDeadlines` in `src/data/mockData.ts` is a hardcoded array of 8
rows. There is no `addComplianceDeadline` in the store, and it is excluded
from `PersistedState` — so it never changes and never saves. Periodic filings
are, today, decoration. Everything real is driven off
`ClientDocument.expiryDate`.

## Three domain facts the two sample certificates proved

Taken from the real VAT (TRN 104877501700003) and Corporate Tax
(TRN 104877501700001) certificates:

1. **UAE quarterly VAT is staggered, not calendar Q1–Q4.** The sample is the
   Feb–Apr / May–Jul / Aug–Oct / Nov–Jan group. The FTA assigns one of three.
   Assuming Jan–Mar is wrong for roughly two thirds of clients.
2. **The first period is a stub.** It runs from the effective registration
   date to the end of the first assigned period. The CT sample's first period
   is 11 months (01/02/2025 – 31/12/2025).
3. **Due dates are per-obligation, not one global rule.** VAT: last day of
   the month after period end (31/10 → 30/11). Corporate Tax: 9 months after
   period end (31/12/2025 → 30/09/2026).

## What gets built

New spine: `Registration` → **generated** `FilingPeriod[]`, plus an editable
`ObligationType` catalog and a `ClientYear` record for the per-year
open/close/reopen requirement.

```
Client
 └─ Registration (VAT / Corporate Tax / Excise / custom…)
      · TRN, effective date, cycle
      └─ FilingPeriod[]   ← generated, never typed by hand
           · period start, period end, due date, tax year
           └─ Matter → Invoice   (existing entities, newly wired)
```

## What gets deleted

- `ComplianceDeadline` type, the `complianceDeadlines` seed array, and its
  four read sites (`Dashboard`, `ClientProfile`, `DocumentVault`, `store`).
- The `Recurrence` type it depended on.
- The mandatory business-type step in onboarding (demoted to optional).

## What stays untouched

Invoicing, credit notes, expenses, accounting, referral wallet, matters
kanban, document vault mechanics. This plan adds a spine and wires existing
modules to it — it does not rewrite billing.

## The "keep it simple" answer

Onboarding today: **4 steps**, business type + document checklist, and it
generates **no schedule at all**.

Onboarding after Phase 3: **still 4 steps**, and it generates the whole
filing calendar.

| Step | Inputs |
|---|---|
| 1. Client | name, business name, phone, email (+ inline optional "referred by") |
| 2. What we handle | tax-year picker + obligation toggle chips — **2 clicks** |
| 3. Registration details | **max 3 fields per obligation**: TRN, effective date, cycle (pre-picked) |
| 4. Confirm schedule | **zero inputs** — read-only preview of the generated periods |

**Measured after Phase 3 landed:** mandatory input is *unchanged* — 2 typed
fields (name, phone) plus one click, before and after. The old flow's third
mandatory item was picking a business type; the new flow's is picking what you
handle. Same cost to the lawyer, and the system now knows the client's next two
years of deadlines instead of nothing.

(An earlier draft of this file claimed the count went *down*. It does not — the
count is equal. What changed is what you get for it.)

## Deliberately out of scope

Penalty-fee auto-charging and the credit-note historical fee/VAT snapshot
rules from `SanumaBusinessFundamentalBn.md`. Both are real and already
specified there — they belong to the next plan, not this one. Folding them in
would turn one plan into two.

## Open decisions

Six, all with a recommended default so nothing blocks Phase 1. See the table
at the end of `PLAN.md`. The two the client explicitly left open:

- **Reopen a closed tax year — confirmation or not?** Recommended: yes,
  confirm + typed reason + audit entry, with a Settings toggle to relax it.
- **VAT due date — 28th or last day of the following month?** Recommended:
  read it from the certificate, default to last-day, allow a per-registration
  override. Never hardcode.
