# Tax Year & Filing Obligation Engine — Execution Status

**Last updated:** 2026-08-24
**Overall:** **4 of 8 phases complete** — the spine is built, onboarding
generates the calendar, and the lawyer has a worklist to run it from.

Also merged `origin/master` (PR #1, Muhammad Hannan) into this line of work —
see the merge note below.

Update this file **immediately after each phase is verified**, before starting
the next one. Fill in the Verified column with what was actually checked, not
with "done" — the `matters-scale` plan's `PROGRESS.md` is the model to follow.

---

## Phase status

| # | Phase | File | Status | Verified |
|---|---|---|---|---|
| 1 | Domain model + pure period generator | `phases/PHASE-01-domain-model.md` | **done** | 27/27 golden cases pass; `tsc -b` clean; 0 lint findings in new files. Output below. |
| 2 | Store wiring, seed rewrite, migration | `phases/PHASE-02-store-and-seed.md` | **done** | 223 periods from 10 registrations; 0 `ComplianceDeadline` refs; 12 routes, 0 console errors. Output below. |
| 3 | Onboarding rebuilt around obligations | `phases/PHASE-03-onboarding.md` | **done** | Both sample certificates reproduced through the UI; 3 inputs per registration card; step 4 has 0 inputs; 0 console errors. Output below. |
| 4 | Filings page | `phases/PHASE-04-filings-page.md` | **done** | `/filings` live; filter counts recorded below; 16 routes, 0 console errors. |
| 5 | Compliance tab + year close/reopen | `phases/PHASE-05-compliance-tab-and-year.md` | pending | — |
| 6 | Unified reminder engine | `phases/PHASE-06-reminder-engine.md` | pending | — |
| 7 | Filing → Matter → Invoice chain | `phases/PHASE-07-filing-matter-invoice.md` | pending | — |
| 8 | Dashboard, vault, settings, cleanup | `phases/PHASE-08-dashboard-and-cleanup.md` | pending | — |

Status values: `pending` · `in-progress` · `blocked` · `done`

---

## Phase 1 — verified output (2026-08-24)

Scratch script compiled with the project's own TypeScript and run under node,
then deleted. `tsc -b` clean, `npm run lint` reports **0** findings in
`filingPeriods.ts` / `types.ts` (the 14 remaining warnings are pre-existing
`exhaustive-deps` / `only-export-components` ones untouched by this phase).

```
A. VAT certificate (TRN 104877501700003) — quarterly feb-may-aug-nov, last-day-next-month
  ok   count through 2027
  ok   1 = cert First VAT Return Period + due date
  ok   2 year-straddle
  ok   3
  ok   4
  ok   5
  ok   6 leap clamp Feb 2028 = 29
  ok   deterministic id
  ok   state pending

B. Corporate Tax certificate (TRN 104877501700001) — annual FY Dec, +9 months
  ok   count
  ok   1 = cert 11-month stub + "31 Sep" clamps to 30 Sep
  ok   2 full year

C. Excise — monthly, 15th of next month
  ok   1
  ok   rest of 2026
  ok   Dec 2026 -> due 15 Jan 2027

D. deriveFirstPeriod
  ok   mid-period: starts on effective date, not 1 Aug
  ok   matches VAT cert
  ok   matches CT cert (11-month stub)
  ok   Jan eff: containing period began last Nov

E. Statutory 28th-day VAT rule
  ok   due 28 Nov not 30 Nov

F. Deregistration, labels, expiry
  ok   stops at the period containing deregistration
  ok   last is Feb-Apr 2027
  ok   stagger label A
  ok   stagger label B
  ok   stagger label C
  ok   labelForPeriod direct (Dec-Feb straddle)
  ok   expiry generates nothing

27 passed, 0 failed
```

The two rows that matter most, because they are the certificates themselves:

| Source | Certificate says | Generator produced |
|---|---|---|
| VAT cert, first return period | 01/08/2026 – 31/10/2026, due 30/11/2026 | `2026-08-01` – `2026-10-31`, due `2026-11-30` |
| CT cert, first tax period | 01/02/2025 – 31/12/2025, due 30/09/2026 | `2025-02-01` – `2025-12-31`, due `2026-09-30` |

### One bug the golden cases caught

`dueDateFor` written as a `switch` over the `DueRule` union failed to compile —
TypeScript would not accept it as exhaustive (TS2366, *"function lacks ending
return statement"*). Rewritten as sequential `if` returns. Had this shipped
behind a non-strict build it would have returned `undefined` for one rule kind.

### Follow-up worth raising with the client

This generator now has 27 assertions that exist only in a deleted scratch file.
Every later phase can silently break it. The project has **no test runner** —
adding `vitest` would be ~1 dev dependency and would make these cases a
permanent regression gate. Not done unilaterally; it is a dependency decision
for the client.

---

## Phase 2 — verified output (2026-08-24)

`tsc -b` clean · `npm run lint` 13 findings, **none** in any file this phase
touched (all pre-existing `exhaustive-deps` / `only-export-components`) ·
`grep -rn "ComplianceDeadline|complianceDeadlines|Recurrence" src/` → **0** ·
`package.json` / `package-lock.json` unchanged (Playwright installed with
`--no-save` and uninstalled after).

### Generated from the seed

```
TODAY=2026-07-21  horizon through 2027
registrations: 10   filing periods: 223
state: filed 159 · pending 64 · not-required 0

reg-1    Al Falasi Grocery LLC       VAT     first 2019-01-15..2019-03-31  total  36  2026: 4
reg-3    Rashid Mart                 VAT     first 2021-05-01..2021-07-31  total  26  2026: 4
reg-5    Khan F&B Ventures           VAT     first 2022-03-01..2022-05-31  total  23  2026: 4
reg-2    Hassan Trading Co.          VAT-M   first 2020-04-01..2020-04-30  total  93  2026: 12
reg-9    Nasser Grocery & Supermark  VAT     first 2026-07-20..2026-09-30  total   6  2026: 2
reg-4    Deira Fresh Grocery         CT      first 2025-01-01..2025-12-31  total   3  2026: 1
reg-6    Al Barsha Retail            CT      first 2025-02-01..2025-12-31  total   3  2026: 1
reg-8a   Salem Trading LLC           VAT     first 2021-01-01..2021-03-31  total  28  2026: 4
reg-8b   Salem Trading LLC           CT      first 2025-01-01..2025-12-31  total   3  2026: 1
reg-10   Priya Sharma                CT      first 2026-01-01..2026-12-31  total   2  2026: 1

Unique ids: 223 of 223 — ids are deterministic, so regeneration is idempotent
```

### Rendered in the browser (12 routes, 0 console errors)

Routes checked: `/` `/clients` `/clients/c1` `/clients/c3` `/clients/c6`
`/clients/c7` `/clients/c9` `/documents` `/matters` `/sales/invoices`
`/accounting` `/referrals` `/reminders` `/settings`

| Case | What must be true | Rendered |
|---|---|---|
| c6 Corporate Tax | 11-month stub, due 30 Sep 2026 — the sample certificate | `Corporate Tax Return — FY 2025 · annual · Due 30 Sept 2026` |
| c3 stagger `feb-may-aug-nov` | never calendar Q1–Q4 | `May–Jul 2026`, `Aug–Oct 2026`, `Nov 2026–Jan 2027`, `Feb–Apr 2027` |
| c3 leap clamp, in the UI | 31 Jan → Feb 2027 has 28 days | `Nov 2026–Jan 2027 · Due 28 Feb 2027` |
| c9 stub first period | starts on the effective date, not the 1st | `Jul–Sep 2026` from `2026-07-20` |
| c1 registered 2019 | outstanding only, not 36 rows of history | `29 filed` + 7 outstanding |
| c7 licence-only | no registrations, no crash | `No outstanding filings.` |
| Document Vault | real filing deadlines on the unified list | 64 filing rows = the pending count |
| Dashboard | real overdue filings | `VAT Return (Monthly Filer) — Apr 2026 · Hassan Trading Co. · 31 May 2026` |

### Two defects the browser check caught

1. **The seed opened with a lie.** 161 of 223 periods generated as `pending`,
   because a 2019 registration produces seven years of periods. The dashboard
   would have claimed ~160 overdue filings for a practice that is up to date.
   Fixed with `applySeedFilingHistory()`; one registration keeps a deliberate
   lapse so `overdue` is still exercised.
2. **Repointing the client profile one-for-one was a regression.** It listed
   every period back to `VAT Return — Jan–Mar 2019` — 36 rows where there had
   been 1. Now outstanding-only with a filed count in the header.

### Pre-existing issue found, not fixed

`urgencyFromDate()` measures against the real system clock while the seed's
`TODAY` is frozen at `2026-07-21`, so the demo data drifts as real time passes.
Not introduced here — the document seed has the same drift (c1's trade licence
carries a hardcoded `status: 'expiring'` and renders "23d overdue"). Fixing it
means advancing `TODAY` or making urgency read `TODAY`; both touch every
screen, so it is flagged rather than changed mid-phase.

---

## Phase 3 — verified output (2026-08-24)

`tsc -b` clean · `npm run lint` 13 findings, **none** in any Phase 3 file ·
`package.json` unchanged.

### Both certificates entered through the wizard

```
STEP 1 required fields: 2 -> Full name * | Phone / WhatsApp *

STEP 2 chips: VAT Return 4 returns per year | VAT Return (Monthly Filer) 12 |
              Corporate Tax Return 1 | Excise Tax Return 12 |
              ESR Notification 1 | ESR Report 1

STEP 3  VAT Return = 3 inputs  |  Corporate Tax Return = 3 inputs
  VAT derivation: First period 01 Aug 2026 - 31 Oct 2026 - first return due 30 Nov 2026
  CT  derivation: First period 01 Feb 2025 - 31 Dec 2025 - first return due 30 Sept 2026

STEP 4 inputs: 0
  headline: 8 filings scheduled - first due 30 Sept 2026.
    Aug-Oct 2026        01 Aug 2026 - 31 Oct 2026   Due 30 Nov 2026
    Nov 2026-Jan 2027   01 Nov 2026 - 31 Jan 2027   Due 28 Feb 2027
    Feb-Apr 2027        01 Feb 2027 - 30 Apr 2027   Due 31 May 2027
    May-Jul 2027        01 May 2027 - 31 Jul 2027   Due 31 Aug 2027
    Aug-Oct 2027        01 Aug 2027 - 31 Oct 2027   Due 30 Nov 2027
    FY 2025             01 Feb 2025 - 31 Dec 2025   Due 30 Sept 2026
    FY 2026             01 Jan 2026 - 31 Dec 2026   Due 30 Sept 2027
    FY 2027             01 Jan 2027 - 31 Dec 2027   Due 30 Sept 2028

SUCCESS: Compliance calendar created - 8 filings scheduled across
         2 registrations, tax year 2026 opened.
```

Rows 1 and 6 are the two certificates, reproduced through the UI rather than in
a test harness. Row 2 is the leap clamp (`28 Feb 2027`).

### Other paths

| Path | Result |
|---|---|
| "No tax registrations yet" | Stepper collapses to 2 steps; client created; *"Added without tax registrations"* |
| Refresh mid-step-3 | Resume banner shown, typed TRN `999888777` preserved |
| Attach certificate | `Corporate Tax Registration Certificate` document created and linked; 3 CT filings on the profile |
| Console errors | **0** across every path |

### Mandatory input — measured, and the earlier claim corrected

| | Old flow | New flow |
|---|---|---|
| Typed mandatory | `name`, `phone` | `name`, `phone` |
| Mandatory clicks | 1 (business type) | 1 (obligation or skip) |
| **Total** | **3** | **3** |
| Schedule produced | none | next 2 years |

`SUMMARY.md` claimed this count went *down*. It did not — it is equal, and the
file has been corrected. Same cost to the lawyer, far more output.

### One defect the browser check caught

Step 4 originally filtered periods to `taxYear === selectedYear`. Entering the
sample Corporate Tax certificate (effective Feb 2025) then displayed **FY 2026**
instead of the FY 2025 period the certificate is about, and the headline said
*"first due 30 Nov 2026"* when the CT return was due 30 Sept 2026 — earlier, and
hidden. Backdated registrations are normal, so `SchedulePreview` now shows the
whole schedule sorted by due date, and the tax year is headline context rather
than a filter.

---

## Merge with origin/master (2026-08-24)

This branch was built on `76d86e0` and had not seen PR #1, so `master` was
3 commits behind and 1 ahead — push was rejected, and `branch.master.*` had no
upstream configured either. **Root cause: no `git fetch` before starting work.**
Check `git status -sb` against the remote before beginning a phase.

Both lines of work were kept in full. 28 of 31 files auto-merged; three
conflicts:

| File | Resolution |
|---|---|
| `store.tsx` | union — registration/filing actions + `PendingCharge` / `clientInitiated` |
| `ClientProfile.tsx` | `filingPeriods` (this plan deletes `complianceDeadlines`) + `pendingChargesForClient` |
| `ClientOnboarding.tsx` | both sides had rewritten it — see below |

`ClientOnboarding.tsx` had 11 conflicts because both rewrites landed in the same
file. Rather than hand-splice 212 lines of nested JSX, the referrer /
sub-referrer UI from `origin/master` was extracted verbatim into
`src/components/onboarding/ReferralPicker.tsx` and hosted inside step 1 of the
obligation wizard. Their UAE `PhoneInput` and `isUaeMobile` gate were kept on the
phone field. Nothing from either side was dropped.

Verified after merge: phone validation rejects a malformed number and blocks
Continue; the Level 1 bonus line and sub-referrer suggestion chips render; and
the sample VAT certificate still yields `01 Aug – 31 Oct 2026, due 30 Nov 2026`.

Note: `plans/penalty-fee/` arrived with the merge — that is the penalty-fee work
this plan explicitly deferred, being done in parallel. No overlap.

---

## Phase 4 — verified output (2026-08-24)

`tsc -b` clean · lint 13 findings, all pre-existing · 16 routes, **0 console
errors** · `package.json` unchanged.

```
TILES   Outstanding 25 · Overdue 5 · Filed 9 · Total in year 34
YEAR    one Select, 2027…2019, default 2026
GROUPS  Overdue 5 | Due within 30 days 2 | Next 90 days 6 | Later 12 | Filed 9
```

### Filter counts (base 25 visible rows in 2026)

| Filter | Result |
|---|---|
| Overdue only | 25 → **5** |
| Client = Hassan Trading | 25 → **9** (monthly filer, 12/yr, 3 filed) |
| Obligation = Corporate Tax | 25 → **4** |
| Search `"Aug"` | 25 → **3** |
| Tax year 2027 | 36 rows, 36 outstanding / 0 filed |
| Tax year 2019 | 0 outstanding / 4 filed — pure history |
| Client = c7 (licence-only) | 0 rows + "No filings match these filters" |

### Actions

| Action | Result |
|---|---|
| Mark filed | row leaves the group (25 → 24) and **persists across reload** |
| Open matter | `NewMatterModal` opens pre-filled; existing matter navigates instead |
| Command palette `"Aug–Oct"` | 3 filing hits |
| Send reminder | rendered **disabled** — Phase 6 wires it, no fake send |

---

## Verification gate for every phase

No phase is `done` until all four pass:

1. `npx tsc -b` clean
2. `npm run lint` clean
3. Browser check of that phase's specific behaviour, zero console errors
4. This file updated with the actual numbers observed

Phase 1 has a fifth gate: the golden certificate cases in
`PHASE-01-domain-model.md` reproduced exactly. Paste the real output into the
Verified column — those two certificates are the specification, and a
generator that is close is a generator that is wrong.

---

## Phase-specific numbers to record

Things worth capturing at the time, because they are the evidence the plan's
claims were met and they are tedious to reconstruct later:

| Phase | Record |
|---|---|
| 1 | Generator output for VAT cert + CT cert, verbatim |
| 2 | Filing period count generated from the seed; confirmation that `tsc` finds zero `ComplianceDeadline` references |
| 3 | **Count of mandatory fields on the happy path** — `SUMMARY.md` claims it went down vs today; prove it |
| 4 | Filter before/after counts (e.g. "overdue only: 47 → 3") |
| 5 | Close-blocked pending count, audit entry text after a reopen |
| 6 | One reminder milestone verified by hand against a known due date |
| 7 | Auto-generated matter title, and that a second open navigates instead of duplicating |
| 8 | Whole-app console-error pass; the deletion table confirmed empty |

---

## Blocked on / awaiting client input

Nothing blocking. Every open decision in `PLAN.md` has a recommended default,
so Phase 1 can start immediately.

Two decisions should be **confirmed with the client before their phase lands**,
since these are the ones the client explicitly left open:

| Decision | Needed before | Recommended default |
|---|---|---|
| Reopen a closed tax year — confirmation or not? | Phase 5 | With confirmation + typed reason + audit entry, as a Settings toggle |
| VAT due date — 28th or last day of the following month? | Phase 1 | Read from certificate; default last-day; per-registration override |

The second one only affects a default value, so Phase 1 is not blocked on it —
but getting it wrong quietly shifts every VAT due date in the system by two
days, so it is worth asking rather than assuming.

---

## Notes for whoever resumes this

- Read `SUMMARY.md` first (one page, what and why), then the phase file for
  the first `pending` row above. `PLAN.md` is the index and holds the domain
  rules table.
- Phases are ordered by dependency, not by size. Phases 1 and 2 have no
  visible UI at all — that is intentional, and it is what makes the generator
  trustworthy before anything renders it.
- **Phase 2 bumps the localStorage key**, so anyone testing loses their local
  demo data at that point. Mention it when handing over.
- Do not fold the penalty-fee or credit-note-snapshot rules from
  `SanumaBusinessFundamentalBn.md` into this plan. They are real requirements
  and they are the next plan — pulling them in turns eight phases into
  fourteen.
