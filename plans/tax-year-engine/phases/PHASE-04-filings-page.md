# Phase 4 — Filings Page (the lawyer's daily view)

**Status:** pending · **Depends on:** Phase 1, 2 · **UI changes:** new page

Where the lawyer actually lives. Today the closest thing is a dashboard card
built on fake data; this replaces it with a working worklist.

---

## Files

- `src/pages/filings/FilingsPage.tsx` (new)
- `src/App.tsx` — add `/filings` route (edit)
- `src/components/layout/Sidebar.tsx` — nav entry (edit)
- `src/components/layout/CommandPalette.tsx` — palette entry (edit)

---

## Layout

Reuse the established page shape: `h1` + subtitle, a filter bar, then content.
The filter-bar pattern is already written twice — in `MattersList.tsx`
(search + client + service + a quick toggle) and `ClientsList.tsx`. Follow
`MattersList.tsx`; do not invent a third variation.

**Tax year selector** sits next to the `h1`, not in the filter bar. It scopes
the whole page and is the one control that is always relevant — the
requirement is explicitly year-based, so the year should never be buried among
optional filters.

### Grouping

Group by urgency rather than paginating by date, so the top of the page is
always the work that matters:

| Group | Rule |
|---|---|
| Overdue | `dueDate < TODAY`, state `pending` |
| Due this month | within the current calendar month |
| Next 90 days | beyond that, `dueDate - TODAY <= 90` |
| Later this year | remaining `pending` in the selected tax year |
| Filed | state `filed`, collapsed by default with a count |
| Not required | state `not-required`, collapsed |

Urgency colour comes from `urgencyFromDate()` in `src/lib/utils.ts` — the
same thresholds documents already use, so a red row means the same thing
everywhere in the app.

### Row contents

Client avatar + name · obligation short name · period label
(`Aug–Oct 2026`) · period start–end · due date + relative days · state badge ·
linked matter or invoice if any.

Clicking the client name goes to the profile; clicking the row expands
inline actions rather than navigating — the lawyer is triaging a list, and
losing their place in it to see one filing is the wrong trade.

### Row actions

- **Open matter** — Phase 7 wires the auto-titled version; until then, open
  the existing `NewMatterModal` pre-filled with client and service.
- **Mark filed** — `markFilingFiled(id)`; row moves to the Filed group.
- **Mark not required** — for deregistered or nil-return cases.
- **Send reminder now** — Phase 6; render the button disabled with a tooltip
  until then rather than wiring a fake toast.

### Filters

Client · obligation type · state · a **"Overdue only"** quick toggle,
matching the toggle already in `MattersList.tsx`. All combinable, all applied
across groups.

---

## Empty and edge states

- No registrations anywhere → `EmptyState` (component exists) pointing at
  `/clients/new`.
- A selected year with no filings → distinct copy, since it means "nothing due
  this year", not "nothing set up".
- Filings whose registration is `deregistered` → still listed, tagged, never
  silently dropped. A period that vanishes because someone deregistered a
  client is a period nobody remembers to check.

## Scale

The seed generates roughly 40–60 periods; a real practice with 300 clients
generates thousands per year. Keep it a flat filtered list with grouping — do
not add virtualisation yet, but do not build anything that requires an
O(n²) join per render either. Resolve client and obligation-type lookups
through a `Map` built once in a `useMemo`, not `Array.find` inside the row
component. `MattersList.tsx` already gets this wrong in a few places; do not
copy that part.

---

## Verification

- `npx tsc -b`, `npm run lint` clean.
- Every seeded client's filings appear under the right group for
  `TODAY = 2026-07-21`.
- Year selector: switching 2026 → 2027 changes the set, and c9's stub first
  period appears only in its own year.
- Each filter alone and in combination; record before/after counts in
  `STATUS.md` the way the `matters-scale` plan did.
- "Mark filed" moves the row and survives a page reload (proves Phase 2's
  persistence wiring).
- Zero console errors.

## Out of scope

Reminder sending (Phase 6), auto-titled matters (Phase 7), calendar view —
the vault's calendar is repointed in Phase 8 and covers that need.
