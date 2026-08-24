# Phase 1 — Domain Model + Pure Period Generator

**Status:** DONE (2026-08-24) · **Depends on:** nothing · **UI changes:** none

The load-bearing phase. Everything else in this plan is presentation on top
of the generator built here. No component touches this phase — it is types
plus one pure module, which is why it can be verified exactly.

---

## Goal

Given a registration entered once (TRN, effective date, cycle), produce the
complete list of filing periods and due dates that follow from it — for VAT,
Corporate Tax, Excise, and any custom obligation the firm adds later.

## Files

- `src/data/types.ts` — add the four new entities (edit)
- `src/data/filingPeriods.ts` — the generator (new)

---

## New types

Add to `src/data/types.ts`. Keep the existing export style (plain
`export interface` / `export type`, no namespacing).

```ts
export type Periodicity = 'monthly' | 'quarterly' | 'annual' | 'expiry'

/** Quarterly stagger groups the FTA assigns, named by their period START months. */
export type QuarterStagger =
  | 'jan-apr-jul-oct'   // Jan–Mar, Apr–Jun, Jul–Sep, Oct–Dec
  | 'feb-may-aug-nov'   // Feb–Apr, May–Jul, Aug–Oct, Nov–Jan  ← the sample VAT cert
  | 'mar-jun-sep-dec'   // Mar–May, Jun–Aug, Sep–Nov, Dec–Feb

export type DueRule =
  | { kind: 'last-day-next-month' }                      // VAT per the sample cert
  | { kind: 'day-of-next-month'; day: number }            // 28 = statutory VAT, 15 = excise
  | { kind: 'months-after-period-end'; months: number }   // 9 = Corporate Tax
  | { kind: 'on-expiry' }                                 // licence-style renewals

/** Editable catalog entry — this is what makes custom obligations data, not code. */
export interface ObligationType {
  id: string
  name: string                       // "VAT Return"
  shortName: string                  // "VAT"
  periodicity: Periodicity
  dueRule: DueRule
  staggerOptions?: QuarterStagger[]  // quarterly only
  fiscalYearEndMonth?: number        // annual only; 12 = December
  serviceId?: string                 // links to Service — used in Phase 7
  defaultReminderDays: number[]
  defaultChannels: Channel[]
  builtIn: boolean                   // built-ins are editable but not deletable
}

export interface Registration {
  id: string
  clientId: string
  obligationTypeId: string
  registrationNumber?: string        // TRN
  effectiveDate: string              // "Effective Registration Date" on the cert
  firstPeriodStart: string
  firstPeriodEnd: string
  periodicity: Periodicity           // copied from the type, overridable (monthly VAT filer)
  staggerGroup?: QuarterStagger
  fiscalYearEndMonth?: number
  dueRule?: DueRule                  // per-registration override; falls back to the type
  certificateDocumentId?: string     // links to the uploaded ClientDocument
  status: 'active' | 'deregistered'
  deregisteredAt?: string
  createdAt: string
}

/**
 * Only the manual state is stored. Urgency is DERIVED from dueDate at render
 * time — see "Do not repeat the stale-status bug" below.
 */
export type FilingState = 'pending' | 'filed' | 'not-required'

export interface FilingPeriod {
  id: string
  registrationId: string
  clientId: string
  obligationTypeId: string
  label: string                      // "Aug–Oct 2026" / "FY 2025"
  periodStart: string
  periodEnd: string
  dueDate: string
  taxYear: number                    // calendar year of periodEnd
  state: FilingState
  filedAt?: string
  matterId?: string
  invoiceId?: string
}

export interface ClientYear {
  clientId: string
  taxYear: number
  status: 'open' | 'closed'
  closedAt?: string
  reopenedAt?: string
  reopenReason?: string
}
```

Also add to the existing `Client` interface:

```ts
personType?: 'legal' | 'natural'   // 'natural' = sole establishment / freelancer
```

This one field is how "personal tax" is handled. The UAE has no personal
income tax — a natural person is simply a taxable person whose CT period is
always the calendar year with the return due 30 September following. One
field, driving defaults, instead of a parallel obligation.

### Do not repeat the stale-status bug

`ClientDocument.status` is currently a stored string (`'expiring'`,
`'expired'`) baked into `mockData.ts`. Those values are frozen at authoring
time and drift out of sync with `TODAY` — `d1` says `'expiring'` because
someone typed it, not because it was computed.

`FilingPeriod` must not copy that. Store only `state`
(`pending` / `filed` / `not-required`), and derive urgency from `dueDate`
through the existing `urgencyFromDate()` in `src/lib/utils.ts` wherever it is
rendered. A filing cannot silently claim to be on time.

---

## The generator: `src/data/filingPeriods.ts`

All functions pure — calendar arithmetic only, no reads of the current time at
all, so the golden cases below are reproducible.

```ts
/** Clamps to month end: (2026-01-31, +1 month) → 2026-02-28, not 2026-03-03. */
function addMonthsClamped(iso: string, months: number): string

/** Last calendar day of the month containing `iso`. */
function endOfMonth(iso: string): string

export function dueDateFor(periodEnd: string, rule: DueRule): string

/**
 * Derives the first period from just the effective date + cycle — this is what
 * keeps onboarding to three fields. The start is the effective date itself
 * (not the period's natural start), the end is the natural end of the period
 * that contains it.
 */
export function deriveFirstPeriod(
  effectiveDate: string,
  periodicity: Periodicity,
  opts: { staggerGroup?: QuarterStagger; fiscalYearEndMonth?: number },
): { firstPeriodStart: string; firstPeriodEnd: string }

export function nextPeriodAfter(
  periodEnd: string,
  periodicity: Periodicity,
): { periodStart: string; periodEnd: string }

export function labelForPeriod(periodEnd: string, periodicity: Periodicity): string

export function generateFilingPeriods(
  registration: Registration,
  obligationType: ObligationType,
  throughTaxYear: number,
): FilingPeriod[]
```

### Algorithm

1. Resolve the effective rule: `registration.dueRule ?? obligationType.dueRule`.
2. Seed the walk with `registration.firstPeriodStart` / `firstPeriodEnd`.
3. Emit a period; compute `dueDate = dueDateFor(periodEnd, rule)`; set
   `taxYear = year(periodEnd)`; set `label = labelForPeriod(...)`.
4. Advance with `nextPeriodAfter(periodEnd, …)` — the next period always
   starts the day after the previous one ends, so stagger is preserved
   automatically and never needs re-deriving.
5. Stop when `taxYear > throughTaxYear`.
6. If `status === 'deregistered'`, stop at the period containing
   `deregisteredAt`.

Step 4 is the trick worth stating plainly: once the first period is right,
every later period follows from "the day after the last one ended". There is
no need to know which stagger group a registration is in when generating
period 7 — the group is already encoded in where period 1 ended.

### Labelling rules

| Periodicity | Label |
|---|---|
| annual | `FY 2025` (year of `periodEnd`) |
| quarterly, same year | `Aug–Oct 2026` |
| quarterly, straddling | `Nov 2026–Jan 2027` |
| monthly | `Aug 2026` |

Do not label quarterly periods `Q1`–`Q4`. For a staggered filer, "Q1" is
ambiguous and wrong — Aug–Oct is nobody's Q1. Month names are unambiguous.

---

## Golden test cases — the acceptance criteria

These come off the two real certificates. Phase 1 is not done until the
generator reproduces them exactly.

### A. VAT — sample certificate (TRN 104877501700003)

Input: `periodicity: 'quarterly'`, `staggerGroup: 'feb-may-aug-nov'`,
`dueRule: { kind: 'last-day-next-month' }`, `effectiveDate: '2026-08-01'`,
`firstPeriodStart: '2026-08-01'`, `firstPeriodEnd: '2026-10-31'`,
`throughTaxYear: 2027`.

| # | Period start | Period end | Due date | Tax year | Label |
|---|---|---|---|---|---|
| 1 | 2026-08-01 | 2026-10-31 | **2026-11-30** | 2026 | Aug–Oct 2026 |
| 2 | 2026-11-01 | 2027-01-31 | 2027-02-28 | 2027 | Nov 2026–Jan 2027 |
| 3 | 2027-02-01 | 2027-04-30 | 2027-05-31 | 2027 | Feb–Apr 2027 |
| 4 | 2027-05-01 | 2027-07-31 | 2027-08-31 | 2027 | May–Jul 2027 |
| 5 | 2027-08-01 | 2027-10-31 | 2027-11-30 | 2027 | Aug–Oct 2027 |
| 6 | 2027-11-01 | 2028-01-31 | 2028-02-29 | 2028 | — excluded, taxYear > 2027 |

Row 1 must match the certificate's printed *First VAT Return Period*
(01/08/2026 – 31/10/2026) and *VAT Return due date* (30/11/2026).
Row 2 proves the year-straddle. Row 6 proves the leap-year clamp (Feb 2028
has 29 days) and the `throughTaxYear` cutoff.

### B. Corporate Tax — sample certificate (TRN 104877501700001)

Input: `periodicity: 'annual'`, `fiscalYearEndMonth: 12`,
`dueRule: { kind: 'months-after-period-end', months: 9 }`,
`effectiveDate: '2025-02-01'`, `firstPeriodStart: '2025-02-01'`,
`firstPeriodEnd: '2025-12-31'`, `throughTaxYear: 2026`.

| # | Period start | Period end | Due date | Tax year | Label |
|---|---|---|---|---|---|
| 1 | 2025-02-01 | 2025-12-31 | **2026-09-30** | 2025 | FY 2025 |
| 2 | 2026-01-01 | 2026-12-31 | 2027-09-30 | 2026 | FY 2026 |

Row 1 must match the certificate's *First Corporate Tax Period*
(01/02/2025 – 31/12/2025) and *First CT Return Filing Due Date*
(30/09/2026). It is an **11-month stub period** — a generator that assumes a
full 12 months fails here.

The due date is also the month-end clamp in disguise: 31 December + 9 months
is "31 September", which does not exist. It must clamp to 30 September, not
roll into October.

### C. Excise — monthly

`periodicity: 'monthly'`, `dueRule: { kind: 'day-of-next-month', day: 15 }`,
first period 2026-08-01 – 2026-08-31 → due **2026-09-15**, label `Aug 2026`.

### D. `deriveFirstPeriod` — mid-period registration

`effectiveDate: '2026-08-15'`, quarterly, `feb-may-aug-nov` →
`{ firstPeriodStart: '2026-08-15', firstPeriodEnd: '2026-10-31' }`.

The start is the effective date, **not** 2026-08-01. A business is not liable
for VAT before it was registered.

### E. Statutory VAT alternative

Same as case A but `dueRule: { kind: 'day-of-next-month', day: 28 }` →
row 1 due 2026-11-28. Both rules must be reachable; see the due-date
ambiguity note in `PLAN.md`.

---

## Verification

- `npx tsc -b` clean, `npm run lint` clean.
- Every table above reproduced exactly. Assert them in a scratch script run
  with `npx tsx` (or a temporary `main.tsx` block) — there is no test runner
  in this project, and adding one is out of scope for this phase. Delete the
  scratch afterwards; record the actual output in `STATUS.md`.
- No import of `filingPeriods.ts` from any component yet. If a component
  needs it in this phase, the phase has grown out of scope.

## Out of scope

Store wiring, seed data, any UI. Phase 1 ships a module nothing calls yet —
that is intentional, and it is what makes the golden cases trustworthy.

---

## Implementation notes (written after the phase landed)

Two signatures came out simpler than planned, and the plan text above was
updated to match rather than left to drift:

- **`nextPeriodAfter(periodEnd, periodicity)`** — the `fiscalYearEndMonth`
  option turned out to be dead weight. Because the next period always begins
  the day after the previous one ended, both the stagger group and the fiscal
  year end are already encoded in where the last period finished. Passing them
  again would let a caller contradict the schedule it is walking.
- **`labelForPeriod(periodEnd, periodicity)`** — needs only the period end.
  The natural period months are derived backwards from it, which is what makes
  a stub period label correctly: a registration effective 15 Aug still belongs
  to `Aug–Oct 2026`, not to a period starting on the 15th.

Also worth recording:

- `dueDateFor` is written as sequential `if` returns rather than a `switch`.
  TypeScript would not accept the switch as exhaustive over the `DueRule`
  union and reported *"function lacks ending return statement"* (TS2366).
- Dates are parsed by splitting the ISO string, not through `new Date(iso)`.
  `new Date('2026-10-31')` resolves to UTC midnight and then shifts under
  local-timezone accessors like `getDate()` / `setDate()`, which is how
  off-by-one-day bugs get into date arithmetic that looked fine in one
  timezone. The existing `addDays()` in `src/lib/utils.ts` has this shape; the
  generator deliberately does not reuse it.
- `daysInMonth` is the one place `Date` is used, via `Date.UTC(y, m, 0)` —
  UTC-only and therefore safe, and it gets leap years right for free.
