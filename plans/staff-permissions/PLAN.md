# Staff Roles & Permissions

**Status:** in-progress · **Decided:** 2026-08-24

Small plan, one page. The decision is made; the remaining work is applying it.

---

## The decision

**Three staff roles.** Confirmed by the client:

| Role | Who | Scope |
|---|---|---|
| `partner` | **The owner of the practice.** Seed: Adv. Muhammad Hannan | Everything, including the firm's own books |
| `consultant` | Senior fee-earner. Seed: Sarah Al Zaabi | Client work end to end |
| `assistant` | Data entry / chasing. Seed: Rashid Al Nuaimi | Documents, reminders, matters |

Renamed from the in-flight `'partner' | 'senior-consultant' | 'associate'` —
`consultant` and `assistant` say what the job is without a hyphen to strip in the
UI.

### The principle

**A decision that cannot be walked back belongs to the owner.** Every
partner-only permission is either money leaving the firm, or a record that has
already gone to the FTA.

## Not staff roles

Two other kinds of user will exist eventually, and they are **not** rows in
`StaffRole` — they have a different data scope, so putting them here would mean
every query asking "is this a staff member or a client?":

| Type | Sees |
|---|---|
| **Client portal** | only their own documents, filings, invoices, wallet |
| **Referrer portal** | only their own referral tree and wallet earnings (§1) |

### A naming collision worth avoiding

"Partner" means three different things in this codebase. Two are fine; the third
must never be called a partner:

| Where | Meaning |
|---|---|
| `role: 'partner'` | the firm's owner |
| `3000 Partner Capital` | the owner's invested capital |
| §1 referral network | **a third-party business that refers clients** — always "Referrer", never "Partner" |

## The matrix

`src/data/permissions.ts` is the single source of truth. `can('penalty.waive')`
from the store answers every question; **no component compares a role string.**

| Permission | Partner | Consultant | Assistant |
|---|---|---|---|
| `client.write` | ✅ | ✅ | ✅ |
| `document.write` | ✅ | ✅ | ✅ |
| `reminder.send` | ✅ | ✅ | ✅ |
| `matter.write` | ✅ | ✅ | ✅ |
| `registration.write` | ✅ | ✅ | ❌ |
| `filing.file` | ✅ | ✅ | ❌ |
| `invoice.create` | ✅ | ✅ | ❌ |
| `expense.write` | ✅ | ✅ | ❌ |
| `penalty.waive` | ✅ | ❌ | ❌ |
| `year.reopen` | ✅ | ❌ | ❌ |
| `creditnote.create` | ✅ | ❌ | ❌ |
| `journal.post` | ✅ | ❌ | ❌ |
| `accounting.view` | ✅ | ❌ | ❌ |
| `config.write` | ✅ | ❌ | ❌ |
| `staff.manage` | ✅ | ❌ | ❌ |

Every restricted permission carries a `PERMISSION_REASON` string, so a disabled
control explains itself rather than just being dead — the same pattern
`canCloseClientYear` already uses to say *why* a year cannot close.

## No fourth role

An **Accountant / Bookkeeper** role was considered and rejected for now. In a
practice this size the owner reads the books, and a role invented ahead of a real
need is one that cannot be removed later. If an external accountant is engaged,
split `journal.post` + `accounting.view` out of `partner` at that point.

---

## Progress

### Done

| Change | File |
|---|---|
| `StaffRole` renamed to `partner \| consultant \| assistant`, with the "not a referral partner" note | `src/data/types.ts` |
| Seed staff updated to the new role strings | `src/data/store.tsx` |
| Permission matrix, reasons, role labels and descriptions | `src/data/permissions.ts` (new) |
| `can(permission)` on the data context, delegating to `roleCan` | `src/data/store.tsx` |

`tsc -b` clean for these files. Lint 15 — the two above baseline are
`only-export-components` in `store.tsx` and `permissions.ts`, the same class the
codebase already carries in `theme.tsx` and `toast.tsx`.

### Also done — quick login (2026-08-24)

Asked for after the matrix landed, and it turned out to fix a real hole.

| Change | File |
|---|---|
| Login screen: three user cards, click to sign in | `src/pages/LoginPage.tsx` (new) |
| Session persisted under its own key; `signIn` / `signOut` / `signedIn` | `src/data/store.tsx` |
| Whole app behind the picker; `/login` redirects when signed in | `src/App.tsx` |
| Sign out in the staff dropdown; switcher no longer `md`-only | `src/components/layout/Topbar.tsx` |
| Role wording from `ROLE_LABEL`, so Topbar and login agree | `src/components/layout/Topbar.tsx` |

**Two bugs this exposed:**

1. `activeStaff` was `useState(DEFAULT_STAFF_MEMBERS[0])` — **not persisted.** Every
   reload silently put you back to the Partner. Switching to Assistant to check a
   permission and refreshing handed you full access again, which would have made
   the gating work below impossible to test honestly.
2. The app opened straight on the Dashboard, so **whoever opened the tab arrived
   as the Partner.** Now nothing renders until a user is chosen, and a deep link
   to `/accounting` shows the picker instead.

The session lives under `sanuma-session-staff-id`, deliberately apart from
`sanuma-app-state-v2`: a session is not data. Clearing demo data should not sign
you out, signing out should not wipe client records, and it survives the
`STORAGE_KEY` bumps this project keeps needing. Verified — demo data intact after
sign-out.

Each card lists the **same five capabilities**, ticked or struck through, so the
difference between roles is visible before you commit rather than discovered
later. No password box: there is no backend to authenticate against, and a box
that accepts anything is worse than none — the screen says so.

Verified: 3 cards render with the right ticks per role · deep link protected ·
sign in as Assistant survives reload (`staff-3`) · Topbar switch to `staff-1` ·
sign out clears the session and keeps the data · 10 routes · **0 console errors**.

### Login form added (2026-08-24)

The picker became a real form: email, password, and a refusal when either is
wrong. The three users sit beside it as **click-to-fill**.

| Change | File |
|---|---|
| `StaffUser.email` | `src/data/types.ts` |
| Seed emails: `hannan@` / `sarah@` / `rashid@sanuma-tax.ae` | `src/data/store.tsx` |
| Demo passwords + `demoPasswordMatches` | `src/data/demoCredentials.ts` (new) |
| `signInWithCredentials(email, password)` returning `{ ok, reason }` | `src/data/store.tsx` |
| Two-column layout: form left, click-to-fill users right | `src/pages/LoginPage.tsx` |

**Why a form and not just the picker.** The rest of the app will be built against
"sign-in can fail" — a picker that always succeeds hides that, and the failure
paths are the ones that get skipped when they are added last. The form refuses an
unknown email, a wrong password, and an empty submit, each with its own message.

`signInWithCredentials` returns a *reason* rather than a bare `false`, so the form
can say which half was wrong. That is deliberately not what production auth should
do — a real login collapses both into one generic failure to avoid confirming
which emails exist. This is a demo whose job is to be learnable, and the
distinction is noted in the code so it is not copied forward by accident.

Passwords live in `demoCredentials.ts`, **not** in the store: a password is not
application state, and separating it means real auth replaces exactly two things —
that file and `signInWithCredentials`. It also kept lint at 14 rather than adding
a non-component export to `store.tsx`.

Credentials, which the screen states are demo-only and readable in the bundle:

| User | Email | Password |
|---|---|---|
| Partner | `hannan@sanuma-tax.ae` | `partner2026` |
| Consultant | `sarah@sanuma-tax.ae` | `consultant2026` |
| Assistant | `rashid@sanuma-tax.ae` | `assistant2026` |

Verified: empty submit refused · unknown email refused · right email + wrong
password refused **with the session left empty** · clicking a card fills both
fields and moves the highlight ring · submitting the filled form signs in as
`staff-2` · reload keeps her · each card fills its own pair · **0 console errors**.

### Not done — this is the part that matters

**`can()` still has no callers.** The matrix and the login screen are both in place, but nothing is
gated: an Assistant can still reopen a closed tax year, waive a penalty fee and
issue a credit note. **A role that exists but blocks nothing is worse than no
role at all, because the UI looks safe.**

Remaining work, in order:

1. Gate the seven owner-only actions in the UI, each disabled with its
   `PERMISSION_REASON` as the tooltip:
   - `WaiveChargeModal` / the Waive Fee button — `penalty.waive`
   - `ReopenYearModal` / Reopen Year — `year.reopen`
   - `NewCreditNoteModal` — `creditnote.create`
   - Settings → Compliance obligation editor, and the future chart editor — `config.write`
   - `/accounting` page and the Dashboard revenue tiles — `accounting.view`
   - Settings → Team — `staff.manage`
2. Gate the four fee-earning actions: `AddRegistrationModal`,
   `FtaSubmissionModal` / mark-filed, `NewInvoiceModal`, `NewExpenseModal`.
3. Guard the store actions too, not only the buttons. A disabled button is a
   convenience; the store function is the actual boundary.
4. Settings → Team: list the three staff with role and description, and make the
   role assignable.
5. Browser pass as each of the three roles, confirming the blocked set matches
   the matrix exactly.

## Also outstanding, unrelated

`plans/double-entry-ledger/` Phase 1 is **mid-flight** — code written and
compiling, verification script not yet run. See that plan's STATUS checkpoint.
Finish one before starting the other.
