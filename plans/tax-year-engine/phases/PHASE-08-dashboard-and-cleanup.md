# Phase 8 — Dashboard, Vault, Settings, Cleanup

**Status:** pending · **Depends on:** Phases 1–7 · **UI changes:** dashboard + vault + settings

The finishing phase: make the app's entry points reflect the new spine, let
the firm add its own obligations, and delete what the plan replaced.

---

## Files

- `src/pages/Dashboard.tsx` — rework the compliance cards (edit)
- `src/pages/documents/DocumentVault.tsx` — repoint `buildItems` (edit)
- `src/pages/settings/SettingsPage.tsx` — obligation catalog editor (edit)
- `src/components/modals/NewObligationTypeModal.tsx` (new)
- `src/data/types.ts`, `src/data/mockData.ts` — final deletions (edit)

---

## Dashboard

Phase 2 left the compliance cards minimally repointed. Rework them now:

- **Upcoming Filings** replaces the old "Compliance Filing Deadlines" card:
  the next 6 pending filings across all clients, by due date, with urgency
  colour and a link to `/filings`.
- **This tax year** stat row: filings *filed / due / overdue* for the current
  tax year. The requirement is year-based, so the dashboard should answer
  "where is this year" at a glance.
- **Internal reminders** (from Phase 6, `audience: 'internal' | 'both'`): what
  needs chasing today. Nothing else in the app surfaces these.
- Keep the existing expiring-documents card. Licence and visa expiry is still
  real work — this plan reframes the app around filings, it does not claim
  documents stopped mattering.

The `StatCard` component and the recharts revenue chart stay as they are.

## Document Vault

`buildItems()` at `DocumentVault.tsx:26` merges `clientDocuments` with the
fake `complianceDeadlines`. Repoint the second argument at `filingPeriods` so
the unified list and the calendar view both show real filing dates alongside
document expiries.

Keep the `UnifiedItem` shape — the list and calendar renderers below it are
fine and need no change. Only the mapping function changes:
`{ kind: 'filing', label: period.label, date: period.dueDate, … }`.

This is where the requirement's two halves finally sit in one view: *expiry*
dates and *renewal/filing* dates on one calendar.

## Settings — obligation catalog editor

The "there are more custom types like this" requirement, closed out.

A new Compliance section in `SettingsPage.tsx` listing every
`ObligationType`, with add and edit. `NewObligationTypeModal` follows
`NewDocumentTypeModal.tsx` (140 lines, same job for document types) — copy its
structure rather than inventing a second pattern.

Fields: name, short name, periodicity, due rule, stagger options (quarterly
only), financial year end (annual only), linked service, default reminder days
and channels.

Constraints:

- `builtIn: true` entries are **editable but not deletable**. A firm may
  legitimately change the VAT due rule; deleting VAT Return would orphan every
  registration pointing at it.
- Deleting a custom obligation type is blocked while any registration
  references it, with a message naming the count. Not a confirm-and-cascade —
  cascading here would delete filed periods and their invoice links.
- Editing `periodicity` or `dueRule` on a type with existing registrations
  warns that future periods will be regenerated, then calls
  `regeneratePeriodsFor` on each affected registration. Phase 2's locking rule
  protects filed history.

Also add the Phase 5 toggle here if it is not already placed:
*"Require a reason when reopening a closed tax year"* (default on).

## Deletions

By this phase these should have no remaining references. `tsc -b` is the
check:

| Delete | From |
|---|---|
| `ComplianceDeadline` interface | `src/data/types.ts` |
| `Recurrence` type | `src/data/types.ts` (only `ComplianceDeadline` used it) |
| `complianceDeadlines` seed array | `src/data/mockData.ts` |
| `businessTypes[].checklist` arrays | `src/pages/clients/ClientOnboarding.tsx` — superseded by Phase 3 |

Keep `BusinessType` itself and the suggested-documents mapping — Phase 3
demoted business type to optional but kept it useful.

Then a sweep for anything the plan orphaned: unused imports in the four files
Phase 2 repointed, and any `Urgency` helper duplicated during Phase 4. Run
`npm run lint` and read its output rather than assuming.

---

## Verification

- `npx tsc -b` and `npm run lint` clean, with **zero** references remaining to
  every row in the deletion table.
- Dashboard: upcoming filings match the top of the Filings page; the tax-year
  stat row adds up to the seeded filing count for 2026; internal reminders
  render.
- Vault list and calendar both show filing due dates and document expiries
  together, and the calendar lands them on the right days.
- Settings: create a custom obligation ("Municipality Return", quarterly,
  28th of following month), attach it to a client in Phase 3's onboarding, and
  confirm periods generate correctly — the full custom-obligation path,
  end to end.
- Try to delete a built-in → blocked. Try to delete a custom one in use →
  blocked with the reference count. Delete an unused custom one → succeeds.
- Edit a built-in's due rule with registrations attached → warning shown,
  future periods regenerate, filed periods unchanged.
- Reload; everything persists.
- Zero console errors on every page in the app, not just the ones this phase
  touched — this is the last phase, so it is the one that owns the whole-app
  pass.

## After this phase

Update `STATUS.md` with the completion summary, then write the follow-on plan
for what was deliberately excluded: **penalty fees** (pending charge auto-added
to the next invoice, waivable with a reason) and the **credit-note historical
fee/VAT snapshot** rule. Both are specified in
`SanumaBusinessFundamentalBn.md` §5 and neither is touched by this plan.
