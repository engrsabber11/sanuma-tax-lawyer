# Phase 5 — Client Compliance Tab + Tax Year Open / Close / Reopen

**Status:** pending · **Depends on:** Phase 1, 2, 3 · **UI changes:** new tab + modal

Implements the "work is added per year, and a year can be reopened later"
requirement — the one the client explicitly left undecided.

---

## Files

- `src/pages/clients/ClientProfile.tsx` — new `Compliance` tab (edit)
- `src/components/modals/ReopenYearModal.tsx` (new)
- `src/components/modals/AddRegistrationModal.tsx` (new)
- `src/data/store.tsx` — year actions + audit entries (edit)
- `src/data/types.ts` — `AuditEntry` (edit)
- `src/pages/settings/SettingsPage.tsx` — the confirmation toggle (edit)

---

## The Compliance tab

Insert between `Overview` and `Documents` in the existing `Tabs` array
(`ClientProfile.tsx:133`). It becomes the tab the profile should open on for a
tax client, so make it the default when the client has registrations and
`Overview` otherwise.

Contents, top to bottom:

1. **Year header** — year selector + status pill (`Open` / `Closed`) + the
   close/reopen action. Counts: *"5 filings · 3 filed · 1 due · 1 overdue"*.
2. **Registration cards** — one per registration: obligation name, TRN,
   effective date, cycle in words (*"Quarterly · Feb–Apr, May–Jul, Aug–Oct,
   Nov–Jan"*), linked certificate document, and an Edit affordance.
3. **Period schedule** per card — reuse `SchedulePreview` from Phase 3, in an
   interactive mode with per-row state badges and the same row actions as the
   Filings page. Building it as a shared component in Phase 3 pays off here.
4. **Add registration** button → `AddRegistrationModal`, the same three fields
   as onboarding step 3. A client acquiring a CT registration two years after
   onboarding is normal, and must not require re-onboarding them.

Editing a registration calls `updateRegistration` + `regeneratePeriodsFor`.
Show what will change **before** saving — *"3 future periods will be
rescheduled. 2 filed periods are unaffected."* Phase 2 guarantees the
behaviour; this is where the lawyer is told about it.

---

## Closing a year

Allowed when every `pending` period in that tax year is `filed` or
`not-required`. If some are still pending, the button is disabled with a
tooltip naming the count — do not offer a force-close. A year closed with
unfiled returns in it is a false statement about the client's compliance, and
the whole point of the record is that it can be trusted.

Closing writes `{ status: 'closed', closedAt }` and an audit entry. Closed
years render read-only: no new matters, no state changes, no new registrations
dated inside them.

## Reopening — open decision #1

**Recommendation: with confirmation.** `ReopenYearModal` requires:

- a typed reason (free text, required, min ~10 chars — enough to be a sentence)
- explicit confirmation naming the client and year
- writes `{ status: 'open', reopenedAt, reopenReason }` + an audit entry

The reasoning, since the client asked for it either way: a tax year is a
financial and regulatory record. By the time it is closed, invoices have been
issued against its filings and its numbers have been reported to the FTA.
A silent reopen means that six months later nobody can say when it was
reopened, by whom, or why — and that is a question that gets asked precisely
when it is least convenient to have no answer. The cost of the dialog is one
click and one sentence. The cost of not having it is an unexplainable ledger.

Because the client may disagree, make it a **setting** rather than a hard
rule:

```
Settings → Compliance → [x] Require a reason when reopening a closed tax year
```

Default on. With it off, reopening is a single confirm click and the audit
entry still gets written — the audit entry is not negotiable, only the prompt
is. Losing the reason is a preference; losing the record is a defect.

---

## Audit entries

Minimal, and only for year transitions in this phase:

```ts
export interface AuditEntry {
  id: string
  at: string                 // ISO datetime
  actor: string              // firm user; single-user prototype → firmProfile.name
  action: 'year-closed' | 'year-reopened' | 'registration-edited'
  clientId: string
  subject: string            // "Tax year 2026" / "VAT Registration"
  note?: string              // the typed reason
}
```

Persisted like every other slice. Rendered as a small timeline at the bottom
of the Compliance tab. `ReminderLogEntry` already establishes the shape of an
append-only log in this codebase — follow it rather than inventing a second
convention.

## Store additions

```ts
clientYears: ClientYear[]
auditLog: AuditEntry[]

openClientYear: (clientId: string, taxYear: number) => void
closeClientYear: (clientId: string, taxYear: number) => void
reopenClientYear: (clientId: string, taxYear: number, reason: string) => void
canCloseClientYear: (clientId: string, taxYear: number) =>
  { ok: boolean; pendingCount: number }
```

`canCloseClientYear` returns the count rather than a bare boolean so the
disabled tooltip can say *"2 filings still pending"* instead of just being
dead.

---

## Verification

- `npx tsc -b`, `npm run lint` clean.
- c1 (long-running VAT filer): Compliance tab lists the registration, correct
  stagger in words, full period schedule.
- c8 (VAT + CT): two registration cards, two schedules, one year header.
- c7 (no registrations): tab renders an empty state, profile defaults to
  Overview, no crash.
- Close attempt with pending filings → disabled with the correct count.
  Mark them filed → close succeeds → tab goes read-only.
- Reopen → reason required, reason rejected when blank, audit entry appears
  with the typed text, tab becomes editable again.
- Toggle the Settings option off → reopen is one click, audit entry still
  written.
- Edit a registration with one filed period → the pre-save warning states the
  right counts, and after saving the filed period is byte-for-byte unchanged.
- Reload after each mutation — all of it persists.
- Zero console errors.

## Out of scope

Reminders (Phase 6), matter/invoice chain (Phase 7), a firm-wide audit page —
the per-client timeline is enough for now.
