# Phase 5 — Manual Journal Entry, Period Lock, Chart Editor

**Status:** pending · **Depends on:** Phases 1–4 · **UI changes:** new modal + settings

What the automated templates cannot cover: accruals, corrections,
reclassifications.

---

## Files

- `src/components/modals/JournalEntryModal.tsx` (new)
- `src/components/modals/AccountModal.tsx` (new)
- `src/pages/settings/SettingsPage.tsx` (edit) — chart editor + period lock
- `src/data/store.tsx` (edit) — `reverseJournal`, account CRUD, `periodLockedBefore`

---

## Manual journal entry

A line editor: add and remove lines, each an account picker plus a Dr or Cr
amount. A live running total shows both sides and the difference, and **Post stays
disabled until the difference is zero** — the Phase 1 guard surfaced as the UI's
primary feedback rather than an error after the fact.

Fields: date, reference, narration, lines. `sourceType: 'manual'`, `actor` from
the signed-in staff member.

## Reversal, not editing

Per open decision #5, a posted entry is never edited. **Reverse** creates a new
entry with Dr and Cr swapped, `reversesEntryId` set, and a narration naming the
original. Both stay in the day book.

This matches what the app already does everywhere else: credit notes rather than
editing an issued invoice, `revertFilingToPending` rather than deleting a filed
period. One rule applied consistently is the reason the records are worth keeping.

A reversed entry is badged in the Day Book, and its reversal links back to it.

## Period lock

`periodLockedBefore?: string` on the firm profile. `postJournal` refuses a posting
dated on or before it, naming the date in the message. Settings exposes it with
the consequence spelled out.

Deliberately one date rather than per-period state: a month that can be reopened
with no trail is not locked, and `tax-year-engine` Phase 5 already demonstrates
the heavier close/reopen pattern for when that is genuinely wanted.

## Chart editor

Settings → Accounting, following the obligation-catalog editor from
`tax-year-engine` Phase 8 — the same job, so the same shape rather than a second
pattern:

- Built-in accounts are **editable but not deletable**. Renaming Bank is fine;
  deleting it orphans every posting.
- `type` is locked once the account has postings. Changing it would move balances
  between statements retroactively.
- Deleting a custom account is blocked while any journal line references it, with
  the count named.

---

## Verification

- Post a balanced 2-line manual journal: it appears in the Day Book, moves the
  trial balance, and the totals still agree.
- Post is disabled on an unbalanced draft, with the difference displayed.
- Reverse an entry: both appear, the trial balance returns to its prior totals,
  the badge and back-link render.
- Set the period lock: a posting dated inside it is refused with the reason, one
  dated after it succeeds.
- Delete a built-in account → blocked. Delete a custom account in use → blocked
  with the count. Delete an unused custom one → succeeds.
- Change a used account's type → blocked with an explanation.
- Reload after each; everything persists. Zero console errors.

## After this phase

The ledger can produce a trial balance, a P&L, a balance sheet and a VAT return
from one source. Deliberately still missing: bank-feed reconciliation against a
real statement, multi-currency, fixed assets and depreciation, and the year-end
close into Retained Earnings.
