# Lava Finance

A personal finance / net-worth tracker for iOS and Android — Copilot Money's
core loop (net worth, budgets, spend trends, one clean transaction feed),
styled to match [LavaMesh](https://www.lavamesh.com)'s dark, orange-accented
brand instead of a generic fintech template.

This is a demo build: there is no real bank connection. "Linking an account"
runs a Plaid-Link-style simulated flow and generates ~6 months of realistic
mock transaction history so every screen has real data to render, not empty
states. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for exactly where
a real provider (Plaid, Teller, etc.) would plug in later.

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

- **Onboarding** — a welcome screen, then "link an account" (pick a fake
  institution, watch a simulated Plaid-Link-style connect sequence).
- **Home** — net worth, a 6-month trend chart, account balances, upcoming
  recurring bills.
- **Activity** — every transaction, grouped by day, searchable, tap through
  to a detail view with an editable category and a note field.
- **Budgets** — per-category monthly limits with progress bars; tap any
  category to set or edit its limit.
- **Trends** — income vs. spending by month, and a spending-by-category
  donut with a 1/3/6-month range toggle.
- **Settings** — manage linked accounts, link another, reset all local data.

All data lives on-device via `AsyncStorage`. Nothing is sent anywhere.

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the app is put
  together, and the seam where a real bank-data provider slots in.
- [`docs/HANDOFF.md`](docs/HANDOFF.md) — what's done, what's deliberately
  cut for the MVP, and open decisions for the next session.
- [`docs/competitive-analysis-copilot.md`](docs/competitive-analysis-copilot.md) —
  brief competitive read on Copilot Money and positioning ideas for Lava
  Finance.
