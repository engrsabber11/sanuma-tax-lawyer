# Tax Year & Filing Obligation Engine — Plan Index

Index and domain reference for this plan. Start here, then follow the phase
files in order.

| File | What it is |
|---|---|
| `SUMMARY.md` | One page: the new requirements and what changes. **Read first.** |
| `PLAN.md` | This file — context, domain rules, phase index, open decisions |
| `STATUS.md` | Live phase status. Update after every verified phase. |
| `phases/PHASE-01…08` | One executable file per phase |

---

## Context

The app was built document-expiry-first: `ClientDocument.expiryDate` drives
everything, and periodic tax filings are faked by a hardcoded array —
`complianceDeadlines` in `src/data/mockData.ts`. There is no
`addComplianceDeadline` in the store and it is excluded from
`PersistedState`, so it never changes and never saves. Periodic filings are,
today, decoration.

The client's practice is the opposite way round. The primary job is
**year-based UAE tax compliance**: a client registers for VAT or Corporate
Tax, and that single registration mechanically produces a *schedule* of
filing periods for years to come — 4 per year for VAT, 1 per year for
Corporate Tax — each with its own period start, period end, and due date. The
lawyer's day is driven by that schedule and by notifying clients before each
date lands.

So this is not a new page. It is a new spine: a `Registration` entity whose
filing periods are **generated**, replacing the fake deadlines, with
onboarding rebuilt around "what are we handling for this client, for which
year" instead of "what business type is this".

The hard constraint from the client shapes every phase:
**fewer inputs, not more.** The system should know more while the lawyer types
less. Every field added must be justified by a schedule it generates.

---

## What the two sample certificates specify

The firm's own FTA certificates are the specification for the generator.

**VAT Registration Certificate** — TRN 104877501700003

| Field | Value |
|---|---|
| Effective Registration Date | 01/08/2026 |
| First VAT Return Period | 01/08/2026 – 31/10/2026 |
| VAT Return due date | 30/11/2026 |
| Start and end dates of Tax periods | 1 Feb–30 Apr, 1 May–31 Jul, 1 Aug–31 Oct, 1 Nov–31 Jan |

**Corporate Tax Registration Certificate** — TRN 104877501700001

| Field | Value |
|---|---|
| Effective Registration Date | 01/02/2025 |
| Corporate Tax Period | January – December |
| First CT Period | 01/02/2025 – 31/12/2025 |
| First CT Return Filing Due Date | 30/09/2026 |

Three facts fall out of those, and the current data model can represent none
of them:

1. **UAE quarterly VAT is staggered, not calendar Q1–Q4.** The FTA assigns one
   of three stagger groups. This certificate is the Feb/May/Aug/Nov group. A
   model assuming Jan–Mar / Apr–Jun is wrong for roughly two thirds of
   clients.
2. **The first period is a stub.** It runs from the effective registration
   date to the end of the first assigned period — not a full quarter or year.
   The CT sample's first period is 11 months.
3. **Due dates are per-obligation, not one global rule.** VAT here is the last
   day of the month following period end (31/10 → 30/11); Corporate Tax is
   9 months after period end (31/12/2025 → 30/09/2026).

Phase 1 treats both certificates as golden test cases. A generator that
reproduces them is correct; one that is close is wrong.

---

## Domain rules to encode

Defaults the generator ships with. All live in an editable `ObligationType`
catalog (Phase 1, made editable in Phase 8) so the firm can add its own
without a code change.

| Obligation | Periodicity | Period basis | Due date rule | Renewal? |
|---|---|---|---|---|
| VAT Return (standard) | quarterly | one of 3 FTA stagger groups | last day of month after period end | registration never expires |
| VAT Return (monthly filer) | monthly | calendar month | last day of month after period end | — |
| Corporate Tax Return | annual | financial year (usually Jan–Dec) | 9 months after period end | registration never expires |
| Excise Tax Return | monthly | calendar month | 15th of month after period end | — |
| ESR Notification / Report | annual | financial year | 6 / 12 months after FY end | yes |
| Trade Licence, Ejari, visa, EID | — | issue → expiry | on expiry date | stays a **document**, not an obligation |

Three notes that must show up in copy and defaults, not only in code:

- **"Personal tax"** — the UAE has no personal income tax. In practice this
  means a *natural person* (sole establishment, freelancer) registered for
  Corporate Tax (threshold AED 1M turnover, tax period always the calendar
  year, return due 30 September following) or for VAT. Modelled as one field
  on the client — `personType: 'natural' | 'legal'` — driving defaults. Not a
  separate obligation.
- **The VAT due-date rule is genuinely ambiguous.** The statute says the 28th
  day following the tax period; the sample certificate says 30/11, the last
  day of the following month. Read it from the certificate, default to
  last-day, allow a per-registration override. Never hardcode.
- **Deregistration and stagger changes happen.** A registration needs an end
  date and the ability to change cycle from a given period onward without
  rewriting already-filed history. Phase 2's non-destructive regeneration is
  what makes that safe.

---

## Phases

Ordered by dependency, not by size. Phases 1 and 2 have no visible UI — that
is deliberate, and it is what makes the generator trustworthy before anything
renders it.

| # | Phase | Depends on | Visible? |
|---|---|---|---|
| 1 | [Domain model + pure period generator](phases/PHASE-01-domain-model.md) | — | no |
| 2 | [Store wiring, seed rewrite, migration](phases/PHASE-02-store-and-seed.md) | 1 | no |
| 3 | [Onboarding rebuilt around obligations](phases/PHASE-03-onboarding.md) | 1, 2 | **major** |
| 4 | [Filings page](phases/PHASE-04-filings-page.md) | 1, 2 | new page |
| 5 | [Compliance tab + year close/reopen](phases/PHASE-05-compliance-tab-and-year.md) | 1, 2, 3 | new tab |
| 6 | [Unified reminder engine](phases/PHASE-06-reminder-engine.md) | 1, 2, 4 | reworked page |
| 7 | [Filing → Matter → Invoice chain](phases/PHASE-07-filing-matter-invoice.md) | 1, 2, 4 | modal + detail |
| 8 | [Dashboard, vault, settings, cleanup](phases/PHASE-08-dashboard-and-cleanup.md) | 1–7 | dashboard + settings |

Phase 3 is the one the client will judge the work by. Phase 1 is the one that
determines whether any of it is correct.

---

## Open decisions

Each has a recommended default, so no phase is blocked waiting on an answer.

| # | Question | Recommendation | Needed by |
|---|---|---|---|
| 1 | Reopen a closed tax year — with or without confirmation? | With: confirm + typed reason + audit entry, as a Settings toggle. The audit entry is not negotiable; only the prompt is. | Phase 5 |
| 2 | VAT due date — 28th of following month, or last day? | Read from the certificate; default `last-day-next-month`; per-registration override | Phase 1 |
| 3 | How far ahead should periods be generated? | Current tax year + 1, as a single exported constant | Phase 2 |
| 4 | Keep the business-type step in onboarding? | Demote to optional — it suggests documents, it should not gate onboarding | Phase 3 |
| 5 | Auto-parse uploaded certificates? | Out of scope — no backend, and a wrong parse silently corrupts a two-year schedule | Phase 3 |
| 6 | Penalty fees / credit-note snapshot rules | Real, already specified in `SanumaBusinessFundamentalBn.md` §5, deliberately **not** in this plan — the next plan | after Phase 8 |

---

## Verification (every phase)

1. `npx tsc -b` clean
2. `npm run lint` clean
3. Browser check of that phase's behaviour, zero console errors
4. `STATUS.md` updated with the numbers actually observed, before the next
   phase starts

Phase 1 adds a fifth gate: both golden certificate cases reproduced exactly,
including the Nov–Jan year-straddle, the leap-year clamp, and the 11-month CT
stub period.

There is no test runner in this project. Phase 1's golden cases are asserted
with a scratch script (`npx tsx`) that is deleted afterwards, with the real
output recorded in `STATUS.md`. Adding a test runner is a reasonable follow-up
but is not part of this plan.
