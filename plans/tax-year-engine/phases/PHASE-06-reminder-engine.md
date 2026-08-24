# Phase 6 — Unified Reminder Engine

**Status:** DONE (2026-08-24) · **Depends on:** Phase 1, 2, 4 · **UI changes:** reminders page rework

The requirement is "notify before expiry **and** before the renewal date
arrives". Today only the first half is possible: `ReminderRule.typeId` points
at a `DocumentTypeDef`, so a rule can fire on a licence expiring and cannot
fire on a VAT return falling due.

---

## Files

- `src/data/types.ts` — widen `ReminderRule`, `ReminderLogEntry` (edit)
- `src/data/store.tsx` — rule migration + due-reminder derivation (edit)
- `src/data/mockData.ts` — seed obligation rules (edit)
- `src/pages/reminders/ReminderRulesPage.tsx` — grouping + audience UI (edit)

---

## Widening the rule

```ts
export type ReminderSubjectKind = 'document' | 'obligation'
export type ReminderAudience = 'client' | 'internal' | 'both'

export interface ReminderRule {
  id: string
  subjectKind: ReminderSubjectKind
  subjectTypeId: string        // DocumentTypeDef.id | ObligationType.id
  subjectName: string          // denormalised for display, as typeName is today
  daysBefore: number[]
  channels: Channel[]
  audience: ReminderAudience
  enabled: boolean
}
```

`typeId` / `typeName` are renamed to `subjectTypeId` / `subjectName`. Both are
read in `ReminderRulesPage.tsx` and written in `store.tsx`'s
`addDocumentType`; `tsc` will find every site.

### Migration

Existing persisted rules and the seed both key on document types. Map them on
load:

```ts
{ ...rule, subjectKind: 'document', subjectTypeId: rule.typeId,
  subjectName: rule.typeName, audience: 'client' }
```

Do this in the `loadPersisted` path rather than bumping the storage key again
— Phase 2 already bumped it, and a second bump would wipe the demo data a
tester just finished setting up.

## Milestones

`SanumaBusinessFundamentalBn.md` specifies **T-60, T-30, T-15, T-7 and
D-Day**. Current document defaults are inconsistent
(`[60,30,7]`, `[90,30]`, `[45,14]`, `[30]`…). Set obligation defaults to
`[60, 30, 15, 7, 0]` where `0` is D-Day, and leave the existing document
defaults alone — a passport genuinely wants 90 days and a VAT return does not.
Make the milestone editor accept `0` and render it as "On the day".

## Audience

`'client'` · `'internal'` · `'both'`.

The lawyer needs their own reminder even when the client has already been
chased — the two are different jobs. A client reminder says "send us your
records"; an internal reminder says "this return is due in a week and nobody
has opened a matter for it". Seed obligation rules as `'both'` at T-30 and
T-7, `'internal'` at T-60 (no point alarming a client two months out about a
return whose records do not exist yet), `'both'` at T-15 and D-Day.

Internal reminders render on the Dashboard (Phase 8), not through a channel.

## Derivation

Reminders are **derived, not stored**. A pure helper alongside the generator:

```ts
export function dueReminders(
  rules: ReminderRule[],
  documents: ClientDocument[],
  filingPeriods: FilingPeriod[],
  obligationTypes: ObligationType[],
  today: string,
): Array<{
  rule: ReminderRule
  clientId: string
  subject: string              // "VAT Return Aug–Oct 2026 is due in 7 days"
  targetDate: string
  daysOut: number
  filingPeriodId?: string
  documentId?: string
}>
```

Same reasoning as `FilingPeriod.state` in Phase 1: a stored "reminder is due"
flag goes stale the moment the clock moves. Derive from dates, and store only
what actually happened — the log.

Filings that are `filed` or `not-required` produce no reminders. Deregistered
registrations produce none. Closed tax years produce none.

## Log

Add to `ReminderLogEntry`:

```ts
filingPeriodId?: string
documentId?: string
audience: ReminderAudience
```

This is what answers *"did we warn this client before the deadline"* per
filing, which is the question that matters when a client disputes a penalty.
Surface it as a small reminder history on each filing row in the Phase 4
page and the Phase 5 tab.

## Rules page

Currently groups by `documentTypes` category via `grouped` in
`ReminderRulesPage.tsx:38`. Extend to two sections:

- **Filing Deadlines** — obligation-type rules, listed first (this is the
  practice's primary work)
- **Document Expiry** — the existing document-type rules, grouped by category
  exactly as now

Each row gains an audience selector next to the existing channel chips and
`daysBefore` editor. The existing edit modal handles the rest unchanged.

There is no scheduler in this prototype — nothing actually sends. The page
configures rules and the derivation shows what *would* fire today; a "Send
now" action appends a log entry. Do not add a fake background sender or a
progress animation implying real delivery.

---

## Verification

- `npx tsc -b`, `npm run lint` clean — zero remaining references to
  `rule.typeId` / `rule.typeName`.
- Existing document rules survive migration with their days and channels
  intact, and appear under Document Expiry.
- With `TODAY = 2026-07-21`, `dueReminders()` returns the expected T-milestone
  hits for the seeded filings — verify at least one exactly by hand
  (c1's VAT return due 2026-07-28 should hit the T-7 rule) and record it in
  `STATUS.md`.
- A filing marked `filed` stops producing reminders. A closed year produces
  none.
- Audience filtering works: internal-only rules produce no client-channel rows.
- "Send now" appends a log entry carrying the `filingPeriodId`.
- Zero console errors.

## Out of scope

Real delivery (no backend), a scheduler, penalty-fee automation — the penalty
rules in the business doc are explicitly the next plan.

---

## Implementation notes (written after the phase landed)

### The frozen-clock bug, fixed at the root this time

This is the third phase where the seed's `TODAY` (a fixed authoring date) fought
`daysUntil`'s real system clock. Phase 2 flagged it, Phase 4 tripped over it in
`groupFor`, and here it would have made one page count down to a filing while
another called it overdue.

Added `todayIso()` to `src/lib/utils.ts` — today from the real clock, as an ISO
date. The reminder engine and the log both use it. `TODAY` is now purely a
seed-authoring constant, which is what it always should have been.

The log had it wrong in the first build: a reminder fired on 24 Aug was stamped
`21 Jul 2026`, the seed's date. Anyone auditing "did we warn them before the
deadline" would have read a false date.

### Reminders are derived; the log is stored

`dueReminders()` in `src/data/reminders.ts` is a pure function over rules,
documents, filing periods and dates. Same reasoning as `FilingPeriod.state`: a
stored "a reminder is due" flag goes stale the moment the clock moves.

A reminder fires when days-remaining **exactly equals** a milestone, not "within"
— otherwise every milestone re-fires every day once a deadline is close.

### A double-send gap the browser check caught

Logging a reminder left the row looking unsent, so the lawyer could send the same
chase repeatedly. `dueReminders` now takes the log and sets `alreadySentAt` when
the same target was logged today; the row shows a green badge and a disabled
*"Sent today"*. Keyed on the filing period or document, not the rule — a reminder
is the same reminder when it is about the same thing on the same day, whichever
rule produced it.

### `upcomingForRule` exists so rules do not look broken

With exact-milestone matching, most rules fire on no given day. A rules page
showing only that reads as "nothing works". Each row now shows its 90-day
coverage instead — *"5 within the next 90 days"* / *"nothing due in the next 90
days"*.

### Audience

`internal` disables the channel picker entirely, with copy explaining why: an
internal reminder is a worklist entry, not a message, so channels are
meaningless. Seeded filing rules are `both`; migrated document rules are
`client`.

### Migration, not another storage bump

Rules persisted before this phase keyed on `typeId` / `typeName`.
`migrateReminderRules()` maps them on load with `subjectKind: 'document'` and
`audience: 'client'`. Phase 2 already bumped `STORAGE_KEY` once; a second bump
would have discarded demo data a tester had just built up.

The reminder log also became a persisted, writable slice — it was read-only
seed data before, so a logged reminder would not have survived reload.
