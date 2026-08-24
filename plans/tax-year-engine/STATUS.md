# Tax Year & Filing Obligation Engine — Execution Status

**Last updated:** 2026-08-24
**Overall:** **8 of 8 phases complete.** The spine is built, onboarding generates
the calendar, the lawyer has a worklist, tax years close and reopen with a trail,
reminders fire on filing deadlines as well as documents, a due return becomes a
matter and then a billed invoice, and the firm can add its own obligations
without a code change.

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
| 5 | Compliance tab + year close/reopen | `phases/PHASE-05-compliance-tab-and-year.md` | **done** | Close blocked at 3 outstanding; reopen needs a reason; audit persists. Output below. |
| 6 | Unified reminder engine | `phases/PHASE-06-reminder-engine.md` | **done** | 21 rules (6 filing + 15 migrated document); T-7 milestone verified by hand; 16 routes, 0 console errors. |
| 7 | Filing → Matter → Invoice chain | `phases/PHASE-07-filing-matter-invoice.md` | **done** | Chain closes end to end; second open navigates, no duplicate; declining leaves the filing pending; 18 routes, 0 console errors. Output below. |
| 8 | Dashboard, vault, settings, cleanup | `phases/PHASE-08-dashboard-and-cleanup.md` | **done** | Custom obligation created and scheduled end to end; built-in edit survives reload; deletion table empty; 25 routes + tabs, 0 console errors. Output below. |

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

## Phase 5 - verified output (2026-08-24)

`tsc -b` clean * lint 13 findings, all pre-existing * **0 console errors** *
`package.json` unchanged.

### Close / reopen rules

```
c1 year header : 4 filings * 1 filed * 3 outstanding
close blocked  : disabled=true
                 "3 filings still outstanding - a year cannot close over unfiled returns."
after filing 3 : close disabled=false
year closed    : badge=Closed | read-only note shown | row actions gone
audit          : "Tax year closed - Tax year 2026"

reopen, blank reason : error "at least 10 characters", modal stays open
reopen with reason   : badge=Open | row actions back
audit                : "Tax year reopened - Tax year 2026
                        'FTA raised a query on the Apr-Jun return and it needs amending'
                        by Sanuma Tax Advisory FZE"

after reload   : still open, 2 audit entries persisted
```

### Registrations

| Case | Result |
|---|---|
| c1 registration card | `Quarterly * Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec`, TRN, effective date, first period, period count |
| c8 (VAT + CT) | 2 cards - `VAT Return`, `Corporate Tax Return` |
| c8 add-registration | offers only `VAT Return (Monthly Filer)`, `Excise`, `ESR Notification`, `ESR Report` - existing two excluded |
| c7 (licence-only) | opens on Overview; Compliance tab shows empty state + Add button |
| Add CT to c7, effective 2025-02-01 | live derivation `01 Feb 2025 - 31 Dec 2025 * due 30 Sept 2026`; 4 periods generated |
| Settings -> Compliance | reason toggle present, with the "that record is not optional" note |

### Follow-up raised

`Client.trn` and `Registration.registrationNumber` now both hold TRNs, and the
profile header can disagree with the registration cards below it. A client with
VAT and Corporate Tax has two real TRNs that one client-level field cannot
express. `Registration.registrationNumber` is the right home; removing
`Client.trn` touches the header, `EditClientModal`, `ClientsList` and the seed,
so it is flagged rather than folded into this phase.

---

## Phase 6 - verified output (2026-08-24)

`tsc -b` clean * lint 13 findings, all pre-existing * 16 routes, **0 console
errors** * `package.json` unchanged.

### Rules page: filing deadlines first, documents migrated

```
total rule rows: 21

VAT Return                  | 5 within the next 90 days       | T-60 T-30 T-15 T-7 On the day  Both
VAT Return (Monthly Filer)  | 3 within the next 90 days       | T-30 T-15 T-7 On the day       Both
Corporate Tax Return        | 3 within the next 90 days       | T-60 T-30 T-15 T-7 On the day  Both
Excise Tax Return           | nothing due in the next 90 days | T-30 T-15 T-7 On the day       Both
ESR Notification            | nothing due in the next 90 days | T-60 T-30 T-7 On the day       Both
ESR Report                  | nothing due in the next 90 days | T-60 T-30 T-7 On the day       Both
Emirates ID                 | 1 within the next 90 days       | T-60 T-30 T-7                  Client
Passport                    | nothing due in the next 90 days | T-90 T-30                      Client
```

6 filing rules first, then 15 migrated document rules. Document milestones left
untouched - a passport genuinely wants 90 days and a VAT return does not.

### The milestone verified by hand

```
Would fire on 24 Aug 2026
  VAT Return May-Jul 2026 is due in 7 days
  Rashid Mart * T-7 * due 31 Aug 2026
```

c3 is the `feb-may-aug-nov` stagger client. Its May-Jul 2026 period is due
31 Aug, which is exactly 7 days from 24 Aug - the T-7 milestone, hit exactly.

### Actions

| Check | Result |
|---|---|
| Log as sent | button becomes disabled **"Sent today"**, badge turns green |
| After reload | still shows "Sent today" - log persists |
| Log row | `VAT Return May-Jul 2026 ... | Mohammed Rashid | May-Jul 2026 | Email | 24 Aug 2026 | sent` |
| Toggle VAT Return rule off | Due Today count 2 -> 1; back on -> 2 |
| Audience = internal | channel picker disabled with an explanation |
| Closed year / filed period | produces no reminders |

### Two defects the browser check caught

1. **The log stamped the wrong date.** A reminder that fired on 24 Aug was
   recorded as `21 Jul 2026` - the seed's frozen `TODAY`. Anyone auditing
   "did we warn them before the deadline" would have read a false date.
2. **Double-send was possible.** After logging a reminder the row still read as
   outstanding, so the same chase could be sent repeatedly. Now marked
   `alreadySentAt` and disabled.

### The frozen-clock bug fixed at the root

Third phase running into `TODAY` vs the real clock. `todayIso()` now lives in
`src/lib/utils.ts` and is the single answer to "what is today"; `TODAY` is purely
a seed-authoring constant. Worth doing before it caused a fourth.

---

## Phase 7 - verified output (2026-08-24)

`tsc -b` clean * lint 13 findings, identical to the pre-change baseline (measured
by stashing) * 18 routes, **0 console errors** * `package.json` /
`package-lock.json` unchanged (Playwright installed `--no-save`, uninstalled
after; npm had rewritten the `name` field, reverted).

### The chain, walked end to end on c3's Aug-Oct 2026 VAT return

c3 is the `feb-may-aug-nov` stagger client, so this is a period no calendar-quarter
model would produce.

```
FILINGS ROW   VAT Return - Aug-Oct 2026 | Rashid Mart | 01 Aug - 31 Oct 2026 | Due 30 Nov 2026

MODAL         title  "Open Matter for Filing"
              reads  Files VAT Return - Aug-Oct 2026
                     Period 01 Aug 2026 - 31 Oct 2026 . due 30 Nov 2026
              client select disabled=true   (set by the filing)
              title  "VAT Return - Aug-Oct 2026"      <- auto-titled
              service VAT Return Filing               <- ObligationType.serviceId
              due     2026-11-30                      <- the FILING due date

MATTER        VAT Return - Aug-Oct 2026
              VAT Return Filing . Opened 24 Aug 2026
              checklist 0/6 done, 6 steps attached

FILING CARD   Filing | Outstanding
              VAT Return - Aug-Oct 2026
              Period 01 Aug 2026 - 31 Oct 2026 . due 30 Nov 2026
              Rashid Mart . tax year 2026        <- links back to the client year

INVOICE       INV-2026-1008 . Issued 24 Aug 2026 . Due 07 Sept 2026
              service: VAT Return Filing = 750
              penalty: Minimum engagement fee   = 250   (c3's pre-existing pc-1)
              subtotal 1000 . VAT 50 . total 1050
```

Persisted record after the walk — both back-links written:

```
matter   { title: "VAT Return - Aug-Oct 2026", serviceId: svc-vat-return,
           dueDate: 2026-11-30, status: completed, steps: 6 }
period   { label: "Aug-Oct 2026", state: filed, filedAt: 2026-08-24,
           matterId: m-..., invoiceId: inv-... }
```

### The checks that had to fail as well as pass

| Check | Result |
|---|---|
| Auto-generated title | `VAT Return — Aug–Oct 2026` (and `Corporate Tax Return — FY 2025` shape for annual) |
| Due date | `2026-11-30` — the filing due date, not the 31 Oct period end |
| Second "Open matter" | row shows a `matter` badge; button reads **Go to matter** and navigates to the *same* id; no modal, no second matter |
| Complete → follow-ups | modal offered; `Mark the filing as filed` ticked by default, `Create the invoice` **not** |
| **Declining** | "Skip for now" → filing still `Outstanding`, still listed on `/filings`. It does not flip anyway. |
| Accepting | filing → `Filed`; invoice modal opens with **1** service pre-ticked (`VAT Return Filing AED 750`) |
| Invoice back-link | `FilingPeriod.invoiceId` set; row gains a `billed` badge; invoice on the client's Invoices tab |
| Reload after each step | matter, filing state, and both links persist |
| Standalone New Matter | title `New Matter`, client select enabled, nothing pre-filled, no filing line — unchanged |
| Revert a filed filing | `filed` → `outstanding`; `matter` and `billed` badges both still present; audit written |
| Console errors | **0** across 18 routes |

Audit entry after the revert:

```
24 Aug 2026
Filing reopened for amendment - Aug-Oct 2026
"Reopened for amendment"
by Sanuma Tax Advisory FZE
```

### Checklist coverage — the gap the phase file asked us to check

Every obligation now resolves to a service that has a template. Excise had no
`serviceId` at all, so a matter opened from an excise return would have had
nothing to bill against:

```
VAT Return                   svc-vat-return        VAT Return Filing
VAT Return (Monthly Filer)   svc-vat-return        VAT Return Filing
Corporate Tax Return         svc-corp-tax-filing   Corporate Tax Return Filing
Excise Tax Return            svc-excise-return     Excise Tax Return Filing   <- added
ESR Notification             svc-esr-report        ESR Notification & Report
ESR Report                   svc-esr-report        ESR Notification & Report
```

`svc-excise-return` (AED 900) and its 6-step template are new; the ESR pair
already shared a template that covers notification and report, so it was left
alone. Because `obligationTypes` is persisted and has no editor until Phase 8,
built-in types are now re-hydrated from code on load — otherwise a tester with
saved state would never see the new `serviceId`.

### Three defects the browser check caught

1. **The penalty fee fired on every scheduled return.** `NewMatterModal` defaults
   to firm-initiated, so opening a matter from the compliance calendar queued a
   `Minimum engagement fee`. `SanumaBusinessFundamentalBn.md` §5 charges that fee
   when the *client's* delay forces the firm to act — a return filed on its own
   schedule is the engagement being performed. Filing-driven matters now default
   to no fee, with a line in the modal saying so; the toggle stays for the case
   where a client really did stonewall.
2. **A return filed today was recorded as filed 21 Jul 2026** — the seed's
   `TODAY`. Same defect Phase 6 fixed for the reminder log, and worse here:
   `filedAt` is the answer to an FTA late-filing penalty.
3. **The invoice was issued before it was created, and due before it was issued.**
   `issueDate` came from `TODAY` (21 Jul) while the filing said 24 Aug, and the
   default `dueDate` was `TODAY + 14` = 4 Aug — a tax invoice dated after its own
   due date. Now 24 Aug / 7 Sept.

### The frozen clock, finished

Phase 6 declared `todayIso()` "the single answer to what is today" and `TODAY`
"purely a seed-authoring constant", but only the reminder log was converted. Two
of the three defects above are the unconverted remainder, so the rule is now
actually applied: **every record the store writes about something that just
happened** — `filedAt`, audit `at`, `closedAt` / `reopenedAt`, invoice
`issueDate`, credit-note `issueDate`, every ledger line, wallet transactions,
pending-charge `createdAt` / `waivedAt`, matter `openedAt` / `completedAt`, quote
and client and registration `createdAt` — plus the "now" defaults in the invoice,
document and expense forms.

Deliberately left on `TODAY`, because they anchor the demo to the year that has
data rather than recording an event:

| Site | Why |
|---|---|
| `currentTaxYear()` → `horizonYear()` | sets how far the generator runs; the seeded filed-history is written against the seed's year, so reading the real clock would generate a different number of periods than the seed marked filed |
| Tax-year `Select` defaults on `/filings`, the Compliance tab, onboarding | opening on the real year would show an empty page once real time crosses into 2027 |

### Not a defect: the AED 250 on the invoice

The invoice carries a second line, `Minimum engagement fee — firm-initiated
matter`. That is c3's seeded `pc-1` (the UBO matter, firm-initiated in the seed)
being picked up by the client's next invoice, exactly as the penalty-fee feature
intends. The filing's own line is `750 + 5% VAT`; the fee is a separate line with
its own VAT treatment.

### Follow-up raised

There is still no test runner, so this phase's chain — like Phase 1's 27 golden
cases — is asserted only by a scratch Playwright script that was deleted. The
`openMatterForFiling` duplicate guard is exactly the kind of invariant a later
phase can break silently.

---

## Phase 8 - verified output (2026-08-24)

Phase 8's own gate is the whole-app pass, not just its own screens: **25 routes
plus every client tab and every settings tab, 0 console errors.** `npm run lint`
13 findings, identical to the baseline, none in any Phase 8 file.
`package.json` / `package-lock.json` unchanged.

`tsc -b` was clean at the time of the browser run. It is **not** clean now, for
reasons outside this phase - see the note at the end.

### Deletion table - every row confirmed empty

```
ComplianceDeadline        0 references
complianceDeadlines       0 references
Recurrence                0 references
businessTypes[].checklist 0 references
```

Phase 2 had already removed these, so this phase verified rather than deleted.
`BusinessType` itself and the suggested-documents mapping are kept, as the phase
file instructs.

### Dashboard

```
greeting          Good afternoon - 24 Aug 2026        (the real date, not the seed's)
tax year row      Tax year 2026 | 9 Filed | 25 Still due | 5 Overdue | All filings ->
store agrees      34 in 2026 = 9 filed + 25 pending + 0 n/a   adds up: true

Upcoming Filings          VAT Return (Monthly Filer) - Apr 2026
                          Hassan Trading Co. * 31 May 2026 * 85d overdue
/filings first row        VAT Return (Monthly Filer) - Apr 2026
                          Hassan Trading Co. * Due 31 May 2026 * 85d overdue    <- same row

Needs Chasing Today       VAT Return May-Jul 2026 is due in 7 days
                            Rashid Mart * T-7 * to send
                          VAT Return (Monthly Filer) Jul 2026 is due in 7 days
                            Hassan Trading Co. * T-7 * to send
```

The internal-reminder card is the only place in the app that answers "what does
the firm have to chase today" - the rules page is organised by rule, so a
milestone landing today is not visible there.

### Document vault calendar

The calendar was hardcoded to `year = 2026, month = 6`. Every filing due outside
July 2026 - which is almost all of them - was invisible on the one view whose job
is to show when things land. Now it opens on the real month and navigates:

```
opens on            August 2026 * 10 due
31 Aug cell         VAT Return - May-Jul 2026 | VAT Return (Monthly Filer) - Jul 2026
3x next month       November 2026 * 3 due
30 Nov cell         VAT Return - Aug-Oct 2026 | VAT Return (Monthly Filer) - Oct 2026
"Today"             returns to August 2026
```

Those two cells are the point of the phase: `31 Aug` and `30 Nov` are the due
dates of c3's staggered `feb-may-aug-nov` VAT returns, landing on the right days
next to document expiries.

### Obligation catalog - the full custom path, end to end

Settings -> Compliance now lists the catalog with its generating rules:

```
VAT Return                 built-in  Quarterly * Jan-Mar, Apr-Jun...  Last day of following month   5 registrations
VAT Return (Monthly Filer) built-in  Monthly * calendar month         Last day of following month   1 registration
Corporate Tax Return       built-in  Annual * FY ends December        9 months after period end     4 registrations
Excise Tax Return          built-in  Monthly * calendar month         15th of the following month   unused
ESR Notification           built-in  Annual * FY ends December        6 months after period end     unused
ESR Report                 built-in  Annual * FY ends December        12 months after period end    unused
```

Then the phase file's end-to-end case - create "Municipality Return", quarterly,
28th of the following month, and attach it to a client:

```
CREATED   {"name":"Municipality Return","shortName":"MUN","periodicity":"quarterly",
           "dueRule":{"kind":"day-of-next-month","day":28},"builtIn":false,
           "staggerOptions":[all three],"defaultReminderDays":[30,15,7,0]}
          reminder rule auto-created * days [30,15,7,0] * audience both

OFFERED   c7's registration picker: VAT Return, VAT Return (Monthly Filer),
          Corporate Tax Return, Excise Tax Return, ESR Notification, ESR Report,
          Municipality Return                                    <- appears with no code change

DERIVED   live in the dialog: First period 01 Feb 2026 - 31 Mar 2026
                              first return due 28 Apr 2026

GENERATED 8 periods
          Jan-Mar 2026  2026-02-01..2026-03-31  due 2026-04-28   <- stub first period
          Apr-Jun 2026  2026-04-01..2026-06-30  due 2026-07-28
          Jul-Sep 2026  2026-07-01..2026-09-30  due 2026-10-28
```

### Delete and edit constraints

| Case | Result |
|---|---|
| Delete a built-in | disabled - *"Built-in obligations cannot be deleted"* |
| Delete an unused custom | enabled |
| Delete a custom now in use | disabled - *"1 registration still use this"*; the table's **In use** column shows the same count |
| Edit a custom's due rule with 1 registration | warning shown, then due dates moved `28 Apr 2026` -> `31 Dec 2026` (28th-of-next-month -> 9-months-after) |

### Editing a built-in - filed history untouched

The plan's **open decision #2** was whether VAT is due on the 28th or the last
day of the following month. It is now a setting, not a code change. Switching
`VAT Return` to the statutory 28th, with 87 filed periods on the books:

```
rule now          {"kind":"day-of-next-month","day":28}
filed count       87 -> 87                unchanged
filed dates       fp-reg-1-2019-01-15  2019-01-15..2019-03-31  due 2019-04-30   unchanged
                  fp-reg-1-2019-04-01  2019-04-01..2019-06-30  due 2019-07-31   unchanged
pending moved     Apr-Jun 2026 due 2026-07-28
                  Jul-Sep 2026 due 2026-10-28
                  Oct-Dec 2026 due 2027-01-28
```

Filed periods keep the dates they were filed under - those are what went to the
authority. Phase 2's locking rule did the work; this phase only had to route the
catalog edit through it.

### One defect the browser check caught

**A built-in edit was silently reverted on every reload.** Phase 7 added
`hydrateObligationTypes` with seed-wins precedence, so that a built-in gaining a
new field in code would reach saved state. Once Phase 8 made built-ins editable
that precedence became wrong: a firm changing the VAT due rule would find it
reset on refresh, with no error to explain it. The merge is now field-level with
stored winning, so both hold - a firm's edit survives, and a field the code adds
later still arrives. Verified after reload:

```
built-in edit survived hydration: {"kind":"day-of-next-month","day":28}
catalog size 7 * custom kept true
```

### Two design notes

- **Changing a type's `periodicity` had to move its registrations too.** A
  `Registration` stores its own periodicity, copied at creation, and
  `generateFilingPeriods` reads it from there - so patching only the catalog
  would have left the table saying *monthly* while every schedule quietly stayed
  quarterly. The cascade re-derives each affected registration's first period and
  regenerates in a single state update.
- **The fixed-day due rule is clamped to 28.** A rule saying "the 31st" silently
  means the 30th in April and the 28th in February; the only honest fixed day is
  one that exists in every month.

### Not clean at hand-off: `tsc -b` — since repaired, see the section below

There are 34 remaining `tsc` errors and 19 extra lint findings, **none in Phase 8
code**. They are in work being done in parallel in this same tree, in files this
phase did not touch: `ClientTimelineTab.tsx` (11), `DocumentPreviewModal.tsx`
(5), `FtaSubmissionModal.tsx` (2), plus `store.tsx` (7) where `AuditEntry` gained
a required `actor` field that the existing `addAuditEntry` call sites do not yet
pass, and unused-import errors in `FilingsPage.tsx` / `ClientComplianceTab.tsx`
left by an in-progress `markFilingFiled` refactor.

Phase 8's own code typechecked cleanly, and the browser pass above ran green,
before those edits landed. The build needs that parallel work finished before
`tsc -b` is green again - it is not a Phase 8 regression, and it should not be
fixed by guessing at someone else's half-written feature.

---

## Build repaired after Phase 8 (2026-08-24)

The Phase 8 note below records `tsc -b` failing with 29 errors from parallel work
in this tree. Those are fixed. **`tsc -b` clean · `npm run build` succeeds ·
lint 14 · 22 routes + every tab, 0 console errors.**

Most were dead imports, but three were real bugs that would have shipped:

### 1. Audit entries could be written with no actor

`addAuditEntry` was typed `Omit<AuditEntry, 'id' | 'at'>`, making `actor`
mandatory, while its body read `actor: input.actor || activeStaff.name` — so the
intent was clearly that callers may omit it. Four call sites did
(`registration-edited`, `year-closed`, `year-reopened`, `filing-reverted`), and
none of them compiled.

Worse, the object spread ran `actor:` **before** `...input`, so on the paths that
did compile an omitted `actor` overwrote the resolved name with `undefined`
(TS2783). An audit trail that cannot say who did something is not an audit trail.

Signature is now `Omit<AuditEntry, 'id' | 'at' | 'actor'> & { actor?: string }`,
the spread order is fixed, and `actor` is passed only to attribute an act to
someone other than the signed-in user. Verified across all five actions:

```
registration-edited    actor="Adv. Muhammad Hannan"  at=2026-08-24T14:20:00
filing-submitted       actor="Adv. Muhammad Hannan"  at=2026-08-24T14:20:02
year-closed            actor="Adv. Muhammad Hannan"  at=2026-08-24T14:20:06
year-reopened          actor="Adv. Muhammad Hannan"  at=2026-08-24T14:20:08
                       note="FTA raised a query on the Apr-Jun return..."

entries missing an actor: 0        valid timestamps: 6/6
```

### 2. The client timeline showed the wrong invoice amount

`ClientTimelineTab` summed `i.lines.reduce((s, l) => s + l.amount, 0)`, but
`InvoiceLine` has `qty` and `unitPrice` — there is no `amount`. It now calls
`invoiceTotal(i)`, the helper the rest of the app uses, rather than
reimplementing the total and its per-line VAT rules a second time. The same
component read `CreditNote.issuedAt`, which does not exist either; the field is
`issueDate`.

```
Invoice Issued: #INV-2026-1005 (AED 997.50)     <- was AED 0
Invoice Issued: #INV-2026-1004 (AED 997.50)
NaN / Invalid anywhere on the page: false
```

### 3. Two modals passed props `Modal` did not have

`FtaSubmissionModal` and `DocumentPreviewModal` both passed `subtitle` and
`size="lg"`; `Modal` accepted neither (it had `width`, taking a raw Tailwind
class). Rather than strip the props from the callers, `Modal` gained both, since
a context line under the title is worth having and two callers already wanted it:

- `subtitle?: string` — rendered under the title, truncating
- `size?: 'sm' | 'md' | 'lg' | 'xl'` — named, mapped to a max-width
- `width` kept and still wins when both are given, so existing callers are untouched

```
FtaSubmissionModal    title "Record FTA Return Submission"
                      subtitle "VAT Return — May–Jul 2026"
                      max-w-2xl                          (size="lg")
ObligationTypeModal   max-w-xl, no subtitle rendered     (width="max-w-xl", unchanged)
NewMatterModal        max-w-lg                           (neither prop, default)
```

### The rest

Dead imports and one unused local, removed: `ClientTimelineTab` (8),
`DocumentPreviewModal` (4), `Topbar` (2), `FtaSubmissionModal` (1), `store.tsx`
(1), plus a `markFilingFiled` left destructured but uncalled in `FilingsPage` and
`ClientComplianceTab` after submission moved into `FtaSubmissionModal`.

Lint is 14 rather than the long-standing 13: the extra is a second
`only-export-components` in `store.tsx`, from a non-component export added in
parallel. Same class as the ones `theme.tsx` and `toast.tsx` have always carried.

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

## Plan complete - what the eight phases delivered

The app was document-expiry-first: `ClientDocument.expiryDate` drove everything
and periodic filings were a hardcoded array that never changed and never saved.
It is now year-based UAE tax compliance, with the document side intact.

| Then | Now |
|---|---|
| `complianceDeadlines` - a fake array, excluded from `PersistedState` | `Registration` -> generated `FilingPeriod[]`, persisted, regenerable without touching filed history |
| Quarterly assumed to be calendar Q1-Q4 | Three FTA stagger groups, stub first periods, leap-year clamps - both sample certificates reproduced exactly |
| Onboarding asked "what business type is this" | Onboarding asks "what are we handling, for which year", and produces a two-year calendar from 3 inputs per registration |
| No filings view | `/filings` worklist grouped by urgency; per-client Compliance tab; tax years that close and reopen with an audit trail |
| Reminders watched documents only | One engine over filings and documents, with per-obligation milestones and a send log |
| A due return and a billable matter were unconnected | filing -> matter -> completed matter -> invoice, linked both ways, duplicate-guarded |
| Adding an obligation meant a code change | Settings -> Compliance: add, edit, delete, with registrations rescheduled and filed history protected |

### Both open decisions the client left are now settings, not assumptions

- **Reopening a closed year** (decision #1) - confirm + typed reason + audit
  entry, with the prompt behind a Settings toggle. The audit entry is not
  optional and has no toggle.
- **VAT due date, 28th vs last day** (decision #2) - the ambiguity the plan
  flagged is resolved by making it editable per obligation *and* overridable per
  registration. Phase 8 verified switching `VAT Return` to the statutory 28th
  moves 3 pending periods and leaves 87 filed ones untouched.

### The follow-on plan the phase file asked for is not needed

`PHASE-08` closes by asking for a follow-on plan covering **penalty fees** and
the **credit-note historical fee/VAT snapshot** rule from
`SanumaBusinessFundamentalBn.md` §5. Both arrived in parallel work that merged
into this branch, and both are built:

| §5 requirement | Where it lives |
|---|---|
| Minimum fee when the firm must act without the client | `PenaltyFeeRule` + `PendingCharge`, raised in `addMatter` |
| Charge queues and lands on the next invoice automatically | `pendingChargesForClient` -> `NewInvoiceModal` -> `addInvoice` |
| Waivable with a typed reason | `WaiveChargeModal`, `waivePendingCharge` |
| Fee and VAT rate frozen at creation | `PendingCharge.amount` / `.vatApplicable` snapshotted, with the reasoning in the type's doc comment |
| Credit note, never editing an issued invoice | `CreditNote` with its own `amount` / `vatAmount` at issue time |

Writing a plan for this would be planning work that already exists. Phase 7
verified the queue end to end (an AED 250 seeded charge riding onto
`INV-2026-1008` alongside a `750 + 5% VAT` service line, each with its own VAT
treatment), and corrected one real bug in it along the way: the fee was firing on
every *scheduled* return, which §5 does not ask for.

**What is genuinely still open** is smaller and different:

1. **No test runner.** Phase 1's 27 golden certificate cases and Phase 7's and
   Phase 8's chain assertions all lived in scratch scripts that were deleted.
   `vitest` is one dev dependency and would make them a permanent gate. It is a
   dependency decision, so it has not been taken unilaterally - and it is the
   single highest-value thing left.
2. **`Client.trn` duplicates `Registration.registrationNumber`.** Raised in
   Phase 5 and still true: a client with VAT and Corporate Tax has two real TRNs
   that one client-level field cannot express, and the profile header can
   disagree with the registration cards below it.
3. **The seed's frozen `TODAY` still anchors picker defaults** - the tax-year
   selects and `currentTaxYear()`. Deliberate, so the demo opens on a year that
   has data, but it will need a decision before real use. Every *record* the
   store writes now uses the real clock.

---

## Blocked on / awaiting client input

Nothing blocking, and nothing left to block: all eight phases are done.

Both decisions the client explicitly left open were shipped as **settings**
rather than baked-in assumptions, so neither needs an answer before the work is
usable - but both are worth confirming, because the defaults are guesses:

| Decision | Default shipped | Where the client changes it |
|---|---|---|
| Reopen a closed tax year - prompt for a reason? | on | Settings -> Compliance -> Tax Year Controls |
| VAT due date - 28th, or last day of the following month? | last day | Settings -> Compliance -> edit `VAT Return`; also overridable per registration |

The VAT one still matters: getting it wrong shifts every VAT due date in the
system by two days. It is now a two-click fix rather than a code change, so the
question is worth asking rather than assuming - but it is no longer a risk.

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
