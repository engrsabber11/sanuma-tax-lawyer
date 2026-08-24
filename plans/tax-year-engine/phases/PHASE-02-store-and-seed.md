# Phase 2 — Store Wiring, Seed Rewrite, Migration

**Status:** DONE (2026-08-24) · **Depends on:** Phase 1 · **UI changes:** none visible
(existing pages keep working, now reading derived data)

Connects the Phase 1 generator to the app's state, and removes the fake
`complianceDeadlines` it replaces.

---

## Files

- `src/data/store.tsx` — new state slices + actions (edit)
- `src/data/mockData.ts` — seed registrations, delete `complianceDeadlines` (edit)
- `src/data/types.ts` — delete `ComplianceDeadline`, `Recurrence` (edit)
- `src/data/obligationTypes.ts` — built-in catalog seed (new)
- `src/pages/Dashboard.tsx`, `src/pages/clients/ClientProfile.tsx`,
  `src/pages/documents/DocumentVault.tsx` — repoint the four read sites (edit)

---

## Built-in obligation catalog

New file `src/data/obligationTypes.ts`, mirroring how `documentTypes` is
seeded in `mockData.ts`. These are the defaults; Phase 8 makes them editable.

| id | name | periodicity | dueRule | serviceId |
|---|---|---|---|---|
| `ob-vat-return` | VAT Return | quarterly (stagger, all 3 options) | `last-day-next-month` | `svc-vat-return` |
| `ob-vat-return-monthly` | VAT Return (Monthly Filer) | monthly | `last-day-next-month` | `svc-vat-return` |
| `ob-ct-return` | Corporate Tax Return | annual (FY end 12) | `months-after-period-end: 9` | `svc-corp-tax-filing` |
| `ob-excise-return` | Excise Tax Return | monthly | `day-of-next-month: 15` | — |
| `ob-esr-notification` | ESR Notification | annual (FY end 12) | `months-after-period-end: 6` | `svc-esr-report` |
| `ob-esr-report` | ESR Report | annual (FY end 12) | `months-after-period-end: 12` | `svc-esr-report` |

All `builtIn: true`. Reminder defaults `[60, 30, 15, 7]` with channels
`['whatsapp', 'email']`, matching the milestones in
`SanumaBusinessFundamentalBn.md` (Phase 6 consumes these).

Note `ob-vat-return-monthly` exists as a separate catalog entry rather than a
flag on the quarterly one — a monthly filer is a different obligation with a
different service cadence, and keeping them separate avoids a
`periodicity`-override special case in every UI that groups by obligation.

Licence renewals (trade licence, Ejari, visa) stay as `hasExpiry` document
types. They are already handled correctly by `ClientDocument.expiryDate` and
do not need generated periods — do not migrate them into obligations.

---

## Store additions

Add to `DataContextValue` in `src/data/store.tsx`, following the existing
`useState` + `useEffect`-persist pattern already in that file:

```ts
obligationTypes: ObligationType[]
registrations: Registration[]
filingPeriods: FilingPeriod[]
clientYears: ClientYear[]

addObligationType: (input: Omit<ObligationType, 'id' | 'builtIn'>) => ObligationType
updateObligationType: (id: string, patch: Partial<ObligationType>) => void

addRegistration: (input: {
  clientId: string
  obligationTypeId: string
  registrationNumber?: string
  effectiveDate: string
  staggerGroup?: QuarterStagger
  periodicity?: Periodicity
  fiscalYearEndMonth?: number
  dueRule?: DueRule
  certificateDocumentId?: string
}) => Registration
updateRegistration: (id: string, patch: Partial<Registration>) => void
deregisterRegistration: (id: string, deregisteredAt: string) => void

regeneratePeriodsFor: (registrationId: string) => void
markFilingFiled: (filingPeriodId: string, filedAt?: string) => void
markFilingNotRequired: (filingPeriodId: string) => void
```

`addRegistration` calls `deriveFirstPeriod()` when `firstPeriodStart` /
`firstPeriodEnd` are not supplied, then immediately calls
`regeneratePeriodsFor` on the new registration. That is what makes the
onboarding preview in Phase 3 possible with three inputs.

Add all four new slices to `PersistedState` and to both the `toSave` object
and the `useEffect` dependency array. The current file lists every slice
explicitly in that array — miss one and the slice silently stops persisting.

### `PERIOD_HORIZON`

Export a single constant for how far ahead to generate:

```ts
export const PERIOD_HORIZON_YEARS = 1   // current tax year + 1
```

Open decision #3 in `PLAN.md`. One constant, one place to change it.

---

## Non-destructive regeneration

The important rule in this phase. Regeneration happens whenever a
registration's effective date, cycle, or stagger is edited — and by then some
periods may already have been filed, opened as matters, or invoiced.

```
regeneratePeriodsFor(registrationId):
  reg   = registrations.find(id)
  type  = obligationTypes.find(reg.obligationTypeId)
  fresh = generateFilingPeriods(reg, type, currentTaxYear + PERIOD_HORIZON_YEARS)

  existing = filingPeriods.filter(p => p.registrationId === registrationId)
  locked   = existing.filter(p =>
               p.state === 'filed' || p.matterId || p.invoiceId)

  // keep every locked period byte-for-byte, keyed on periodStart
  // for each fresh period whose periodStart is not locked → insert or replace
  // drop existing unlocked periods that fresh no longer contains
```

Locked periods are preserved **including their original dates**. If a filed
period's dates were recomputed, the invoice already issued against it would
start describing a period that no longer matches what was filed with the FTA.
Keying on `periodStart` also keeps `matterId` / `invoiceId` back-links intact
across a regeneration.

Where a locked period conflicts with the fresh schedule (the lawyer corrected
an effective date after filing), keep the locked one and leave the mismatch
visible in the UI rather than resolving it silently — Phase 5's compliance tab
is where a human sees and fixes that.

---

## Deleting `complianceDeadlines`

Four read sites, found by `grep -rn complianceDeadlines src/`:

| File | Current use | Replacement |
|---|---|---|
| `src/data/store.tsx` | `const [complianceDeadlines] = useState(seed...)` — no setter, not persisted | delete the slice |
| `src/pages/Dashboard.tsx:37` | `dueDeadlines` → "Compliance Filing Deadlines" card | derive from `filingPeriods` (full rework in Phase 8; a minimal repoint here) |
| `src/pages/clients/ClientProfile.tsx:40` | `deadlines` → merged into the Documents tab count | derive from `filingPeriods` (own tab in Phase 5) |
| `src/pages/documents/DocumentVault.tsx:26` | `buildItems(clientDocuments, complianceDeadlines, documentTypes)` | pass `filingPeriods` (full rework in Phase 8) |

In this phase the repoints are **minimal and behaviour-preserving** — same
cards, same counts, real data underneath. The visual reworks are Phase 8.
Doing both at once makes it impossible to tell a data bug from a layout bug.

Then delete from `src/data/types.ts`:

```ts
export type Recurrence = 'monthly' | 'quarterly' | 'annual'   // only used by ComplianceDeadline
export interface ComplianceDeadline { … }
```

`tsc -b` finding no remaining references is the proof this is complete.

---

## Seed rewrite

Give the existing mock clients real registrations. The point of the matrix
below is coverage: every generator code path should be visible in the running
app, not just in the golden tests.

| Client | Registration | Why this one |
|---|---|---|
| c1 Al Falasi Grocery | VAT quarterly, `jan-apr-jul-oct`, eff 2019-01-15 | long-running filer, many past periods |
| c2 Hassan Trading | VAT **monthly**, eff 2020-04-01 | the monthly path |
| c3 Rashid Mart | VAT quarterly, `feb-may-aug-nov` | stagger group 2 — matches the sample cert |
| c5 Khan F&B | VAT quarterly, `mar-jun-sep-dec` | stagger group 3 |
| c9 Nasser Grocery | VAT quarterly, `jan-apr-jul-oct`, eff 2026-07-20 | **stub first period** visible in the UI |
| c4 Deira Fresh | Corporate Tax annual, FY Dec, eff 2025-01-01 | annual + 9-month due rule |
| c6 Al Barsha Retail | Corporate Tax annual, FY Dec, eff 2025-02-01 | the 11-month stub from the sample cert |
| c8 Salem Trading | VAT quarterly **+** Corporate Tax | multi-registration client |
| c10 Priya Sharma | `personType: 'natural'`, Corporate Tax only | the "personal tax" case |
| c7 Saeed Consulting | **none** | licence-only client — proves the app renders with zero registrations |

Set `personType: 'legal'` on c1–c9, `'natural'` on c10.

Link certificates where the seed already has them: c1's `d7` and c2's `d11`
are VAT certificate documents (`dt-vat-cert`) — set
`certificateDocumentId` on those two registrations so Phase 3's attach
affordance has working examples to render.

`TODAY` stays `'2026-07-21'`. With the horizon at current year + 1, the seed
will generate periods through 2027, which gives the Filings page in Phase 4
both history and future without a wall of rows.

---

## Storage migration

```ts
const STORAGE_KEY = 'sanuma-app-state-v2'   // was 'sanuma-app-state-v1'
```

Old persisted state has no registrations. Loading it would render an app whose
compliance spine is empty while every other slice looks populated — worse than
a clean reseed, and harder to diagnose. A version bump is the honest migration
while this is still prototype data with no real client records in it.

Also drop the stale onboarding draft, whose shape changes in Phase 3:

```ts
localStorage.removeItem('sanuma-onboarding-draft')
```

Do this once on load in `DataProvider`, not in `ClientOnboarding` — a user
mid-draft when the deploy lands would otherwise hit a half-parsed draft and a
crash on `draft.checkedDocs`.

**Anyone testing this loses their local demo data.** Say so when handing the
phase over; it is a prototype, but it is still a surprise if unannounced.

---

## Verification

- `npx tsc -b` clean — and specifically: zero references to
  `ComplianceDeadline`, `complianceDeadlines`, or `Recurrence` remain.
- `npm run lint` clean.
- Browser: hard reload with the new storage key. Dashboard, client profiles,
  and document vault render with no console errors and non-zero filing counts.
- Spot-check in the UI that c3's periods are Feb–Apr / May–Jul / Aug–Oct /
  Nov–Jan and c6's first CT period is 11 months — the two facts most likely to
  regress silently.
- Edit c1's effective date, confirm filed/invoiced periods survive unchanged
  and only future ones shift.

## Out of scope

Any new page, any layout change, the obligation-catalog editor (Phase 8),
reminders (Phase 6).

---

## Implementation notes (written after the phase landed)

### The seed needed filing history, or the app opens with a lie

The first run generated **223 periods, 161 of them already past due** — because
a client registered in 2019 generates seven years of periods and they all
default to `pending`. The dashboard would have opened claiming ~160 overdue
filings on a practice that is actually up to date.

Fixed with `applySeedFilingHistory()` in `mockData.ts`: periods whose due date
is in the past are marked `filed` on their due date. One registration
(`reg-2`, Hassan Trading) deliberately keeps two recent periods pending, so the
overdue state is still exercised — and that choice matches the story the seed
already told about that client, whose invoice `inv-1003` is overdue and whose
reminder log has a failed *"VAT Return overdue"* entry.

Result: **159 filed · 64 pending · 2 overdue**.

### The client profile needed filtering, not just repointing

Repointing `ClientProfile` one-for-one made it list every period c1 has ever
had, back to `VAT Return — Jan–Mar 2019`. Technically behaviour-preserving,
practically a regression — 36 rows where there had been 1.

Now shows outstanding periods only, with a `29 filed` count in the card header,
and the card is retitled *Upcoming Filings*. The full history is Phase 5's
Compliance tab.

### Seed registrations do not hand-write their first period

`seed.registrations` is typed as
`Omit<Registration, 'firstPeriodStart' | 'firstPeriodEnd'>` and the store fills
those in through `deriveFirstPeriod()` — the same call the onboarding wizard
will make in Phase 3. A hand-written seed period could disagree with what real
entry produces, and that disagreement would be invisible.

### Pre-existing issue found, not fixed

`urgencyFromDate()` measures against the real system clock, while the seed's
`TODAY` is frozen at `2026-07-21`. As real time passes the seed drifts, so
periods due between `TODAY` and the real date show as `pending` **and**
overdue. This is not introduced here — the existing document seed has the same
drift (c1's trade licence, hardcoded `status: 'expiring'`, renders as
"23d overdue"). Fixing it means either advancing `TODAY` or making urgency
read `TODAY`, both of which affect every screen. Flagged for the client rather
than changed inside this phase.
