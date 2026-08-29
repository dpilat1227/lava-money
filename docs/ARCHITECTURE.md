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
    link-account.tsx    Modal: "link another account" from Settings
    transaction/[id].tsx  Modal: transaction detail + category/note editing
  screens/              Larger composed flows not tied to a single route
    OnboardingFlow.tsx  First-run welcome + link flow (not a router screen —
                        see note below)
    LinkAccountFlow.tsx Shared institution-picker -> fake-link -> success
                        sequence, used by both onboarding and the Settings
                        modal
  components/
    ui/                 Design-system primitives (Text, Card, Amount, Button,
                        ProgressBar, Badge, CategoryIcon, EmptyState, ScreenHeader)
    charts/             NetWorthChart, CategoryDonut, FlowBarChart
  lib/
    types.ts            Core data model (Account, Transaction, Category, ...)
    store/
      FinanceContext.tsx  App state: reducer + actions + selectors-by-hook
      persistence.ts      AsyncStorage read/write
    mock/
      generator.ts        Produces ~6 months of accounts + transactions for
                          one newly-linked institution
      categories.ts        Fixed category list (income/expense/transfer)
      institutions.ts       Fictional institution list for the link flow
    utils/                date/currency/rng/netWorth helpers
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
