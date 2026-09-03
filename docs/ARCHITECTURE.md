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
                        ProgressBar, ProgressRing, Badge, CategoryIcon,
                        CategoryGlyph, Icon, IconBadge, GlassSurface,
                        StaggerItem, EmptyState, ScreenHeader, FlameMark) --
                        see "The Ember design system" below
    charts/             NetWorthChart, CategoryDonut, FlowBarChart
    insights/           RecurringInsightsCard -- the Trends-screen "recurring
                        & subscriptions" surface (see below)
    impause/            PausePrompt -- the "spend pause" reflection card (see
                        "Impause: the spend-pause reflection layer" below)
    home/               NetWorthHero, InsightChips, NeedsAttentionCard -- the
                        Home-screen modules (see "The Home screen" below)
  lib/
    providers/
      BankProvider.ts     Design-only interface stub for a future real bank
                        connection (SimpleFIN-shaped, not Plaid) -- nothing
                        imports this yet. See "the mock-data seam" below.
    types.ts            Core data model (Account, Transaction, Category, ...)
                        including AccountSource ('linked' | 'manual'),
                        SyncStatus ('synced' | 'stale' | 'error' | 'manual'),
                        Category.isCustom, and Transaction.categoryGuess
                        (set by the categorizer, cleared once a user picks
                        a category themselves)
    store/
      FinanceContext.tsx  App state: reducer + actions + selectors-by-hook.
                        Actions now include addManualAccount,
                        updateAccountBalance, addTransaction,
                        updateTransaction, deleteTransaction,
                        importTransactions, refreshAccount, refreshAllLinked,
                        addCustomCategory, deleteCustomCategory,
                        acknowledgePause.
                        `recurringSeries` and `categories` (fixed + custom,
                        merged) are computed values on the context, not
                        persisted state -- see "recurring detection" and
                        "custom categories" below. `acknowledgedPauseIds` IS
                        persisted (see "Impause" below) -- unlike those two,
                        it's not derivable from other state.
      persistence.ts      AsyncStorage read/write
    mock/
      generator.ts        Produces ~6 months of accounts + transactions for
                          one newly-linked institution, including a rolled
                          connection-health state per account (see below).
                          No longer emits its own RecurringSeries -- see
                          "recurring detection" below.
      categories.ts        Fixed starter category list (income/expense/
                          transfer) + `findCategory(categories, id)`, which
                          looks up a category in a caller-supplied list
                          (fixed + custom) instead of the static list alone
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
      recurring.ts        Real recurring-charge *detection* over
                          `Transaction[]` -- merchant normalization +
                          amount tolerance + interval-gap clustering into
                          weekly/biweekly/monthly buckets. See "recurring
                          detection" below.
      categorizer.ts      Rules-based merchant categorization
                          (`categorizeMerchant`) with a human-readable
                          "why" (exact-merchant and keyword rule tables),
                          used on CSV import and by the review-suggestions
                          flow (`findCategorySuggestions`)
      insights.ts         `buildRecurringInsights()` -- reshapes
                          `RecurringSeries[]` into monthly-equivalent
                          subscription/bill totals and due-soon/overdue
                          status flags for `RecurringInsightsCard`
      impause.ts          Discretionary-category detection + "spend pause"
                          context/message building for `PausePrompt`. See
                          "Impause" below.
  hooks/
    useFinanceSelectors.ts  Derived data: net worth history, budget progress,
                            monthly income/expense, grouped transactions,
                            recurring insights, etc.
    useCountUp.ts (in lib/hooks/)  Reanimated count-up bridged to React state
                            for animated hero numbers -- see "The Ember
                            design system" below.
  constants/theme.ts    Design tokens ported from LavaMesh's `app/globals.css`,
                        extended with Elevation/AccentUsage/Motion for 2.0
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

**Decision (docs/STRATEGY.md, night 4): if a real provider ever gets built,
it's SimpleFIN-style read-only, not Plaid** — a lighter trust ask that fits
the data-ownership identity better. `lib/providers/BankProvider.ts` is a
design-only stub of that shape (`connect(token)` / `refresh` / `disconnect`,
no institution-picker method, since SimpleFIN's model is "user brings a
token from their own bank/aggregator," not a Plaid Link-style picker).
Nothing imports it yet — this fixes intent for later, not a build tonight.

To wire in a real provider later:

1. Implement `BankProvider` for real (or, if the SimpleFIN decision ever
   changes, write a new interface for Plaid/Teller/Finicity-style delegated
   access instead — don't force a Plaid adapter through the SimpleFIN-shaped
   interface, they're different trust models for a reason).
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
5. ~~Recurring-bill detection (`RecurringSeries`) is currently generated
   directly from the mock generator's own templates~~ — no longer true as
   of night 3: `lib/utils/recurring.ts`'s `detectRecurringSeries()` runs a
   real detection pass (merchant normalization + amount tolerance +
   interval-gap clustering) over whatever `Transaction[]` exists, called
   live from `FinanceContext` and memoized on `transactions`/`accounts`.
   It works identically for linked, manual, and CSV-imported accounts —
   nothing generator-specific about it. A real bank adapter needs no
   change here at all.

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

## Custom categories

`Category.isCustom` distinguishes a category the user created
(`addCustomCategory()`) from the fixed starter list in
`lib/mock/categories.ts`. Only custom categories can be deleted — the fixed
list is load-bearing for mock data generation and default budgets, so
removing one of those would leave dangling `categoryId` references
everywhere. `FinanceContext` exposes a single merged `categories` (and
`expenseCategories`) array — fixed list + `state.customCategories` — so
every screen reads one list and never has to know or care which category
came from where. `findCategory(categories, id)` (in `lib/mock/categories.ts`)
is the one lookup helper that takes that merged list as a parameter; the
older `getCategory(id)` (fixed list only) is kept only for call sites that
deliberately want the static list.

## Recurring detection and the Insights surface

`lib/utils/recurring.ts`'s `detectRecurringSeries(transactions, accounts)`
groups transactions by normalized merchant name + account, requires at
least 2 occurrences, classifies the typical gap between them into
weekly/biweekly/monthly buckets, and requires amounts to be consistent
within a tolerance (tighter for exactly 2 occurrences, looser once there
are 3+ and gap-consistency is also being checked). It's a pure function
over transaction history — no persisted `RecurringSeries[]` exists
anywhere; `FinanceContext` computes it with `useMemo` on every render where
`transactions`/`accounts` changed, so it's always a live consequence of
current data, including right after a CSV import or a manual entry, not
just for generator-linked accounts.

`lib/utils/insights.ts`'s `buildRecurringInsights()` is a second, thin
layer on top of that same detector output — no separate data source — that
normalizes each series' amount to a monthly-equivalent rate (so a weekly
and a monthly charge sum meaningfully), splits the total into
"Subscriptions" (category `subscriptions`) vs. "Recurring bills"
(everything else), and flags each item `active` / `due_soon` / `overdue`
based on how far past `nextExpectedDate` it is relative to a per-cadence
grace window. "Overdue" is a scheduling inference ("this expected charge
didn't show up on time") presented honestly as "may have lapsed," not a
claim about whether the user still uses the service — there's no usage
signal in this data model to base that claim on. Rendered by
`components/insights/RecurringInsightsCard.tsx` on the Trends screen. This
is the proactive-surfacing feature from `docs/STRATEGY.md`'s "night 3"
read on Rocket Money's Rowan/ChatGPT-finance trend — same value (surface
something before the user has to notice it themselves), deliberately none
of the risk (no agent, no LLM call, no bank-action capability).

## Impause: the spend-pause reflection layer

The v1.1 Impause-style feature, resolved night 4 (`docs/STRATEGY.md`
addendum) as a universal layer over discretionary spend, not a
manual-entry-only nudge. Framed deliberately as "reflect," never "block" —
this app has no way to see a purchase before it happens, so a real
Impause-style purchase-time pause isn't something it can honestly build.

- `lib/utils/impause.ts`: `isDiscretionaryCategory()` checks against a
  fixed set (Dining Out, Shopping, Entertainment, Subscriptions — custom
  categories are never discretionary, see the "decisions" list in
  `docs/HANDOFF.md`'s night-4 entry for why). `buildPauseContext()` computes
  this-month occurrence count + total spend for a transaction's category
  (including that transaction), plus budget/percent-of-budget if one
  exists. `pauseMessage()` turns that into the plain-language line the card
  shows — same "explain it, don't just flag it" philosophy as the
  categorizer's `reason` field.
- `components/impause/PausePrompt.tsx`: the actual card (category icon,
  message, budget progress bar if applicable, "Got it" / optional "Set a
  budget" link). One-time and dismissible — `onDismiss` is the only way it
  closes; there's no snooze or "remind me later."
- Two trigger points, both in existing screens rather than a new global
  listener, since there's no real "a transaction just posted" event without
  a real bank connection:
  - `app/account/[id].tsx`'s `AddTransactionSheet` calls `onAdded(tx)`
    right after a manual transaction is created; the parent
    (`AccountDetailModal`) checks `isPauseEligible()` and shows the prompt
    immediately if so. This is the only "happening right now" moment the
    app actually has.
  - `app/transaction/[id].tsx` checks `shouldShowRetroactivePause()` on
    every render — eligible, not yet acknowledged, *and* dated in the
    current month — so opening an old linked/imported transaction from a
    demo bank's multi-month backfill never triggers one, but this month's
    Hulu charge does the first time you look at it.
- `acknowledgedPauseIds: string[]` on `FinanceContext`/persisted state is
  the only reason a transaction's pause doesn't reappear on the next visit.
  It's an allow-list of "already shown," not a computed value — unlike
  `recurringSeries`/`categories`, there's no other state it could be
  derived from.

## The Home screen

Was a plain "number + chart + account list" dashboard through night 4 —
functional, but indistinguishable from a template. Reworked against a
competitor read (Monarch's Sankey, Copilot's pace bands/gauges, YNAB's
personalization, Origin's forecast narrative — see the
`home-dashboard-design-direction` canvas from that session for the full
breakdown) into what's actually buildable now versus what needs real
projection logic later. `app/(tabs)/index.tsx` composes three new
`components/home/` modules plus a couple of smaller upgrades in place:

- `NetWorthHero.tsx`: the net-worth card, now with an ambient SVG radial
  glow behind the number (brand warmth, not a generic drop shadow), a
  directional change pill (an `Icon` arrow, not a text glyph), an explicit
  "calculated on this device, never uploaded" line — the one sentence that
  actually differentiates this app from a competitor screenshot, so it
  earns a permanent spot on the first screen rather than a Settings
  toggle — and a one-line auto-generated caption under the chart
  (`buildTrendCaption()`, same file) naming the single biggest driver of
  the period's net-worth change via `lib/utils/netWorth.ts`'s
  `biggestNetWorthMover()`. This is deliberately *not* a step toward
  Origin-style forecasting — it's plain-language framing of data already on
  hand, no projection math, no milestones. Real forecasting (if it happens)
  is a separate, later feature that needs to earn its own accuracy bar
  first. Also renders the Assets/Liabilities split as an inline two-column
  stat row below the chart (folded in from two standalone `Card`s on
  `index.tsx` — see "Real-device feedback fixes" below) and swaps in
  illustrative sample data for the chart itself when real history is flat
  (see the same section).
- `InsightChips.tsx`: a horizontal row of small facts pulled from data the
  app was already computing elsewhere for Trends (subscriptions total via
  `useRecurringInsights()`, top category via `useCategorySpendTotals(1)`,
  spend-so-far vs. 6-month average via `useMonthlyIncomeVsExpense()`) but
  never surfaced on Home. No new math — just a second place to see facts
  that used to require a tab switch to find.
- `NeedsAttentionCard.tsx`: replaces two separately-colored banners (stale
  accounts, category suggestions) that read as uncoordinated alert spam
  stacked on top of each other with one card, one "Needs a look" header,
  and a row per item — same information, coordinated presentation.
- `AccountRow` (inline in `index.tsx`) swapped a plain colored dot for an
  institution-initial avatar with the sync-status dot overlaid at the
  corner (notification-badge style) — more premium, and the status dot no
  longer competes with the institution color for the same tiny space.
- `components/ui/FlameMark.tsx`: the brand's actual flame silhouette
  (ported from `lava_money_web`'s `FlameMark.tsx` via `react-native-svg`),
  used in Home's header badge and swapped in for `OnboardingFlow.tsx`'s old
  hand-rolled placeholder (three stacked shapes, one of them a rotated
  square) — one real mark instead of two different fake ones.
- Pull-to-refresh (`RefreshControl`) now wraps Home's `ScrollView`, wired to
  the same `refreshAllLinked()` the attention banner already used — tapping
  the banner and pulling down do the same thing through the same code path.

## The Ember design system (the "2.0" visual overhaul)

Night 4's Home rework (above) was the first taste of "lit from within by
the flame" instead of flat cards on black; the 2.0 pass took that same idea
— one light source, real depth instead of flat fills, vector iconography
instead of emoji, orange spent deliberately rather than sprinkled — and
extended it to every screen, every modal, and the app icon itself. See the
`lava_money_2.0_design_overhaul` plan for the full audit and rationale;
this section is the as-built reference.

- **App icon** (`assets/expo.icon/`): `icon.json` now fills a dark ember-
  brown `automatic-gradient` instead of flat orange, and layers two SVGs —
  `flame-glow.svg` (a soft radial-gradient glow, scaled larger, behind) and
  `flame-mark.svg` (the actual flame, linear-gradient fill, scaled down, in
  front) — through Icon Composer's layer/shadow/translucency system. Fixes
  the muddy brown-orange TestFlight product-page banner Apple was
  auto-generating from the old flat-orange icon's dominant colors.
- **`constants/theme.ts` tokens**: `Elevation` (`resting` / `raised` /
  `glass` — background tint + border + shadow bundled per level, so "this
  card is the one hero surface on the screen" is one prop, not five
  one-off style overrides), `AccentUsage` (documents where orange is/isn't
  allowed — brand mark, hero metric, primary action, selected state,
  warning/danger use amber/red instead — so it stays an *accent*, not
  competing with itself across a screen), and `Motion` (Reanimated spring
  configs `snappy`/`gentle`/`settle`, duration constants, `pressScale`,
  `staggerStep` — one shared vocabulary instead of every component picking
  its own animation numbers).
- **New/rebuilt primitives in `components/ui/`**:
  - `Card`: takes a `level` prop (`Elevation` key) and an optional
    `onPress`, which switches it to a `Pressable` + `Animated.View` with
    Reanimated scale-down/up feedback (`Motion.pressScale`) and a light
    haptic — every pressable card in the app (account rows, budget rows,
    institution rows, insight chips) gets this for free instead of each
    screen wiring its own `Pressable`.
  - `Button`: same Reanimated press-scale treatment, replacing the old
    plain-opacity press state.
  - `Icon` / `IconBadge`: `Icon` wraps `expo-symbols`' `SymbolView` —  real
    SF Symbols on iOS, Material Symbols on Android/web, with a small dot
    fallback if a symbol name doesn't resolve on a given OS version.
    `IconBadge` is `Icon` inside a tinted circular badge (institution/
    category-style), used anywhere a settings row or empty state needs a
    small icon-in-a-circle instead of raw emoji.
  - `CategoryGlyph` / `CategoryIcon`: `CategoryGlyph` is a small
    hand-drawn `react-native-svg` icon set (stroke-based, one per fixed
    starter category). `CategoryIcon` now takes an optional `id` and
    prefers rendering the matching `CategoryGlyph` when one exists,
    falling back to its `emoji` prop otherwise — so fixed categories get
    vector icons everywhere (Activity, Budgets, Trends, transaction
    detail, add-transaction sheet) while custom user-created categories
    (which only ever have an emoji, chosen at creation) still render fine.
  - `GlassSurface`: wraps `expo-glass-effect`'s `GlassView` on iOS when
    `isGlassEffectAPIAvailable()` (iOS 26 Liquid Glass), falling back to a
    plain `View` styled with `Elevation.glass` everywhere else (Android,
    web, older iOS). Used for every bottom sheet and modal card (add
    transaction, edit balance, CSV preview, edit budget, add category) —
    depth through real translucency where the OS supports it, a
    convincing tinted-dark fallback where it doesn't. Important: any
    `style` passed to `GlassSurface` should stick to layout properties
    (padding, radius overrides) and avoid `backgroundColor`/`borderColor`/
    `borderWidth`, since those are applied *after* `GlassSurface`'s own
    fallback/glass styling in the merge order and would blot out the
    translucency it exists to provide.
  - `ProgressRing`: a radial SVG progress indicator (the Budgets summary
    card's "% of total budget spent" ring) — `ProgressBar`'s circular
    sibling, same over-100%-turns-red rule.
  - `ProgressBar`: now animates its fill width with Reanimated
    (`withTiming`, skippable via `animate={false}` for a live preview like
    the edit-budget modal) and carries a colored glow shadow instead of a
    flat fill.
  - `StaggerItem`: wraps a list row in an `Animated.View` with a
    `FadeInDown` entrance, delayed by `index * Motion.staggerStep` (capped
    via `maxDelay` so long/virtualized lists don't leave far-down rows
    waiting over a second). Used for Home's account/upcoming rows and
    insight chips, Budgets' rows, and Trends' category breakdown — bounded
    lists where an incremental per-item delay reads as a considered
    entrance rather than random flicker. Renders as a plain `View` with no
    animation on web (see "Known limitations" below for why).
  - `lib/hooks/useCountUp.ts`: drives a number from its previous value to
    a new target with a Reanimated timing curve, bridging the animated
    value back to plain React state via `useAnimatedReaction` +
    `runOnJS` (Intl currency formatting isn't worklet-safe, so the actual
    `formatCurrency()` call always happens on the JS thread against a
    normal number, not inside a worklet). Wired into the Home net-worth
    hero, its inline Assets/Liabilities stats, and the Budgets summary's
    "spent this month" figure — the handful of hero numbers the plan
    called out, not every number in every list row (a transaction list
    constantly counting up on every scroll would read as noisy, not
    premium).
- **Screen-by-screen**: every tab (Home, Activity, Budgets, Trends,
  Settings) and every modal/sheet (add account chooser, link-account flow,
  manual-account flow, add-transaction sheet, edit-balance sheet, CSV
  preview sheet, edit-budget modal, add-category modal, transaction
  detail, account detail) was passed through this same set of primitives —
  emoji swapped for `CategoryIcon`/`Icon`/`IconBadge`, flat cards promoted
  to the right `Elevation` level, and destructive rows (unlink account,
  remove account, delete transaction) got a leading `Icon` (`trash`) to
  match Settings' treatment instead of text-only red rows.

## Real-device feedback fixes (first TestFlight pass)

The web preview can't catch everything — the first pass of feedback from
build 5 actually installed on a phone surfaced a few things the preview
never would have:

- **`lib/mock/sampleChartData.ts`**: static, purely illustrative chart data
  (a net-worth curve, monthly income/expense, category totals, a few
  recurring-charge rows) for the specific case a brand-new account with
  real balances but zero transactions makes every chart component render
  as flat/blank — technically correct, but reads as "broken," not "empty."
  `NetWorthChart`, `FlowBarChart`, `CategoryDonut`, and
  `RecurringInsightsCard` each accept a `sample?: boolean` prop that swaps
  in this data instead of the real (empty/flat) input *and* renders a
  `Badge` reading "Sample data" — the tag is load-bearing, not decorative,
  since this is the only place in the app allowed to show numbers that
  aren't the user's own. The moment any real signal exists (a transaction,
  net-worth history with actual variation), the real caller-supplied data
  takes over completely; nothing blends. `hasEnoughHistoryForChart()` (same
  file) is the one non-trivial trigger — net-worth history with zero
  variance across points, which is exactly what `buildNetWorthHistory()`
  produces for an account with no transactions to "unwind." The Trends
  triggers are simpler direct checks (`transactions.length`,
  `categoryTotals.length`) inline in `trends.tsx`.
- **The Home header's flame mark** (`(tabs)/index.tsx`) looked like a
  button (bordered, shadowed, sized like a tap target) but had no
  `onPress` — now a real `Pressable` with the same Reanimated press-scale
  feedback `Card`/`Button` use, routed to `router.push('/settings')` since
  there's no separate profile/account concept to send it to instead.
- **`greetingForHour()`** (`lib/utils/date.ts`) dropped its "Still up?"
  variant for very late/early hours — read as gimmicky rather than
  charming once it showed up mid-testing at 12:40am. Down to three plain
  time-of-day variants plus one late-evening repeat.
- **`InsightChips`'s pace chip** ("$X spent so far, vs $Y avg/mo") was the
  one chip of four with no zero-guard, so a brand-new account always
  rendered one lonely, uninformative $0.00-vs-$0.00 card. Gated on
  `currentExpense > 0 || avgExpense > 0` like the other three chips already
  were.
- **Budgets' "Add a budget"** went from a wrapped grid of small pill chips
  to a full-width row list (icon, category name, a static "Typically
  ~$X/mo" hint from a new `SUGGESTED_DEFAULTS` table) with a trailing `+`
  icon — closer to how Copilot presents category selection. The edit sheet
  now pre-fills that suggested amount for a brand-new budget instead of a
  bare `$100`, and gained four preset-amount chips ($50/$100/$200/$500)
  above the manual input.

## "Premium" pass — atmosphere, blur, icon chips

Prompted by "LavaMesh's dashboard looks better than Lava Money" — an audit
of that web dashboard's actual CSS/components (`lavamesh_app` repo:
`app/globals.css`, `components/ui/StatsHero.tsx`, `components/
NetworkTopology.tsx`, `components/ui/IconChip.tsx`) found the color tokens
were already identical (this app's `Colors`/`Elevation`/`Shadow` were
ported from that CSS earlier in the project), so the gap was entirely in
application, not palette. Ported the highest-leverage pieces:

- **`components/ui/Atmosphere.tsx`** (new): a diagonal near-black
  `expo-linear-gradient` base plus two `react-native-svg` `RadialGradient`
  glows (orange top-right, ember-red bottom-left), matching LavaMesh's web
  `--atmosphere` CSS variable pixel-for-pixel in stop colors/opacities.
  `react-native-svg` (not a new gradient library) draws the radial glows
  since RN has no native radial-gradient primitive and `NetWorthHero`'s
  existing ambient glow already used the same technique. Every tab screen
  and the account-detail modal render one `<Atmosphere />` behind their
  scroll content instead of a flat `Colors.bg` fill; each screen's root
  `View` keeps `Colors.bg` only as an underlying fallback.
- **`Card`'s `raised` level now blurs** (`components/ui/Card.tsx`): a new
  internal `RaisedBackdrop` renders `expo-blur`'s `BlurView` behind the
  card's content, with the `Colors.surfaceCardRaised` tint painted as a
  *separate* layer on top of the blur (not as the container's own
  `backgroundColor`) — otherwise the tint would get captured into the blur
  sample along with the atmosphere/content behind the card instead of
  reading as a distinct glass layer floating above it. Only `raised` cards
  pay this cost (`NetWorthHero`, the Budgets summary ring); `resting` and
  `glass` levels are untouched.
- **`components/ui/InstitutionAvatar.tsx`** (new): consolidates what were
  four independent copies of the same flat `${color}22`-tinted circle
  (Home's account rows, account detail's header, Settings' linked-account
  rows, `screens/LinkAccountFlow.tsx`'s institution picker) into one
  component with a diagonal gradient fill + colored glow shadow (LavaMesh's
  `IconChip` treatment) and an optional overlaid status dot. `CategoryIcon`
  and `IconBadge` got the same gradient+glow treatment applied directly
  (kept duplicated rather than factored into a shared component, since
  their emoji/glyph/icon-name props differ enough that a shared
  abstraction wouldn't cleanly fit either one).
- **Pulsing status dot**: `presentSyncStatus()` (`lib/utils/sync.ts`) gained
  a `pulse: boolean` field (true only for `linked` + `synced`, matching
  LavaMesh's `.status-dot.online` sonar-ring pulse) and the synced color
  moved from muted gray to `Colors.green`. `InstitutionAvatar`'s
  `StatusDot` sub-component renders a Reanimated `withRepeat`/`withTiming`
  glow ring behind the dot only when `pulse` is set; stale/error/manual
  states stay static so an attention-needed state never reads as "alive"
  rather than "wrong."
- **Tabular numerals**: `Amount` and the Home hero's net-worth/Assets/
  Liabilities figures and the Budgets summary's spent total/percentage all
  got `fontVariant: ['tabular-nums']`, so `useCountUp`'s per-frame digit
  changes don't visually jitter or misalign width mid-animation.

## Known limitations (deliberate, for an MVP)

- No light mode. LavaMesh itself has no light mode; matching that was a
  choice, not an oversight.
- No cross-account transfers modeled in mock data (e.g., a checking-to-
  savings transfer, or a credit card payment) — the `isTransfer` flag exists
  in the type and is respected by budget/spend calculations, but the
  generator never actually produces one yet. Credit card balances only grow
  across the generated window; they're never paid down in the mock data.
- No auth, no multi-user, no cloud sync — single local user, single device.
- `react-native-svg`'s `<G rotation origin>` (used by the category donut)
  and Reanimated's web layout-animation shim (`StaggerItem`'s `FadeInDown`,
  Card/Button's press-scale `useAnimatedStyle`) both log a harmless
  `transform-origin` DOM-property warning on the **web** target only —
  doesn't occur on iOS/Android, which are the actual ship targets and use
  the real native implementations. `StaggerItem` skips its entrance
  animation entirely on web (renders a plain `View`) rather than fight the
  shim, and `app/_layout.tsx` filters this specific `console.error` string
  in dev so the web preview's error overlay doesn't obscure the UI while
  testing — neither workaround touches native behavior.
- Manual account balances and their transaction history are independent —
  adding/importing/deleting transactions on a manual account never
  recalculates its balance. This mirrors how people actually use a manual
  net-worth tracker (periodically retype the number), and avoids inventing
  reconciliation rules (starting balance? which transactions count?) that
  the product hasn't actually decided on yet. If "balance should follow
  from transactions" becomes the desired model later, that's a product
  decision to make deliberately, not a bug to fix.
- ~~CSV import assigns every imported row a generic category~~ — no longer
  true as of night 3: `lib/utils/categorizer.ts`'s `categorizeMerchant()`
  runs a rules-based pass (exact-merchant + keyword matching) on import,
  storing a `categoryGuess` (`reason` + `confidence`) alongside the
  assigned category. It's intentionally not ML — a fixed, auditable rule
  table stays honest about "why" a merchant text is going to be reliably
  matched by a rule table (chains, subscriptions, common keywords) and
  where it won't (small/local merchants, ambiguous descriptions) — that's
  what `/review-categories` and the transaction-detail "why" note are for.
  Would want a real per-user learning model (the way Copilot's does)
  before this scales past casual/beta use.
- The CSV importer/exporter round-trips date/merchant/amount only — no
  pending-status, notes, or category are preserved on import (there's
  nothing to read them from in a generic bank export), and export intentionally
  keeps the file portable (plain CSV a person can open in Excel/Sheets)
  rather than a Lava-Money-specific format.
- Export writes to `expo-file-system/legacy`'s cache directory and hands
  off to `expo-sharing`, or on web triggers a browser download — there's no
  "export history" or in-app confirmation beyond the OS share sheet itself.
- The Impause "spend pause" (see above) is always-on for its four
  discretionary categories, with no per-category or global opt-out. There's
  no usage data yet on whether that reads as helpful or annoying at real
  usage frequency (someone dining out daily would see one every day) — see
  the open question in `docs/HANDOFF.md`'s night-4 entry.
