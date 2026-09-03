# Lava Money

A personal finance / net-worth tracker for iOS, Android, and web — one
Expo/React Native codebase, three platforms. Net worth, budgets, spending
trends, recurring-bill detection, and a real transaction feed, styled to
match [LavaMesh](https://www.lavamesh.com)'s dark, orange-accented brand
but built around Copilot Money's structural design patterns (elevated
cards, progress rings, combo charts) — see
[`docs/design-audit-copilot-parity.md`](docs/design-audit-copilot-parity.md)
for a full self-directed UI/UX audit against Copilot/Apple/Vercel, with
before/after screenshots.

**Real bank-linking via [Plaid](https://plaid.com)** on native (iOS/
Android) — a genuine OAuth-style bank connection, not a mock. Every
account can also be added **manually** (a real balance you type in and
edit, real hand-entered transactions, a real CSV importer for bank
export files) or, for a no-signup way to try the app, through
**sample data** that generates ~6 months of realistic mock history. See
[`docs/PLAID_SETUP.md`](docs/PLAID_SETUP.md) for why Plaid, the security
model, and how to test it against Sandbox.

The web build ([lavamoney.io](https://www.lavamoney.io)) is a public,
no-signup demo — it only ever uses the sample-data path, since Plaid Link
requires native code and a backend session neither of which a public demo
page should have.

## Get started

```bash
npm install
npx expo start
```

Press `i` for the iOS simulator or `a` for Android, or scan the QR code
with Expo Go for the sample-data path. Real Plaid linking needs a
dev-client build (`react-native-plaid-link-sdk` is a native module, not
available in Expo Go) — see `docs/PLAID_SETUP.md`. The web target is a
real supported platform (desktop sidebar+grid layout, phone-width single
column below `Breakpoints.wide`), not just a bundling sanity check.

## What's here

- **Onboarding** — a welcome screen, then a real three-way choice:
  "Connect a bank" (real Plaid Link, native only), "Try with sample data"
  (no signup, ~6 months of realistic mock history), or "Add manually"
  (real form, no bank involved).
- **Home** — a full-bleed net-worth hero (uncontained balance, full-width
  gradient chart, a directional-change pill, and an auto-generated
  one-line caption naming the actual biggest driver of the change — "Up
  3% over the last 6 months — mostly from Everyday Checking, which grew
  $2.1k in that span"), a weekly-spend chart against a trailing average,
  a "Needs a look" card consolidating stale-account and category-
  suggestion alerts, account balances with institution avatars and a
  live sync-status dot, pull-to-refresh, and upcoming recurring bills.
- **Account detail** (`/account/[id]`) — an uncontained balance + chart
  matching Home's hero treatment, a real credit-card visual for card
  accounts, sync status with a refresh action (linked/Plaid) or an inline
  balance editor (manual), and for manual accounts: **+ Add transaction**
  and **Import CSV** (auto-detects date/merchant/amount columns, including
  separate debit/credit columns, with a preview before committing).
- **Activity** — every transaction, grouped by day, searchable, tap
  through to a detail view with an editable category, a note field, a
  source tag, delete, and a "More from [Merchant]" section showing recent
  history and average spend at that merchant.
- **Budgets** — a progress-ring hero, per-category limits with a smart
  setup flow that suggests a starting amount per category, and a
  breakdown card for the last complete month.
- **Trends** — a tabbed hero (spend-over-time / by-category) with a
  combo boundary-line + colored-bar chart, an income-vs-spending card for
  the last complete month, and a link out to a dedicated **Recurring**
  page: monthly-equivalent subscription/bill totals plus a per-charge
  list flagging anything actually overdue past its expected date.
  Detected live from transaction history — works identically for linked,
  manual, and CSV-imported accounts.
- **Settings** — linked accounts (grouped by institution, refresh-all),
  manually-tracked accounts, a Categories section (add/delete custom
  categories, review rules-based re-categorization suggestions with a
  visible "why"), a Data & Privacy explainer, and full JSON/CSV export.

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the app is put
  together: directory layout, state management, the design system, and
  several deliberate MVP-scope decisions.
- [`docs/PLAID_SETUP.md`](docs/PLAID_SETUP.md) — the Plaid integration:
  why it reversed an earlier SimpleFIN decision, the security model
  (token encryption, on-device-only transaction data), and how to test
  against Sandbox.
- [`docs/design-audit-copilot-parity.md`](docs/design-audit-copilot-parity.md) —
  a self-directed UI/UX audit against Copilot/Apple/Vercel, with
  before/after screenshots and severity-ranked findings.
- [`docs/HANDOFF.md`](docs/HANDOFF.md) — a running dev log: what shipped
  each session, decisions made, and open questions for the next one.
- [`docs/competitive-analysis-copilot.md`](docs/competitive-analysis-copilot.md) —
  competitive read on Copilot Money and positioning ideas.
- [`docs/STRATEGY.md`](docs/STRATEGY.md) — broader personal-finance market
  research and the product-positioning decisions that shaped what got
  built and why (including the SimpleFIN-vs-Plaid reversal `PLAID_SETUP.md`
  picks back up).

## Stack

Expo SDK 57, React Native, TypeScript (strict), Expo Router, React Context
+ `useReducer` for state, `AsyncStorage` for on-device persistence,
hand-rolled `react-native-svg` charts, Next.js + Prisma 7/Postgres for the
Plaid relay backend. No analytics SDK, no ML categorization (a rules-based
categorizer instead, deliberately explainable over black-box). See
`docs/ARCHITECTURE.md` for the full breakdown.
