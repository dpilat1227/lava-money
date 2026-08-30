# Lava Money

A personal finance / net-worth tracker for iOS and Android — Copilot Money's
core loop (net worth, budgets, spend trends, one clean transaction feed),
styled to match [LavaMesh](https://www.lavamesh.com)'s dark, orange-accented
brand, but built around a different premise: **bank-linking is optional, not
required.**

Every account can either be "linked" (a Plaid-Link-style simulated flow that
generates ~6 months of realistic mock transaction history, so the seam is
ready for a real provider later — see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md))
or added **manually** — a real, fully-functional path today, not a mock. A
manual account gets a real balance you type in and edit, real hand-entered
transactions, and a real CSV importer that reads an actual bank export file.
Nothing about the manual path is a placeholder; it's the feature that makes
LavaMesh's own "you own your data" identity mean something for a finance app,
instead of just being marketing copy on top of a Plaid dashboard.

Linked accounts also carry a **connection-health status** (synced / stale /
error, with a "why is this out of date" banner and a refresh action) —
modeled now, ahead of any real bank-data provider, because every competitor
in this category shares the same top user complaint: silent, stale sync.
Building the UI for that honestly from day one means it doesn't get bolted
on later as an afterthought once a real provider exists.

## Get started

```bash
npm install
npx expo start
```

Then press `i` for the iOS simulator or `a` for Android, or scan the QR code
with Expo Go. This app is dark-only and native-tab-based (`NativeTabs`), so
it's best evaluated on an actual simulator/device rather than the web preview
— the web target exists purely as a fast bundling sanity check.

## What's here

- **Onboarding** — a welcome screen, then a real choice: "Connect a bank"
  (simulated linking flow) or "Add manually" (real form, no bank involved).
- **Home** — net worth, a 6-month trend chart, account balances (each with
  a sync-status line — "Synced 2h ago," "Manual · updated by you," "Stale,"
  "Connection issue"), a "needs attention" banner when a linked account's
  sync has gone stale or failed, upcoming recurring bills.
- **Account detail** (`/account/[id]`) — balance, sync status with a
  refresh action (linked) or an inline balance editor (manual), and for
  manual accounts: **+ Add transaction** (a real hand-entry form) and
  **Import CSV** (a real file picker + parser that auto-detects date/
  merchant/amount columns, including separate debit/credit columns, and
  shows a preview before committing).
- **Activity** — every transaction, grouped by day, searchable, tap through
  to a detail view with an editable category, a note field, a source tag
  (linked / manual / imported), and delete.
- **Budgets** — per-category monthly limits with progress bars; tap any
  category to set or edit its limit.
- **Trends** — income vs. spending by month, a spending-by-category donut
  with a 1/3/6-month range toggle, and a **Recurring & subscriptions**
  card: monthly-equivalent subscriptions/bills totals, plus a per-charge
  list flagging anything overdue past its expected date ("may have
  lapsed"). Detected live from transaction history — works for linked,
  manual, and CSV-imported accounts alike, not just simulated-linked ones.
- **Settings** — linked accounts (grouped by institution, with a
  "refresh all" that surfaces how many need attention) and manually-tracked
  accounts, in two separate sections; a **Categories** section to add/
  delete custom categories beyond the starter list, plus a "review
  suggestions" flow for transactions a rules-based categorizer thinks it
  can re-categorize out of "Other" (with a visible "why" — e.g. "matched
  known merchant"); a **Data & Privacy** section that exports everything as
  JSON (full backup) or CSV (transactions only) through the OS share sheet;
  reset all local data.

All data lives on-device via `AsyncStorage`. Nothing is sent anywhere unless
you tap Export yourself.

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the app is put
  together, and the seam where a real bank-data provider slots in.
- [`docs/HANDOFF.md`](docs/HANDOFF.md) — what's done, what's deliberately
  cut for the MVP, and open decisions for the next session.
- [`docs/competitive-analysis-copilot.md`](docs/competitive-analysis-copilot.md) —
  brief competitive read on Copilot Money and positioning ideas for Lava
  Finance.
- [`docs/STRATEGY.md`](docs/STRATEGY.md) — broader personal-finance market
  research, product positioning, and the roadmap decisions that shaped
  what got built and why.
