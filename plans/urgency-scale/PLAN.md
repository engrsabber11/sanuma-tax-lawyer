# Urgency Scale — `critical` Added

**Status:** done · **Implemented:** 2026-08-24

One-page record. Small change, shared type, so it is worth writing down why.

---

## The problem

`urgencyFromDays` had three buckets and the overdue side had no ceiling:

```
days < 0    ->  danger    (red)
0 … 30      ->  warning   (amber)
> 30        ->  ok        (green)
```

Everything past due collapsed into one red. A VAT return 85 days late and one 24
days late rendered **identically** — same tone, same weight, sorted next to each
other in one block. That is not a worklist a lawyer can triage.

It is wrong for this domain specifically: UAE late-payment penalty is 2%
immediately then **4% per month**. At 85 days roughly three cycles have accrued;
at 24 days, none beyond the first. The badge said they were the same problem.

## The decision

**Option A — one scale, `critical` added globally**, chosen over a filings-only
second scale.

The reasoning, in the order it mattered:

1. **Two scales would rot.** The moment `filingUrgency` sits beside
   `urgencyFromDays`, every new screen has to pick one, and eventually picks
   wrong. This codebase already paid that tax once: Phases 6 and 7 of
   `tax-year-engine` spent real effort collapsing `TODAY` vs the real clock into
   one answer after it caused bugs in three separate phases.
2. **The document side wants it too.** A trade licence three months lapsed is
   worse than one lapsed last week — fines accrue there as well. The seed has a
   licence at **96 days overdue** rendering the same as one at 24.
3. **Cheaper to verify.** The 15 comparison sites had to be visited either way;
   a filings-only scale would have left the vault inconsistent with the pages
   next to it.

```
days > 30              ok         green
0 … 30                 warning    amber
-30 … -1               danger     tinted red
days < -30             critical   filled red + ring
```

`-30` is `CRITICAL_AFTER_DAYS_OVERDUE`, exported as a named constant. It is the
FTA's monthly penalty tick, not a round number chosen to suit the UI.

`critical` stays inside the red family as an **intensity** step rather than a new
hue: it is the same kind of problem further along, and a fifth colour would have
competed with the badges already on those rows.

---

## What changed

| File | Change |
|---|---|
| `src/lib/utils.ts` | `Urgency` gains `critical`; `CRITICAL_AFTER_DAYS_OVERDUE`; new `isOverdue()` helper |
| `src/components/ui/Badge.tsx` | `critical` tone (filled `bg-danger-600` + ring), `urgencyTone` / `urgencyLabel` entries |
| `src/pages/filings/FilingsPage.tsx` | **Overdue group split** into *Long overdue — penalties accruing* and *Overdue*; group dot and row text styling |
| `src/pages/documents/DocumentVault.tsx` | calendar chip filled for critical |
| `src/components/onboarding/SchedulePreview.tsx` | "long overdue" badge |
| `src/pages/clients/ClientProfile.tsx` | 2 filing-badge ternaries |
| `src/pages/matters/MattersList.tsx` | 2 matter-due ternaries |
| `src/data/store.tsx` | `docStatusFromExpiry` folds critical into `'expired'` via `isOverdue` |

TypeScript forced the two `Record<Urgency, …>` maps in `Badge.tsx`. It could
**not** catch the 15 string comparisons — each was visited by hand, which is the
only reason `critical` does not render grey in half the app.

### One deliberate non-change

`ClientDocument.status` is a **persisted** enum (`valid | expiring | expired`) and
did not gain a state. It is a cache of a derived value, every reader already
treats `expired` as terminal, and growing a stored enum to mirror a display
concern would mean migrating saved data for no gain. Verified: no `critical`
leaked into it.

---

## Verified in the browser

`tsc -b` clean for every file touched · lint 14, unchanged baseline ·
21 routes + client tabs · **0 console errors** · `package.json` unchanged.

### Filings page

```
GROUP                                DAYS         WEIGHT     COLOUR
Long overdue — penalties accruing    85d overdue  semibold   danger-700
Long overdue — penalties accruing    55d overdue  semibold   danger-700
Overdue                              24d overdue  normal     danger-600
Due within 30 days                   7d left      normal     warning-600
Next 90 days                         37d left     normal     ink-400

group dots:
  Long overdue        bg-danger-600 + ring
  Overdue             bg-danger-500
  Due within 30 days  bg-warning-500
```

Group counts: **Long overdue 2 · Overdue 3 · Due within 30 days 2 · Next 90 6 ·
Later 12 · Filed 9**, matching the computed buckets exactly
(`critical 2, danger 3, warning 2, ok 57` over pending periods; overdue day counts
`[-85, -55, -24, -24, -24]`).

### Document vault

```
 96d overdue  ->  CRITICAL (filled red)
 85d overdue  ->  CRITICAL (filled red)
 64d overdue  ->  CRITICAL (filled red)
 55d overdue  ->  CRITICAL (filled red)
 24d overdue  ->  danger   (tinted red)
```

The badge keeps the day count as its label rather than the word "Long overdue" —
the number carries more information, and only the tone needs to change.

---

## Flagged, not fixed

`urgencyFromDays` reads the real system clock while the seed is anchored to
`TODAY = 2026-07-21`. That gap is now five weeks, which is why so much seeded data
lands in `critical`: the two Hassan Trading returns at -85 and -55, and five
documents from -96 to -40.

**That is correct behaviour on stale demo data, not a bug in the scale.** The fix
is to advance the seed dates, not to weaken the thresholds. It is the same open
item `tax-year-engine` STATUS already records, and it is a bigger change than this
one — every recorded verification number in that plan moves with it.
