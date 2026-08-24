# Phase 3 — Onboarding Rebuilt Around Obligations

**Status:** DONE (2026-08-24) · **Depends on:** Phase 1, 2 · **UI changes:** major

The phase the client will judge the work by. Today's onboarding asks for a
business type and produces no schedule. After this phase it asks for roughly
the same amount and produces the client's next two years of deadlines.

---

## Files

- `src/pages/clients/ClientOnboarding.tsx` — rewrite (edit, currently 435 lines)
- `src/components/onboarding/ObligationPicker.tsx` — step 2 (new)
- `src/components/onboarding/RegistrationFields.tsx` — step 3, one card per obligation (new)
- `src/components/onboarding/SchedulePreview.tsx` — step 4, reused by Phase 5 (new)

---

## The input budget

The client's constraint is "not too many inputs". Current flow:

| Step | Today |
|---|---|
| 1. Basic Info | name*, business name, phone*, email |
| 2. Referral | referrer search (own full step) |
| 3. Business Type | 1 of 5 cards* |
| 4. Documents | checklist toggles |

Four steps, three of them mandatory, and **no filing schedule at the end**.

New flow — same four steps, referral demoted to an inline field on step 1 to
make room:

| Step | New | Inputs |
|---|---|---|
| 1. Client | name*, business name, phone*, email, person type toggle, collapsed "Referred by?" | 4 fields + 1 toggle |
| 2. What we handle | tax-year picker + obligation toggle chips* | **2 clicks** |
| 3. Registration details | per picked obligation: TRN, effective date, cycle (pre-selected) | **≤3 fields each** |
| 4. Confirm schedule | read-only generated calendar | **0 inputs** |

Business type moves off its own step and becomes an optional field on step 1
(it still drives suggested documents, which is genuinely useful — it just
should not gate onboarding for a client whose only need is a VAT return).

Net: the same mandatory input as today (2 typed fields + 1 click), and the app
gains the whole schedule. See the measured table in the implementation notes at
the end of this file — the original "one fewer decision" claim did not survive
measurement.

### Why referral collapses into step 1

It is a one-field question that today occupies a full step with its own
animation and skip button. Wallet and commission logic (`referredById`,
`ReferralBonusRule`) is unchanged — only its placement moves. Collapsed by
default, expands to the existing client-search combobox already written in
`ClientOnboarding.tsx` (lines ~250–300; lift it into the step-1 markup rather
than rewriting it).

---

## Draft state

Replace `DraftState` and bump the key — the old shape is not parseable into
the new one, and Phase 2 already clears it on load.

```ts
const DRAFT_KEY = 'sanuma-onboarding-draft-v2'

interface ObligationDraft {
  obligationTypeId: string
  registrationNumber: string
  effectiveDate: string
  staggerGroup?: QuarterStagger
  periodicity?: Periodicity
  fiscalYearEndMonth?: number
  certificateFileName?: string     // display only — no upload backend
}

interface DraftState {
  step: number
  name: string
  businessName: string
  phone: string
  email: string
  personType: 'legal' | 'natural'
  referrerId: string | null
  businessType: BusinessType | null      // now optional
  taxYear: number
  obligations: ObligationDraft[]
  checkedDocs: string[]
}
```

Keep the existing draft-resume behaviour and its "Resumed your in-progress
draft" banner — it works and it is a nice touch.

---

## Step 2 — `ObligationPicker`

- A tax-year selector at the top: current year, prev, next. Default to the
  year containing `TODAY`. This is the "which year are we adding work for"
  input from the requirement, and it becomes the `ClientYear` opened at
  finish.
- Toggle chips for each `ObligationType` in the catalog, grouped
  `Tax` / `Other`. Selecting one appends an `ObligationDraft` with defaults
  pre-filled from the catalog entry; deselecting removes it.
- Copy under each chip stating what it generates, e.g. *"4 returns per year"*
  / *"1 return per year"*. The requirement's core insight, made visible at the
  moment of choosing.
- At least one obligation required to proceed — but offer a **"No tax
  registrations yet"** escape that skips steps 3 and 4 entirely. c7 in the
  seed is exactly this client; onboarding must not be a dead end for them.

## Step 3 — `RegistrationFields`

One card per selected obligation. Hard cap of three inputs per card:

1. **TRN** — text, optional. A registration can be entered before the
   certificate arrives.
2. **Effective registration date** — date, required. Labelled *"Effective
   Registration Date (from the certificate)"* so it maps to the exact line on
   the FTA document the lawyer is reading from.
3. **Cycle** — a select, pre-picked:
   - quarterly → the three stagger groups, each labelled by its months
     (`Feb–Apr, May–Jul, Aug–Oct, Nov–Jan`), plus a "Monthly filer" option
     that switches to `ob-vat-return-monthly`
   - annual → financial year end (Dec default)
   - monthly → hidden entirely, nothing to choose

Below the fields, a live one-line derivation from
`deriveFirstPeriod()`: *"First period: 1 Aug – 31 Oct 2026 · first return due
30 Nov 2026"*. Immediate feedback that the three inputs were enough.

Plus an optional **"Attach certificate"** row per card, satisfying the
"take documents at client-add time" requirement. There is no upload backend —
it records a filename and creates a `ClientDocument` of the matching type
(`dt-vat-cert` / `dt-corp-tax-cert`) linked via
`Registration.certificateDocumentId`, the same way `NewDocumentModal` already
handles files today. Do not fake a progress bar.

**No PDF parsing.** Open decision #5. Auto-reading a certificate needs a
backend this project does not have, and a wrong parse of an effective date
silently corrupts a two-year schedule. Three fields with good defaults is the
better trade.

## Step 4 — `SchedulePreview`

Read-only. Calls `generateFilingPeriods()` on the draft and renders:

- A headline: *"8 filings scheduled — first due 30 Sept 2026."*
- A table per registration: label, period start–end, due date.
- Five rows per obligation, the rest collapsed under *"Show N more"*.

**Not filtered by the selected tax year.** A backdated registration's first
period belongs to an earlier tax year, and filtering by year hides the exact
period the certificate is about. See the implementation notes.

Zero inputs. This is where the auto-generation stops being a claim and becomes
something the lawyer can check against the certificate in their hand before
committing. Built as its own component because Phase 5 reuses it in the
client's Compliance tab.

---

## Finish

```
addClient({ …, personType, businessType: businessType ?? undefined })
for each obligation draft → addRegistration({ clientId, … })
    (each call derives its first period and regenerates its own periods)
openClientYear(clientId, draft.taxYear)
create ClientDocument rows for any attached certificates + link them
```

Then the existing success screen, with the suggested-documents card kept
(driven by `businessType` when one was picked) and a new line: *"Compliance
calendar created — 5 filings scheduled."* Link to the new Compliance tab
(Phase 5) rather than the Documents tab.

`canProceed` per step:

```ts
const canProceed = [
  !!draft.name && !!draft.phone,
  draft.obligations.length > 0 || skippedRegistrations,
  draft.obligations.every(o => !!o.effectiveDate),
  true,
][draft.step]
```

Note step 3 requires only the effective date — TRN and cycle both have
usable defaults or are legitimately unknown at onboarding time.

---

## Verification

- `npx tsc -b` and `npm run lint` clean.
- Onboard a client with **VAT quarterly `feb-may-aug-nov`, effective
  2026-08-01**. Step 4 must show first period 01/08/2026–31/10/2026 due
  30/11/2026 — i.e. the sample certificate, reproduced through the UI.
- Onboard a client with **Corporate Tax, effective 2025-02-01**. Step 4 must
  show FY 2025 = 01/02/2025–31/12/2025 due 30/09/2026.
- Onboard a client with both, in one pass. Two schedules, one client year.
- Take the "No tax registrations yet" path — client is created, no
  registrations, no crash, lands on the profile.
- Refresh mid-draft on step 3: draft resumes with obligations intact.
- Count the mandatory fields on the happy path and record the number in
  `STATUS.md`. The claim in `SUMMARY.md` is that it went down; verify it
  rather than asserting it.
- Zero console errors throughout.

## Out of scope

The Filings page (Phase 4), the Compliance tab this links to (Phase 5) —
until Phase 5 lands, point the success screen at the client profile's
existing Documents tab.

---

## Implementation notes (written after the phase landed)

### The "fewer inputs" claim was wrong, and is now corrected

Measured on the happy path:

| | Old flow | New flow |
|---|---|---|
| Typed mandatory fields | `name`, `phone` | `name`, `phone` |
| Mandatory clicks | 1 (business type card) | 1 (an obligation, or "No tax registrations yet") |
| **Total mandatory** | **3** | **3** |
| Filing schedule produced | none | the client's next 2 years |

`git show HEAD:…/ClientOnboarding.tsx` line 158 confirms the old gate was
`[!!name && !!phone, true, !!businessType, true]` — three mandatory items, same
as now. `SUMMARY.md` originally claimed the count went *down*; it is equal, and
the file has been corrected. The honest claim is **same cost, far more output**.

### The preview must not be filtered by the selected tax year

First build filtered step 4 to `taxYear === selectedYear`. Entering the sample
Corporate Tax certificate then showed **FY 2026** — because that certificate is
effective Feb 2025, so its first period's `taxYear` is 2025 and got filtered
out. The lawyer would have seen the card say *"first return due 30 Sept 2026"*
and then a step-4 table showing a different period entirely.

Worse, the headline read *"first due 30 Nov 2026"* when the CT return was due
30 Sept 2026 — earlier, and hidden.

`SchedulePreview` now shows the whole generated schedule sorted by due date,
five rows per obligation with the rest collapsed, and the selected tax year is
context in the headline rather than a filter. Backdated registrations are
normal — a client brings you a certificate issued last year — so the preview
cannot assume the first period lands in the year being set up.

### Referral moved off its own step

It was a one-field question occupying a full step with its own animation and
skip button. Now a collapsed *"Referred by an existing client?"* link on step 1
that expands into the same combobox. `referredById` and the wallet logic are
untouched — only the placement moved. That is what made room for the two new
steps without growing the wizard.

### Business-type suggestions moved to `src/data/suggestedDocuments.ts`

Phase 8's deletion list said to remove `businessTypes[].checklist` from
`ClientOnboarding.tsx`, while this phase said to keep the suggestions. Both are
satisfied by moving the map out of the page into a data module — it is data, and
the success screen is now its only reader. Phase 8 should verify the move rather
than delete the data.

### Two small store/catalog additions this phase needed

- `addDocument` now returns the created `ClientDocument`. Linking an attached
  certificate to a registration requires its id, and the old `void` return made
  that impossible.
- `ObligationType.certificateDocumentTypeId` maps an obligation to the document
  type its certificate files under (`ob-vat-return` → `dt-vat-cert`). Putting it
  on the catalog keeps it editable in Phase 8 instead of hardcoding a lookup in
  the wizard.
- `cycleDescription()` added to `filingPeriods.ts` — cycle in words, shared by
  the wizard and Phase 5.
