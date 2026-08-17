# Matters Scale Improvements — Current Execution State

Last updated: 2026-07-21

| Phase | Status | Notes |
|---|---|---|
| 1. Sort by urgency in Kanban columns | done | Cards in each column sorted by daysUntil(dueDate) ascending; no-due-date matters sort last. Verified: no console errors, order confirmed correct in browser. |
| 2. Filter/search bar | done | Search + client filter + service filter + "Overdue only" toggle, all combinable. Verified counts match expectations (client filter 10→2, overdue 10→1, search "VAT" 10→3), zero console errors. |
| 3. List/Table view toggle | done | Kanban/List toggle added; sortable table (click any column header, click again to reverse) with Matter/Client/Service/Status/Checklist/Due Date columns; row click navigates to matter detail. Verified sort asc/desc and default due-date sort all correct, zero console errors. |
| 4. Auto-archive old completed matters | done | Added `Matter.completedAt`, auto-set/cleared in `updateMatter` when status flips to/from 'completed'. Completed matters older than 30 days hidden from Kanban's Completed column, replaced with a "+N completed over 30 days ago — View in List" link; fully visible in List view. Verified: 1 archived (46 days), 2 recent shown, link switches view and archived one is present in List. Zero console errors. |
| 5. Bulk actions in List view | done | Row checkboxes + header select-all, a bulk bar (status Select + Apply with loading state + Clear selection) appears when ≥1 row selected. Verified: selecting 2 non-completed matters and applying "Completed" changed both correctly, bar cleared after apply, zero console errors. |

## All phases complete — 2026-07-21

Matters page now scales: sorted-by-urgency Kanban, full filter bar (search/
client/service/overdue), a sortable List view, 30-day auto-archiving of
completed matters (nothing deleted, just decluttered), and bulk status
changes from List view.

## How to resume

If a session ends mid-plan, read `PLAN.md` for the phase's scope, then
continue from the first `pending`/`in-progress` row here.
