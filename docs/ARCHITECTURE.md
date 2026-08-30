# Architecture

## Stack

- **Expo SDK 57 / React Native 0.86 / React 19**, TypeScript, strict mode.
- **Expo Router** (`src/app`) for file-based routing, using
  `expo-router/unstable-native-tabs` (`NativeTabs`) for the bottom tab bar —
  a real native `UITabBar`/Material bottom nav, not a JS-rendered one, so it
  matches platform feel and gets things like SF Symbols for free.
- **React Context + `useReducer`** for app state (`src/lib/store`). No
  Redux/Zustand/etc — the state shape is small (a handful of arrays) and a
  single reducer is easier to read end-to-end than spreading logic across a
  state-management library's conventions.
- **`AsyncStorage`** for persistence — the entire state is serialized to one
  JSON blob under one key. Fine at this scale (a few hundred transactions);
  would move to SQLite (`expo-sqlite`) before this became a real product
  with years of transaction history.
- **`react-native-svg`** for all charts (net worth line, category donut,
  income/expense bars) — hand-rolled, no charting library. At three simple
  chart types this was less code and less bundle size than pulling in
  Victory/Recharts-native, and it's fully themeable to exact brand colors.

## Directory layout

```
src/
  app/                  Expo Router routes (file-based)
    _layout.tsx         Root: fonts, FinanceProvider, onboarding-vs-app switch
    (tabs)/             NativeTabs group: index, transactions, budgets, trends, settings
    link-account.tsx    Modal: "add an account" -> chooser -> link OR manual flow
    account/[id].tsx    Modal: account detail -- balance, sync status/refresh
                        (linked) or edit-balance (manual), add transaction,
                        CSV import, unlink/remove
    transaction/[id].tsx  Modal: transaction detail + category/note editing/delete
  screens/              Larger composed flows not tied to a single route
    OnboardingFlow.tsx  First-run welcome -> chooser -> link OR manual flow
    AddAccountChooser.tsx  Shared "connect a bank" vs. "add manually" choice,
                        used by onboarding and the link-account modal alike --
                        presented as equal paths, not a fallback
    LinkAccountFlow.tsx Shared institution-picker -> fake-link -> success
                        sequence
    ManualAccountFlow.tsx  Shared name/type/balance form -> success sequence
                        for hand-added accounts
  components/
    ui/                 Design-system primitives (Text, Card, Amount, Button,
                        ProgressBar, Badge, CategoryIcon, EmptyState, ScreenHeader)
    charts/             NetWorthChart, CategoryDonut, FlowBarChart
  lib/
    types.ts            Core data model (Account, Transaction, Category, ...)
                        including AccountSource ('linked' | 'manual') and
                        SyncStatus ('synced' | 'stale' | 'error' | 'manual')
    store/
      FinanceContext.tsx  App state: reducer + actions + selectors-by-hook.
                        Actions now include addManualAccount,
                        updateAccountBalance, addTransaction,
                        updateTransaction, deleteTransaction,
                        importTransactions, refreshAccount, refreshAllLinked
      persistence.ts      AsyncStorage read/write
    mock/
      generator.ts        Produces ~6 months of accounts + transactions for
                          one newly-linked institution, including a rolled
                          connection-health state per account (see below)
      categories.ts        Fixed category list (income/expense/transfer)
      institutions.ts       Fictional institution list for the link flow,
                          plus MANUAL_INSTITUTION (the placeholder
                          "institution" every hand-added account belongs to)
    utils/
      date.ts / currency.ts / rng.ts / netWorth.ts    (as before)
      csv.ts              Hand-rolled CSV parser for transaction import
                          (auto-detects Date/Merchant/Amount or Date/
                          Merchant/Debit/Credit column layouts) + a CSV
                          serializer for export
      sync.ts             Turns an Account's source/syncStatus into a label,
                          color, and "is this actionable" flag for the UI
      export.ts           Full-state JSON export and transactions-only CSV
                          export, both via the OS share sheet
  hooks/
    useFinanceSelectors.ts  Derived data: net worth history, budget progress,
                            monthly income/expense, grouped transactions, etc.
  constants/theme.ts    Design tokens ported from LavaMesh's `app/globals.css`
```

## Why onboarding isn't a router screen

`RootLayout` renders either `<OnboardingFlow />` or the real `<Stack>`
(tabs + modals) based on whether `accounts.length === 0`. Onboarding itself
is a plain component with local step state (`welcome` -> `linking`), not a
set of `/onboarding/*` routes. Reasoning: there's nothing to deep-link to
before a single account exists, and switching the top-level tree like this
avoids a redirect race between the native tab navigator mounting and the
"do we have zero accounts" check running. Once `linkInstitution()` resolves
and `accounts` goes non-empty, this same component swaps out for the tab
stack automatically on the next render — no navigation call required.

## The mock-data seam (where a real bank connection would go)

Everything downstream of `lib/types.ts` (budgets, trends, net worth,
transaction list) only depends on those shapes — `Account`, `Transaction`,
`Category`, `RecurringSeries`. Nothing in a screen or hook knows or cares
that the data came from `lib/mock/generator.ts`.

To wire in a real provider (Plaid, Teller, Finicity, etc.) later:

1. Write an adapter that calls the real API and maps its response into
   `Account[]` / `Transaction[]` matching `lib/types.ts`.
2. **Watch the sign convention.** Plaid returns positive amounts for money
   leaving an account, negative for money coming in — backwards from what
   you'd want to render directly. This app uses the intuitive convention
   (negative = spend, positive = income) everywhere internally; negate at
   the adapter boundary, not throughout the app. See the header comment in
   `lib/types.ts`.
3. Replace the call to `generateBankData()` in
   `FinanceContext.tsx`'s `LINK_INSTITUTION` action with a call into the
   real adapter (likely becoming async — the action/reducer would need to
   move to an async thunk-style flow at that point, e.g. dispatch a
   "loading" state, await the adapter, then dispatch the result).
4. `buildNetWorthHistory()` (`lib/utils/netWorth.ts`) currently
   reconstructs history by "unwinding" transactions from the current
   balance. That only works for as far back as you have transaction
   history for. Once real data is flowing, switch to actually storing a
   `NetWorthPoint` snapshot on a monthly cron/schedule instead, and use the
   reconstruction function only as a bootstrap for brand-new accounts that
   don't have snapshots yet.
5. Recurring-bill detection (`RecurringSeries`) is currently generated
   directly from the mock generator's own templates — it isn't "detected,"
   it's known upfront because the generator wrote the data. A real adapter
   needs an actual detection pass (group by merchant + amount tolerance +
   interval) once real, noisy transaction data exists to detect patterns in.

## Manual accounts: the data-ownership path, not a fallback

`Account.source` is `'linked'` or `'manual'`. Manual accounts are a real
feature, not a stub waiting for Plaid:

- Created via `ManualAccountFlow` -> `addManualAccount()`, which assigns
  `institutionId: MANUAL_INSTITUTION.id` so the rest of the app (which
  groups everything by institution) doesn't need a separate code path for
  accounts that were never linked to anything.
- Balance is user-owned and directly editable (`updateAccountBalance()`),
  the same way a person manually tracking a net-worth spreadsheet updates
  one number periodically -- it deliberately does *not* try to reconcile
  against a running transaction total, because a manual account's
  transaction history is optional detail, not the source of truth for its
  balance.
- Transactions can be added by hand (`addTransaction()`, one row at a time,
  via a bottom sheet on the account detail screen) or bulk-loaded from a
  CSV export (`importTransactions()`, via `lib/utils/csv.ts`). Every
  transaction carries an `entrySource` (`'manual'` | `'import'` | implicitly
  `'linked'` for generated ones) purely as a cosmetic tag in the detail
  view -- nothing downstream branches on it.
- The CSV importer (`parseTransactionsCsv`) is intentionally narrow, not an
  RFC4180 library: it auto-detects a Date column, a Merchant/Description
  column, and either a single signed Amount column or separate Debit/Credit
  columns (negating Debit), which covers the large majority of real bank/
  card CSV exports. Malformed rows are skipped and counted, not fatal to
  the whole import -- the user sees a preview (row count + warnings) before
  anything is committed.
- File reading is platform-branched in `app/account/[id].tsx`: web uses the
  `File` object `expo-document-picker` returns directly (`.text()`); native
  uses `expo-file-system/legacy`'s `readAsStringAsync` against the picked
  URI. (`expo-file-system`'s SDK 57 default export is the *new*
  `File`/`Directory`/`Paths` API, which dropped `cacheDirectory` and
  `writeAsStringAsync` -- this app deliberately imports from
  `expo-file-system/legacy` instead, since that's the smaller change for
  code that just needs "read this string" / "write this string.")

## Connection health: modeled ahead of a real provider

`Account.syncStatus` (`'synced' | 'stale' | 'error' | 'manual'`) exists
today even though there's no real bank connection to fail. This is
deliberate groundwork, not scope creep: every competitor profiled in the
personal-finance market research shares the same top complaint --
Plaid/MX sync flakiness, stale balances, silent failures -- and the
research explicitly recommended designing this UI *before* a real provider
exists, since it's cheap to plan for now and expensive to retrofit later.

- `lib/mock/generator.ts`'s `rollSyncState()` assigns each newly-"linked"
  account a plausible status (~70% synced, ~22% stale, ~8% error) with a
  matching `lastSyncedAt`, so the UI's full range of states is visible from
  a fresh install rather than only after something has gone wrong for real.
- `refreshAccount()` / `refreshAllLinked()` simulate a refresh (almost
  always succeeds; ~8% chance of `error`, purely so the error-state UI
  stays reachable without waiting on the initial random roll). A failed
  refresh does **not** move `lastSyncedAt` forward -- that field means
  "last successful sync," so a failure has to leave it where it was.
- `lib/utils/sync.ts` (`presentSyncStatus`, `needsAttention`) is the single
  place that turns those fields into a label/color/actionable flag, used by
  the Home account rows, the Home "needs attention" banner, the Settings
  linked-accounts list, and the account detail screen -- one source of
  truth for what "stale" looks like everywhere it appears.
- When a real provider adapter lands (see the seam above), it should set
  `syncStatus`/`lastSyncedAt` from its own webhook/poll results instead of
  `rollSyncState()`/`simulateRefresh()` -- the UI layer doesn't need to
  change at all, since it already only reads those two fields.

## Known limitations (deliberate, for an MVP)

- No light mode. LavaMesh itself has no light mode; matching that was a
  choice, not an oversight.
- No cross-account transfers modeled in mock data (e.g., a checking-to-
  savings transfer, or a credit card payment) — the `isTransfer` flag exists
  in the type and is respected by budget/spend calculations, but the
  generator never actually produces one yet. Credit card balances only grow
  across the generated window; they're never paid down in the mock data.
- No auth, no multi-user, no cloud sync — single local user, single device.
- Category list is fixed (no custom categories yet).
- `react-native-svg`'s `<G rotation origin>` (used by the category donut)
  logs a harmless `transform-origin` DOM-property warning on the **web**
  target only; doesn't occur on iOS/Android, which are the actual targets.
- Manual account balances and their transaction history are independent —
  adding/importing/deleting transactions on a manual account never
  recalculates its balance. This mirrors how people actually use a manual
  net-worth tracker (periodically retype the number), and avoids inventing
  reconciliation rules (starting balance? which transactions count?) that
  the product hasn't actually decided on yet. If "balance should follow
  from transactions" becomes the desired model later, that's a product
  decision to make deliberately, not a bug to fix.
- CSV import assigns every imported row a generic category (`income` for
  positive amounts, `other` for negative) — there's no merchant-name
  categorization heuristic yet. Fine for a preview-and-commit flow where the
  user can re-categorize afterward; would want real categorization (rules
  or ML, the way Copilot's per-user model works) before this scales past a
  few dozen rows at a time.
- The CSV importer/exporter round-trips date/merchant/amount only — no
  pending-status, notes, or category are preserved on import (there's
  nothing to read them from in a generic bank export), and export intentionally
  keeps the file portable (plain CSV a person can open in Excel/Sheets)
  rather than a Lava-Finance-specific format.
- Export writes to `expo-file-system/legacy`'s cache directory and hands
  off to `expo-sharing`, or on web triggers a browser download — there's no
  "export history" or in-app confirmation beyond the OS share sheet itself.
