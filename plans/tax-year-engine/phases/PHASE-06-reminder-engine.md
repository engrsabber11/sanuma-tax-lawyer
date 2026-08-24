# Phase 6 — Unified Reminder Engine

**Status:** pending · **Depends on:** Phase 1, 2, 4 · **UI changes:** reminders page rework

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
