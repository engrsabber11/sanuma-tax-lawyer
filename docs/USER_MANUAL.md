# Sanuma Practice OS — User Manual

## About this version

This is a working **prototype**. There is no backend server — everything
you enter is saved in your browser's local storage on this device. That
means:

- Your data survives a page refresh, but **not** clearing browser data,
  and it won't appear on a different browser or device.
- Reminders (WhatsApp/Email/SMS) are logged and tracked, but nothing is
  actually sent yet — this version simulates the reminder engine, not the
  delivery.
- There is only one user (you). Multi-staff logins are a planned future
  phase, not built yet.

Everything else — every form, every number, every status change — is real
and functional within the app.

---

## 1. Getting Around

The app has three fixed pieces on every screen:

- **Sidebar** (left) — every module, grouped: Overview, Clients,
  Compliance, Sales & Billing, Practice, and Settings at the bottom.
- **Topbar** (top) — a global search box, a **+ New** quick-add menu, a
  light/dark theme toggle, and your account icon.
- **Main area** — the page itself.

**Global search** — click the search bar or press **Ctrl/Cmd+K** anywhere
to jump straight to a client, invoice, or document by name.

**Quick Add** — the green **+ New** button in the topbar jumps to New
Client, New Matter, New Invoice, or New Document. It takes you to the
right page; you still click that page's own "New" button to open the
form (this keeps each form's fields relevant to where you land).

**Closing dialogs** — any popup form closes with the **X**, by clicking
outside it, or by pressing **Escape**.

---

## 2. Dashboard

Your homepage. Answers "what needs my attention today?" at a glance:

- **KPI cards** — items expiring soon, total outstanding invoices, this
  month's revenue, new clients this month.
- **Revenue vs. Expenses chart** — the last six months.
- **Today's Reminders** — reminders due to go out today.
- **Expiring Soon & Overdue Documents** and **Compliance Filing
  Deadlines** — click through to the client or the Document Vault.
- **Quick Actions** — shortcuts to the four most common "New" actions.

---

## 3. Clients

### 3.1 All Clients

The full client list, with search and filters by business type and
status. Each row shows who referred them, how many compliance items need
attention, and their outstanding balance. Click a row to open their
profile.

### 3.2 Adding a Client (the onboarding wizard)

Click **+ Add Client**. This is a 4-step guided flow, not a giant form:

1. **Basic Info** — name, business name, phone, email. Only name and
   phone are required to move on.
2. **Referral** — search for an existing client who referred this one.
   Pick one and you'll see the full referral chain this client will join
   (e.g. *Ahmed → Fatima → this new client*). Skip if this is a direct
   signup.
3. **Business Type** — pick the closest match (Grocery, Trading, F&B,
   Professional Services, Individual/Other). This instantly loads a
   suggested document checklist for that business type.
4. **Documents** — tick off anything the client already handed you; leave
   the rest unticked to request later.

Your progress is saved automatically as you go — if you navigate away
mid-flow, coming back resumes exactly where you left off.

On finishing, you get a confirmation screen listing exactly which
documents to request from the client, and a button to jump straight to
their new profile.

### 3.3 Client Profile

Six tabs:

- **Overview** — documents needing attention at a glance, and the
  wallet balance.
- **Documents** — every document on file for this client, plus any
  recurring compliance deadlines (VAT/Corporate Tax/ESR filings). Each
  document shows which Matter it's linked to, if any.
- **Matters** — every case file opened for this client.
- **Invoices** — every invoice raised to this client.
- **Referral Tree** — everyone this client has referred, and how many
  sub-referrals each of *those* clients has made.
- **Wallet** — referral bonus balance, with **Withdraw** and **Apply to
  Invoice** actions (see §11).

Use **Edit Client** (top right) to update contact details, TRN, or
status. **New Matter** opens a matter directly for this client.

---

## 4. Matters

A Matter is one service engagement for one client — e.g. "Trade License
Renewal 2026" or "VAT Return — Q2 2026."

### 4.1 Two views

- **Kanban** (default) — five columns: Intake → Documents Collected → In
  Progress → Submitted to Authority → Completed. Cards are sorted by due
  date automatically, most urgent first. Completed matters older than 30
  days are hidden from this board (nothing is deleted — see the "View in
  List" link at the bottom of the Completed column).
- **List** — a sortable table (click any column header to sort, click
  again to reverse). This is the view for finding something specific or
  acting on many matters at once.

### 4.2 Filtering

Above both views: free-text search, a client filter, a service filter,
and an **Overdue only** toggle. All four combine.

### 4.3 Bulk actions (List view only)

Tick the checkbox on any rows (or the header checkbox to select
everything currently shown), then use the bar that appears to move all
of them to a new status in one action — handy after a batch filing day.

### 4.4 Inside a Matter

Click any matter to open it:

- **Status stepper** — advance or move back a stage. Marking a matter
  **Completed** timestamps it (this is what drives the 30-day archiving
  on the Kanban board).
- **Notes** — free text, auto-saved when you click away.
- **Linked Invoice** — shows the invoice tied to this matter, or lets you
  create one directly.
- **Checklist** — every new matter gets a sensible default checklist
  based on its service (e.g. Trade License Renewal auto-fills "Collect
  Ejari → Collect Civil Defense NOC → Submit application → Pay fee →
  Collect renewed license"). Tick items off, add your own custom steps,
  or remove ones that don't apply. The Kanban card shows this progress
  as a small bar.
- **Documents** — the specific documents this matter needs. **Link
  Existing** attaches one of the client's existing documents; **Add New**
  opens the document form pre-filled to this client and matter.

---

## 5. Document Vault & Compliance

Every document and every recurring compliance deadline, across every
client, in one place.

- **List view** — filterable by category (Personal / Business / Tax &
  Regulatory / Financial) and by status (Valid / Expiring soon / Expired
  or overdue). Shows which Matter each document is linked to.
- **Calendar view** — a month grid; each day shows what's due, color-coded
  by urgency.
- **+ Add Document** — record a new document: client, document type,
  number, issue date, expiry date.

---

## 6. Reminders

Two tabs:

- **Reminder Rules** — one row per document type (grouped by category).
  Each rule defines *how many days before expiry* to remind (you can
  stage several, e.g. 60/30/7 days) and *which channels* (WhatsApp,
  Email, SMS). Toggle a rule on/off, or click the gear icon to edit its
  schedule and channels.
- **Reminder Log** — a history of every reminder, who it went to, which
  channel, and whether it was delivered.

---

## 7. Service Catalog

Your price list — every billable service, its description, price, and
whether VAT applies. **+ Add Service** to create a new one; **Edit** on
any card to change its price or details. This list is what populates the
service pickers everywhere else (Matters, Quotes, Invoices).

---

## 8. Quotes & Invoices

- **Quotes tab** — draft a quote for a client (pick services, the total
  calculates automatically). Once a quote's status is "accepted," a
  **Convert to Invoice** button turns it into a real invoice.
- **Invoices tab** — every invoice, sorted by due date. Click one to open
  the full tax-invoice view: client and firm TRN, line items, VAT
  breakdown, and balance due.
  - **Record Payment** — log a full or partial payment; the invoice
    status updates automatically (Unpaid → Partial → Paid).
  - **Download PDF** — opens your browser's print dialog (save as PDF
    from there).

---

## 9. Tax Credit Notes

Two distinct kinds, always labeled clearly:

- **Firm-Issued** — adjusts one of *your own* invoices (a discount,
  waived fee, or cancellation). Flows automatically into Accounting.
- **Client-Advisory** — a credit note you're drafting or reviewing *for a
  client's own business* (e.g. helping them credit a customer for
  returned stock). Tracked as a deliverable, not as your own accounting
  entry.

**+ New Credit Note** lets you pick which kind, the client, the reason,
and the amount (VAT calculates automatically at 5%).

---

## 10. Expenses

Tracks two different things in one list:

- **General firm expenses** — rent, software, salaries, marketing, etc.
- **Client disbursements** — costs you paid on a client's behalf (like a
  government filing fee) that need to be re-billed to them. Mark whether
  it's already been billed.

The three stat cards at the top show this month's total expenses, total
disbursements, and how much is still awaiting re-billing to a client.

---

## 11. Accounting

Five tabs, all fed automatically by activity elsewhere in the app (sales,
payments, credit notes, expenses):

- **Ledger** — every transaction, debit and credit.
- **Profit & Loss** — revenue minus expenses for the period.
- **Receivables** — every unpaid or partially paid invoice and its
  balance.
- **VAT Summary** — output VAT collected vs. input VAT on expenses, and
  the net amount payable to the FTA — a starting point for your VAT
  return, not a substitute for it.
- **Expense Breakdown** — a chart of spending by category.

---

## 12. Referrals & Wallet

- **Bonus Rules** — set how much a referral is worth, per level: a direct
  referral (Level 1) and a sub-referral (Level 2, i.e. someone *your*
  referral brought in), as either a flat AED amount or a percentage.
  Bonuses are only credited once the referred client's invoice is
  actually paid — never just on signup.
- **Client Wallets** — every client's referral count, total earned, and
  current balance.
- **Leaderboard** — your top referrers, ranked.

From a client's own profile, use **Withdraw** (pay out their balance) or
**Apply to Invoice** (offset the balance against something they owe you)
under their Wallet tab.

---

## 13. Settings

- **Business Profile** — your firm's name, TRN, address, and contact
  details. This is what prints on every invoice.
- **Document Types** — the master list of document types the whole app
  uses (Trade License, Emirates ID, VAT Certificate, etc.). **+ Add
  Document Type** to add one not already covered, including its default
  reminder schedule and channels.
- **Team & Access** — currently just you; multi-staff access is planned
  for later.
- **Preferences** — language, currency, and sensitive-document masking
  settings.

---

## 14. A Few Common Workflows

**Onboarding a new referred client, start to finish**
All Clients → + Add Client → fill Basic Info → search and pick the
referrer → pick business type → tick off documents already in hand →
Finish Onboarding → note the suggested documents to request.

**Running a Matter from open to paid**
Matters → New Matter (pick client + service) → open it → work through the
auto-generated checklist, ticking off steps → link or add the documents
it needs → Create Invoice when ready to bill → once the client pays,
open the invoice and Record Payment → advance the matter to Completed.

**A document is about to expire**
Dashboard or Document Vault shows it in amber/red → open the client →
Documents tab to see full details → once renewed, add the new document
record with its fresh issue/expiry dates.

**Paying out a referral bonus**
Referrals & Wallet → Client Wallets to see who has a balance → open that
client's profile → Wallet tab → Withdraw (or Apply to Invoice if they
have an open bill).

**Adjusting an invoice you already sent**
Tax Credit Notes → + New Credit Note → Firm-Issued → pick the client and
the original invoice → state the reason and amount.

---

## 15. Quick Reference

| Shortcut / Action | What it does |
|---|---|
| `Ctrl/Cmd + K` | Open global search from anywhere |
| `Escape` | Close whatever dialog is open |
| Click outside a dialog | Also closes it |
| Sun/Moon icon (topbar) | Toggle light/dark mode |
| Green **+ New** (topbar) | Jump to the New Client/Matter/Invoice/Document page |

