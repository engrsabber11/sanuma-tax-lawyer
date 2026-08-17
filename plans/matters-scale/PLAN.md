# Matters Page — Scale Improvements Plan

## Context

The Matters page is currently a pure Kanban board with no sorting, filtering,
archiving, or bulk actions. That works fine for a handful of active matters,
but breaks down once the practice has 300+ clients (unbounded columns, no way
to narrow down to one client/service, "Completed" grows forever, no way to
act on many matters at once). This plan breaks the fix into independent
phases, each shippable and verifiable on its own, executed one at a time.

See `PROGRESS.md` in this folder for live status — check it before resuming
work if a session was interrupted.

## Phases

### Phase 1 — Sort by urgency within Kanban columns
Cards within each column are sorted by due date (soonest/most overdue
first), instead of insertion order. Matters with no due date sort last.
**Files:** `src/pages/matters/MattersList.tsx`

### Phase 2 — Filter/search bar above the board
Add a bar (reusing the pattern already used in `ClientsList.tsx` /
`DocumentVault.tsx`): free-text search (client name/matter title), a client
filter, a service-type filter, and an "Overdue only" quick toggle. Filters
apply across all Kanban columns.
**Files:** `src/pages/matters/MattersList.tsx`

### Phase 3 — List/Table view toggle
Add a List view alongside Kanban (same List/Calendar toggle pattern as
`DocumentVault.tsx`). Sortable table: client, title, service, status, due
date, checklist progress. This is the "find a specific matter" view; Kanban
stays the "what's active today" view. Filters from Phase 2 apply to both
views.
**Files:** `src/pages/matters/MattersList.tsx`

### Phase 4 — Auto-archive old completed matters
Matters marked "Completed" more than 30 days ago are hidden from the default
Kanban board (the "Completed" column shows only recent ones + a count of
older/archived ones). They remain fully visible in List view via a status
filter — nothing is deleted, just decluttered from daily view.
**Files:** `src/pages/matters/MattersList.tsx`

### Phase 5 — Bulk actions in List view
Row checkboxes + a bulk action bar (change status for N selected matters at
once). Only meaningful once List view (Phase 3) exists.
**Files:** `src/pages/matters/MattersList.tsx`, possibly a small
`BulkStatusBar` component if the inline version gets crowded.

## Verification (every phase)

- `npx tsc -b` clean.
- Browser check (Playwright, installed temporarily then removed) covering
  the specific phase's behavior, zero console errors.
- Update `PROGRESS.md` immediately after a phase is verified, before moving
  to the next.
