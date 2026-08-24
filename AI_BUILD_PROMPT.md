# Sanuma Practice OS — AI Build Prompt

> A practice-management system for a UAE Tax Lawyer / Tax Consultant, built around
> client documents, compliance deadlines, service sales, accounting, and a
> referral network. This document is written to be pasted (in full, or phase by
> phase) into an AI build tool (Claude, v0, Lovable, bolt.new, Cursor, etc.) to
> generate the product UI.

------

## 0. Two-lens analysis this brief is based on

This spec was written wearing two hats at once, per the request:

1. **System architect lens** — module boundaries, data entities, workflow
   states, what's UI-only right now vs. what will need a backend later.
2. **UAE tax lawyer / tax consultant lens** — what documents and compliance
   deadlines this practice actually deals with, what a "Tax Credit Note"
   workflow looks like under FTA (Federal Tax Authority) practice, and what
   the standard industry term is for a client engagement (see §1).

Domain facts below (document types, VAT/Corporate Tax mechanics, credit note
rules) reflect general UAE FTA practice as commonly understood. **Before
going live, the lawyer should confirm current thresholds, rates, and mandatory
credit-note fields against the current FTA Executive Regulations**, since tax
rules get amended.

---

## 1. Naming: is this a "Project"?

UAE law firms and tax-consultancy practices do **not** typically call a
client engagement a "Project" — that term reads as construction/IT, not
legal. The standard practice-management term (used by Clio, MyCase, and most
legal/tax practice software) is:

- **"Matter"** — the correct term for any client engagement that isn't
  strictly litigation: compliance filings, registrations, advisory work,
  document processing. This fits a tax lawyer's day-to-day work perfectly.
- **"Case"** is the term reserved for litigation/court disputes — not what
  this practice mostly does.

**Recommendation: use "Matter" as the system's internal term, but label it
"Case File" in the UI** if that reads more naturally to the lawyer and
clients in casual UAE usage. The build prompt below uses **Matter (Case
File)** throughout — pick one label consistently in the actual UI copy.

---

## 2. Primary user & guiding principle

- **Primary (and for now, only) user: the lawyer themself**, acting as
  sole operator — not a big back-office team. Every screen should assume
  one busy person, not a department.
- **Guiding principle: minimum clicks, maximum clarity.** Every module
  should answer "what needs my attention today?" before anything else.
  Favor dashboards, calendars, and color-coded urgency over deep menus and
  forms.
- Build for **desktop-first, but fully responsive** — the lawyer will
  often check reminders and approve things from a phone.
- Multi-staff / role-based access is a **future phase**, not now — but
  don't design data models that would make adding staff logins painful
  later.

---

## 3. Design quality bar — this must feel premium

The client explicitly wants this to look and feel **beautiful, modern, and
effortless to operate** — not a generic admin panel. Treat visual and
interaction design as a first-class requirement, on par with the functional
spec, not an afterthought layered on at the end.

- Benchmark the feel against best-in-class modern SaaS products (e.g.
  Linear, Stripe Dashboard, Notion, Ramp) for spacing discipline, restrained
  color use, and typography hierarchy — not literally copying them, but
  matching that level of polish.
- A considered, small color palette with one confident accent color — no
  default framework blue, no more than 2–3 semantic colors (success/warning/
  danger) used consistently for urgency states everywhere.
- Consistent spacing/sizing scale, refined iconography (one icon set,
  consistent stroke weight), clear type hierarchy (don't rely on bold/size
  alone to show importance).
- Every state designed, not just the happy path: empty states (e.g. "no
  documents yet — add the first one"), loading/skeleton states, error
  states, success confirmations — all styled, none left as browser defaults.
- Purposeful micro-interactions: subtle transitions on hover/state-change,
  smooth panel/modal transitions, satisfying confirmation moments (e.g.
  after completing client onboarding or recording a payment) — tasteful,
  not gratuitous animation.
- This quality bar applies across **every module**, not just the dashboard —
  including the accounting and expense screens, which are usually the first
  to be treated as an afterthought.

---

## 4. Document & compliance types this practice must track

A UAE tax lawyer serving SME clients (e.g. grocery/retail, trading, F&B)
typically manages far more than NID/Visa/Trade License/VAT. Group them by
category so the UI can present them cleanly, and make the type list
**admin-editable** (never hard-coded) since new document types will appear.

### A. Individual / personal documents (per owner, partner, or key staff)
- Emirates ID (EID)
- Passport
- Residence Visa (and visa sponsor info)
- Labor Card / Establishment Card (MOHRE)

### B. Business licensing documents
- Trade License (DED, or relevant Free Zone authority) — annual renewal
- Chamber of Commerce Membership Certificate
- Municipality Trade/Health Permit (critical for grocery/F&B — food
  trade permit, food safety/hygiene certificate)
- Civil Defense / Fire & Safety NOC (mandatory for retail/grocery premises)
- Ejari / Tenancy Contract registration
- Signage & Advertisement Permit (municipality)
- Import/Export Customs Code

### C. Tax & regulatory documents
- VAT Registration Certificate (TRN) — doesn't expire, but drives
  recurring **VAT Return filing deadlines** (monthly/quarterly, ~28 days
  after period end)
- Corporate Tax Registration Certificate — drives annual **Corporate Tax
  Return filing deadline**
- Excise Tax Registration (if applicable to the client's goods)
- Economic Substance Regulations (ESR) Notification & Report — annual
  deadlines
- Ultimate Beneficial Owner (UBO) Declaration — periodic update
- AML/CTF Registration (goAML) — relevant if client falls under DNFBP
  categories

### D. Financial / insurance documents
- Bank account KYC renewal documents
- General Liability / Workmen's Compensation insurance policies

> **Important architectural distinction:** treat these as **two related but
> different trackable things**:
> - **Documents** — have an issue date + expiry date, renewed periodically
>   (Trade License, EID, Visa, Passport, insurance, Ejari…).
> - **Recurring compliance deadlines** — don't "expire," they recur on a
>   cycle (VAT return every period, Corporate Tax return annually, ESR
>   report annually). These need the same reminder engine but a different
>   date model (next due date, recurrence rule) rather than expiry date.
>
> Both feed the same Reminder Engine (§6.3) and the same "what's due soon"
> dashboard.

---

## 5. Terminology map (for consistent UI copy)

| System term | Meaning |
|---|---|
| Client | The business or individual the lawyer serves |
| Matter (Case File) | One engagement/service instance for a client |
| Document | A trackable file with issue/expiry dates |
| Compliance Deadline | A recurring filing obligation (VAT/CT/ESR return) |
| Service | A billable offering in the price list (e.g. "VAT Registration") |
| Referrer | The existing client who referred a new client |
| Sub-reference | A client referred by someone who was themselves referred (chain, not just one level) |

---

## 6. Core modules

### 6.1 Client Management (with referral tree)
- Client profile: individual or business, trade name, TRN, contact
  (phone/WhatsApp/email), linked owners/partners.
- **Referral chain, not just a flat "referred by" field:** every client can
  have a `referred_by` pointing to another client, forming a tree of
  unlimited depth (Client A refers B, B refers C, C refers D…). The UI must
  show this as a **visual referral tree/org-chart per client**, plus let you
  jump to any node.
- Client list with filters: by referrer, by status, by upcoming
  expiry/deadline count, by outstanding balance.
- Document checklist templates per client type (e.g. "Grocery Shop
  Onboarding" auto-suggests: Trade License, Municipality Food Permit,
  Civil Defense NOC, Ejari, Owner EID/Visa, VAT registration…) so the
  lawyer never forgets to request a document type for a given business.

#### 6.1a Client Onboarding Flow — critical path, must be effortless

This is one of the most important screens in the whole system: the lawyer
will run through it constantly, often while talking to a client on the
phone. It must never feel like filling out a government form.

- **One guided flow, not a giant form.** Progressive steps, each short:
  1. Basic info (name, business name, phone/WhatsApp, email) — the only
     truly required fields to save a client.
  2. Referral — type-ahead search over existing clients to set
     "referred by"; the moment one is picked, instantly show where this
     new client will sit in that referrer's chain (visual, not a dropdown
     ID). Skippable if no referrer.
  3. Business type — pick from a short list (grocery, trading, F&B,
     services, other); selecting one **instantly auto-populates the
     suggested document checklist** (§6.1) so the lawyer immediately sees
     what to request from the client, without hunting through settings.
  4. Optional: add first documents now, or skip and add later — never
     block finishing onboarding on having documents in hand yet.
  - **Autosave at every step** — closing halfway through should not lose
    data; the client should land back in "in-progress" state resumable
    later.
  - Finish with a clear success moment and an immediate "what's next"
    prompt (e.g. "3 documents suggested — request these from [Client]"),
    not just a redirect to a blank profile.
  - Whole flow should be completable in well under a minute for the common
    case (existing referrer, known business type).

### 6.2 Document Vault & Compliance Tracker
- Per-client document records: type, document number, issue date, expiry
  date, uploaded file, status (valid / expiring soon / expired / renewal in
  progress).
- Per-client compliance deadlines: type, recurrence (monthly/quarterly/
  annual), next due date, status.
- **Color-coded urgency**: green (valid, >X days), amber (approaching),
  red (expired/overdue) — thresholds configurable globally and per type.
- **Global calendar/timeline view** across all clients: every expiry and
  every filing deadline on one visual calendar, filterable by type/client.
- Document search across all clients (by number, client name, type).

### 6.3 Reminder / Notification Engine
- **Reminder rules are configurable per document type / deadline type**,
  not hard-coded:
  - How many days before expiry/due-date to start reminding (e.g. Trade
    License: 60/30/7 days; Visa: 90/30 days; VAT return: 14/3 days) — support
    **multiple staged reminders**, not just one.
  - Which channels to use per rule: WhatsApp, Email, SMS/Text — each
    toggle-able independently, and combinable (e.g. WhatsApp + email
    together for high-priority items).
  - Optional per-client override of the default rule.
- Reminder log per document/deadline: what was sent, when, via which
  channel, delivery status.
- A **"Today's reminders" / "Upcoming this week" widget** on the dashboard.
- Design the UI assuming actual sending will later go through a WhatsApp
  Business API provider, an email service, and an SMS gateway (e.g.
  Twilio or a UAE-local provider) — build the settings screens for these
  integrations now even if wiring is deferred.

### 6.4 Matter (Case File) Management
- A Matter ties together: one client, one service being delivered, the
  documents involved, a status pipeline (e.g. **Intake → Documents
  Collected → In Progress → Submitted to Authority → Completed**), notes/
  tasks, and the linked sales invoice.
- Matter list view with status filters and overdue-task highlighting.

### 6.5 Sales & Service Catalog
Treat every engagement as a sale, the way the lawyer described it:
- **Service/price list** (e.g. VAT Registration, Trade License Renewal,
  VAT Return Filing, Tax Credit Note preparation, Corporate Tax Filing…),
  each with a default price and default VAT treatment (lawyer's own
  services are themselves subject to 5% VAT once registered).
- **Quote → Invoice pipeline**: draft quote, send, convert to invoice on
  acceptance.
- Invoice must show TRN, VAT breakdown, due date, payment status
  (unpaid/partial/paid/overdue), and link back to the Matter and Client.
- Payment recording (bank transfer, card, cash) with partial-payment
  support.
- Professional PDF invoice template (FTA-compliant tax invoice fields).

### 6.6 Tax Credit Note Module
Two distinct use cases, both should exist:
1. **Firm-issued Credit Notes** — when the lawyer's own invoice needs
   adjusting (discount, waived fee, cancelled service), FTA rules require a
   proper Tax Credit Note referencing the original tax invoice, with:
   supplier TRN, credit note number/date, reference to original invoice
   number, reason for adjustment, value/VAT difference. Must reduce the
   client's outstanding balance and flow into accounting automatically.
2. **Client-facing advisory Tax Credit Notes** — as a *deliverable service*
   the lawyer prepares/reviews for a client's own business (e.g. the
   grocery client needs to issue a credit note to one of their customers).
   Track this as a Matter/service type with its own document record (the
   credit note the lawyer helped produce), not as the firm's own
   accounting entry.
- UI should make it obvious which of the two a given Credit Note record is.

### 6.7 Expense & Disbursement Management
- General firm expenses (rent, software, salaries) — categorized, with
  receipt attachment.
- **Disbursements**: costs paid by the lawyer on a client's behalf (e.g.
  government filing fees) that get re-billed to that client — must link to
  a Client/Matter and flow into that client's next invoice.
- Expense list with category filters, monthly totals.

### 6.8 Accounting
- Simple chart of accounts suited to a small practice.
- Auto-generated ledger entries from Sales invoices, Credit Notes,
  Expenses, and Wallet transactions (§6.9) — the UI should show these as
  connected, not siloed modules.
- Reports: Profit & Loss, outstanding receivables, VAT collected vs. VAT
  payable summary (a lightweight VAT-return-prep helper report), expense
  breakdown.
- Export to Excel/PDF for every report and list.

### 6.9 Referral Bonus & Wallet Management
- Configurable bonus rules **per referral level**, not just direct
  referrals — e.g. Level 1 (direct referrer) gets X% or a flat AED amount,
  Level 2 (the referrer's referrer) gets Y%, deeper levels optional/off by
  default. Fully configurable in settings.
- Bonus triggers when the referred client's invoice is paid (not just
  signed up) — avoids paying out on unpaid work.
- **Wallet per client**: running balance of earned bonuses, transaction
  history (credits from referrals, debits from withdrawal or from being
  applied against that client's own invoice).
- Withdrawal request flow (mark as paid out) and "apply wallet balance to
  invoice" option at billing time.
- Referral leaderboard view — nice motivator, shows top referrers.

### 6.10 Dashboard
The screen the lawyer sees first, every day. Must summarize:
- Documents/deadlines expiring soon (color-coded, clickable).
- Today's/this week's reminders due to send.
- Outstanding invoices / overdue payments.
- This month's revenue, expenses, net.
- New client signups and pending referral bonuses.
- Quick-add buttons: New Client, New Matter, New Invoice, New Document.

---

## 7. UI/UX requirements

- Global search (client name, document number, invoice number) accessible
  from anywhere (e.g. a command palette, `Cmd/Ctrl+K` style).
- Light and dark mode, both fully designed (not just inverted colors).
- Fully responsive — usable comfortably on a phone for checking
  reminders/status on the go.
- Arabic + English UI toggle is worth considering given the UAE market —
  flag as a nice-to-have, not required for v1.
- Sensitive documents (EID, passport, visa) — UI should visually indicate
  these are sensitive/restricted, in anticipation of access-control being
  added later (aligns with UAE PDPL data-protection expectations).
- See §3 for the overall design quality bar — it applies to every screen
  listed in §6.

---

## 8. Suggested entities (for UI/data consistency — no backend required yet)

`Client`, `ReferralLink (client → referred_by client)`, `Document`,
`DocumentType`, `ComplianceDeadline`, `ReminderRule`, `ReminderLog`,
`Matter`, `Service`, `Quote`, `Invoice`, `InvoiceLine`, `CreditNote`,
`Payment`, `Expense`, `Disbursement`, `LedgerEntry`, `Wallet`,
`WalletTransaction`, `ReferralBonusRule`.

---

## 9. Phased build plan

**Phase 1 is a full UI/UX prototype only** — every module below, fully
designed and clickable with realistic sample/dummy data, no real backend
logic, no persistence, no integrations. The goal is to let the lawyer walk
through the *entire* system end-to-end and validate the experience before
any real functionality is built. Only after this prototype is reviewed and
approved should later phases add real data handling, logic, and
integrations.

### Phase 1 — Full UI/UX Prototype (all modules)
Build a high-fidelity, fully navigable prototype covering every module in
§6, using the design quality bar in §3 throughout:
- App shell: navigation, dashboard (§6.10), light/dark theme, global search/
  command palette.
- Client Management + the full **Client Onboarding Flow** (§6.1a) — this
  should be the single most polished flow in the prototype, since it was
  specifically called out as needing to be smooth and easy.
- Referral tree visualization (§6.1).
- Document Vault & Compliance Tracker, including the calendar/timeline
  view and color-coded urgency (§6.2).
- Reminder engine configuration screens (§6.3), shown with sample rules
  and a sample reminder log (sending itself is out of scope for the
  prototype).
- Matter (Case File) management with its status pipeline (§6.4).
- Sales & Service Catalog: price list, quote/invoice screens, sample PDF
  invoice preview (§6.5).
- Tax Credit Note screens, both flows (§6.6).
- Expense & Disbursement screens (§6.7).
- Accounting screens: ledger view and the report screens, populated with
  sample numbers (§6.8).
- Referral Bonus rule configuration, per-client Wallet view, referral
  leaderboard (§6.9).
- All screens populated with realistic **sample/dummy data** — enough
  variety to show empty states, in-progress states, urgent/overdue states,
  and completed states, not just one happy-path example.

> Everything below is **future work**, only to be scoped in detail once
> Phase 1 is reviewed and signed off. Kept brief intentionally.

### Phase 2 — Client & Document data becomes real
Wire up real data persistence for Clients, Referral tree, Documents,
Compliance deadlines, and Reminder rules (still no external send
integrations).

### Phase 3 — Matters, Sales & Invoicing become real
Real Matter workflow state, real Quote→Invoice generation and PDF export,
real payment recording.

### Phase 4 — Tax Credit Notes & Expenses become real
Real credit note generation linked to real invoices; real expense/
disbursement entry flowing into a client's next invoice.

### Phase 5 — Accounting & Reporting become real
Real ledger generation from the modules above; real exportable reports.

### Phase 6 — Referral Bonus automation, Wallet, integrations
Real bonus calculation on invoice payment, real wallet ledger, and wiring
the actual WhatsApp/Email/SMS providers into the Reminder Engine.

---

## 10. Explicitly flagged as "you didn't ask for this but you'll want it"

- Recurring compliance deadlines (VAT/CT/ESR filings) as a first-class
  concept alongside document expiry (§4 note) — easy to conflate, but the
  date logic differs (fixed expiry vs. recurring due date).
- Disbursement re-billing (§6.7) — a standard legal-billing concept the
  brief didn't mention but that "expense management" for a lawyer strongly
  implies (paying government fees on behalf of clients).
- Document-checklist templates per business type (§6.1) — saves the lawyer
  from manually remembering which of the ~15 document types applies to a
  given client's business, and doubles as the engine behind a smooth
  onboarding flow (§6.1a).
- Multi-level (not just one-level) referral bonus configuration (§6.9) —
  the brief said "reference and sub-reference," which implies a chain, so
  the bonus rule needs a per-level setting, not a single flat rule.
- Wallet-to-invoice offset (§6.9) — lets a referral bonus reduce a client's
  own bill, not just sit as a cash balance.
- Sensitive-data visual flagging (§7) — worth building in now since this
  system stores Emirates ID/passport/visa data.
- Global calendar/timeline and command-palette search (§6.2, §7) — the
  single most useful "easy for one operator" feature and easy to forget
  when thinking module-by-module.
- A dedicated design-quality bar (§3) and treating the client-onboarding
  flow as its own carefully designed sub-flow (§6.1a), both called out
  explicitly as must-haves rather than left implicit in the feature list.
