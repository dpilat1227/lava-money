# Handoff — "premium" pass (Ember atmosphere, blur, icon chips)

Direct feedback after build 5: *"I feel like LavaMesh's landing page/
dashboard looks better than Lava Money currently does. How do we get this
looking like a premium app."* Rather than guess, audited LavaMesh's actual
web dashboard (`app/globals.css`, `StatsHero.tsx`, `NetworkTopology.tsx`,
`IconChip.tsx` in the `lavamesh_app` repo) side-by-side with this app. The
color tokens were already identical (`Colors`/`Elevation`/`Shadow` in
`constants/theme.ts` were ported from that same CSS months ago) — the gap
was entirely in *application*: LavaMesh renders an ambient gradient behind
everything and blurs its one hero panel per screen; Lava Money sat on flat
`Colors.bg` with plain tinted-but-unblurred cards. Ported the three most
portable techniques from that audit, plus two smaller details that fell out
of it. `npx tsc --noEmit` and `npx eslint src` both clean; re-verified via
Playwright/web-preview screenshots of Home, Activity, Budgets, Trends,
Settings.

## What's done today

1. **`Atmosphere`** (new: `components/ui/Atmosphere.tsx`) — a diagonal
   near-black `expo-linear-gradient` base plus two `react-native-svg`
   `RadialGradient` glows (warm orange top-right, ember-red bottom-left),
   directly ported from LavaMesh's web `--atmosphere` CSS variable. Every
   tab screen (`index.tsx`, `transactions.tsx`, `budgets.tsx`, `trends.tsx`,
   `settings.tsx`) plus the account-detail modal now render this behind
   their `ScrollView`/`SectionList` instead of a flat `Colors.bg` fill —
   each screen's own root `View` kept `Colors.bg` only as a fallback in
   case `Atmosphere` doesn't fully cover (safe-area insets, etc).
2. **Real backdrop blur on `Card level="raised"`** (`components/ui/Card.tsx`)
   — added `expo-blur`'s `BlurView` behind the translucent tint for the one
   hero surface per screen (`NetWorthHero`, the Budgets summary ring card),
   matching LavaMesh's `backdropFilter: blur(20px)` on `StatsHero`/
   `NetworkTopology`. The tint (`Colors.surfaceCardRaised`) is now painted
   as its own layer *on top* of the `BlurView` rather than as the
   container's own background, so it doesn't get sampled into the blur
   along with whatever's behind the card.
3. **Gradient+glow "icon chip" treatment** — `CategoryIcon` and `IconBadge`
   swapped their flat `${color}1c`-tinted circles for an `expo-linear-
   gradient` diagonal fill (`${color}12` → `${color}30`) plus a soft colored
   `shadowColor`/`shadowOpacity` glow, matching LavaMesh's `IconChip`
   component. New **`InstitutionAvatar`** (`components/ui/InstitutionAvatar.tsx`)
   consolidates the four copies of the same flat-circle institution-initial
   avatar (Home's account rows, account detail's header, Settings' linked-
   account rows, the link-account institution list) into one component with
   the same treatment, plus an optional overlaid status dot.
4. **Pulsing "synced" status dot** — `presentSyncStatus()` (`lib/utils/
   sync.ts`) now returns a `pulse: boolean` (true only for an actual live
   `linked` + `synced` connection, matching LavaMesh's `.status-dot.online`
   sonar pulse) and upgraded the synced color from muted gray to `Colors.
   green` — "synced" is a good-news state and reads better as green than as
   the same gray used for a merely-descriptive "manual" label.
   `InstitutionAvatar`'s status dot renders a Reanimated `withRepeat` glow
   ring behind the dot only when `pulse` is true; stale/error/manual stay
   static so an alarm state never looks like it's "breathing."
5. **Tabular numerals on hero/summary money figures** — `Amount` (every
   transaction/account-row amount) and the Home net-worth hero, its Assets/
   Liabilities stats, and the Budgets summary ring's spent total/percentage
   all got `fontVariant: ['tabular-nums']`, so animated `useCountUp` digits
   don't jitter or misalign mid-count.

## Decisions made

- Radial gradients for `Atmosphere` use `react-native-svg` (already a
  dependency, same technique `NetWorthHero`'s ambient glow already used)
  rather than adding a second gradient library — `expo-linear-gradient`
  only draws linear gradients, which is why it's still used for the
  diagonal base layer and the icon-chip fills.
- Kept `CategoryIcon`/`IconBadge`'s gradient+glow style duplicated between
  the two components rather than factoring out a shared "IconChip" — their
  props/callers differ enough (emoji-vs-glyph vs. plain icon name) that a
  cross-cutting abstraction wouldn't cleanly fit either, and it's ~10 lines
  either way. `InstitutionAvatar` *is* shared because all four of its call
  sites wanted the exact same thing (name + color + optional status dot).
- Settings' small inline status dot next to "Synced 40m ago" text was left
  as a plain static dot (not routed through `InstitutionAvatar`) — it's a
  secondary/label-adjacent indicator in a different layout, not the primary
  avatar-overlay dot, and pulsing it too would be one glow too many on that
  screen.

## Open questions / next steps

- Consider extending the pulsing-dot treatment to the Home "Needs attention"
  banner's icon when there's an active `stale`/`error` account, as a
  parallel "this needs you" signal (deliberately not pulsed here since a
  pulsing red/amber dot reads as an alarm, not a status per decision above
  — but a *different* motion, like a single-shot bounce, might fit better
  than a full sonar loop).
- `expo-blur`'s Android behavior is a native approximation; worth a real
  Android-device check once one's available (web preview and iOS Simulator
  both render it correctly).
- Next real design pass candidates from the same LavaMesh audit, not done
  yet: a selection accent (2px brand-color left border + soft tint wash) on
  an active/selected row, and staggered fade-in-up on first mount of a
  screen's list (today's `StaggerItem` only covers index-based delay within
  an already-mounted list, not entrance timing across the whole screen).

---

# Handoff — first real-device pass on TestFlight build 5

The first feedback that came from actually installing build 5 on a phone
instead of the web preview, and it caught four things the preview couldn't:
a header element that looked pressable but wasn't, a joke greeting that
reads wrong out of context, brand-new accounts making every chart look
broken rather than empty, and a budget-creation flow that felt like an
afterthought next to Copilot's. Fixed all four, plus one screenshot-only
Playwright-caught regression (a `console.error` filter from night 5 that
never actually matched anything — see below). `npx tsc --noEmit` and
`npx eslint src` both clean; re-verified via the same real Playwright/web-
preview flow (fresh manual account, no transactions) the screenshots came
from.

## What's done today

1. **Home's flame-mark "logo"** (`(tabs)/index.tsx`) was a plain bordered/
   shadowed `View` with zero `onPress` — visually a button, functionally
   dead weight. It's now a real `Pressable` with the same Reanimated press-
   scale treatment `Card`/`Button` use, wired to `router.push('/settings')`
   (`accessibilityLabel="Open settings"`).
2. **`greetingForHour()`** (`lib/utils/date.ts`) dropped the "Still up?"
   variant for `hour < 5` / `hour >= 22` — cute in isolation, but reads as
   presumptuous/gimmicky on an actual phone at 12:40am. Down to four plain
   variants (morning/afternoon/evening, evening again late).
3. **Sample/illustrative data for brand-new accounts** — a fresh manual
   account with zero transactions is *real* data (correctly $0 spend, flat
   net worth), but rendered as broken-looking empty charts. New
   `lib/mock/sampleChartData.ts` holds static illustrative curves/totals;
   `NetWorthChart`, `FlowBarChart`, `CategoryDonut`, and
   `RecurringInsightsCard` each take a `sample` prop that swaps in that data
   *and* renders a `Badge` reading "Sample data" — never blended with real
   numbers, always visibly tagged, disappears the moment any real
   transaction exists. `hasEnoughHistoryForChart()` is the one added
   detector (net worth history with zero variation = sample); the Trends
   triggers just check `transactions.length`/`categoryTotals.length`.
4. **Budgets' "Add a budget"** was a wrapped grid of tiny pill chips —
   replaced with a full-width row list (icon, name, a static "Typically
   ~$X/mo" suggestion from a new `SUGGESTED_DEFAULTS` map, `+` icon), which
   also now pre-fills the edit sheet with that suggested amount instead of a
   bare $100. Added four preset-amount chips ($50/$100/$200/$500) above the
   manual input in `EditBudgetModal` so setting a budget rarely needs the
   keyboard at all.
5. **Home density**: folded the standalone Assets/Liabilities `Card` pair
   into `NetWorthHero` itself as an inline two-column stat row (same
   pattern `RecurringInsightsCard`'s totals row already used) — one hero
   surface instead of hero-plus-two-more-boxes for what's really one idea
   (net worth, broken into its two halves).
6. **`InsightChips`'s "Spent so far" chip had no zero-guard** — unlike the
   other three chips (subscriptions/top-category/overdue), it always
   pushed, so a fresh account showed one lonely "$0.00 vs $0.00 avg/mo"
   card. Now gated on `currentExpense > 0 || avgExpense > 0` like the rest.
7. **Found and fixed the actual `console.error` filter bug from night 5**:
   it checked `args[0].includes('transform-origin')`, but React logs that
   warning as a `%s`-templated format string with the property name as a
   *separate* arg — `args[0]` never contained the literal text, so the red
   LogBox toast never got suppressed on web despite the filter existing.
   Now checks all args.

## Decisions made without you today (flag anything you'd reverse)

1. **Sample data is swapped in per-chart-component, not per-screen** — each
   of `NetWorthChart`/`FlowBarChart`/`CategoryDonut`/`RecurringInsightsCard`
   independently decides real-vs-sample and tags itself, rather than one
   screen-level "is this user new" flag. Slightly more prop-plumbing, but it
   means Home's chart can go real (once net worth actually moves) while
   Trends' donut is still sample (no transactions yet) — which is the
   actually-true state for someone who just added a manual account with a
   starting balance and hasn't logged spend yet.
2. **The flame mark now navigates to Settings** rather than, say, opening a
   dedicated profile/about sheet — there's no separate account/profile
   concept in this app (no login), so Settings is the only "more" screen
   that exists. Revisit if a lighter "what's new"/about popover ever makes
   more sense than a full tab jump.
3. **Suggested budget defaults are a static per-category table**, not
   derived from the user's actual spending — there's no real spending
   history to derive from for a brand-new user, and once real budgets
   history exists the suggestion only ever matters for categories that
   still don't have one. Revisit if that table starts feeling stale/wrong.

## Open questions for you

- Carried forward, still open: real bank data vs. staying demo/portfolio,
  and whether CSV export should grow a re-importable native format. See
  night 5's entry below for the fuller open-questions list — nothing new
  today displaces those.
- **Is "Sample data" the right label**, or would something like "Example"
  or a small illustration/chart icon read clearer at a glance? Went with
  the plainest possible word on purpose, but haven't shown it to anyone yet.

## Where to start next

Everything above is verifiable in the web preview: onboard, choose "Add
manually," add one account with a balance and zero transactions, and Home/
Trends should show "Sample data"-tagged charts instead of blank ones; add a
budget and the edit sheet should show preset chips. On a real device, the
web-preview-only floating tab bar isn't there, so the flame-mark tap should
be uncontested — worth a real TestFlight rebuild once there's enough queued
up to be worth another `eas build` (this pass alone probably doesn't justify
one on its own).

# Handoff — night 5: the 2.0 design overhaul + TestFlight build 5

Picked up your design brief (make Home "beautiful... modern, pretty, not
busy but not too minimal," beat Monarch/Copilot/YNAB/Origin, plus the app
icon/TestFlight-banner problem from night 4's screenshots) and turned it
into the `lava_money_2.0_design_overhaul` plan you approved, then built
every to-do in it end to end tonight rather than a partial pass. Verified
by `npx tsc --noEmit` clean, `npx expo lint` clean, and a full Playwright
screenshot sweep of every screen/modal in the web preview (onboarding, add-
account chooser, link-account flow all three states, Home, Activity
    10|search/empty, Budgets + edit-budget modal, Trends, Settings + add-category
modal, account detail both linked/manual, transaction detail + category
picker, add-transaction sheet, review-categories both states) — then a
real `eas build --profile production --platform ios` (build 5) submitted
to App Store Connect via `eas submit`, both non-interactively, no Apple
2FA prompt needed this time (see "credentials are stored by EAS" in
`docs/TESTFLIGHT.md` — that prediction from night 1 held).

## What's done tonight

- **App icon fixed** — the actual root cause of night 4's muddy TestFlight
    20|  banner. `assets/expo.icon/icon.json` now fills a dark ember-brown
  `automatic-gradient` and layers two new SVGs (`flame-glow.svg` behind,
  `flame-mark.svg` in front) through Icon Composer instead of a flat-orange
  fill silhouette. Apple auto-generates the App Store product-page banner
  from an icon's dominant colors, so this was never fixable by "removing a
  background" — it needed the icon's actual palette to change.
- **A real design-token layer**: `Elevation` (resting/raised/glass surface
  levels), `AccentUsage` (where orange is/isn't allowed to appear), and
  `Motion` (Reanimated spring/duration constants) added to
  `constants/theme.ts` — see `docs/ARCHITECTURE.md`'s new "The Ember design
    30|  system" section for the full breakdown, not repeated here.
- **Component library rebuilt on those tokens**: `Card`/`Button` got
  Reanimated press-scale feedback; new `Icon`/`IconBadge` (real SF Symbols/
  Material Symbols via `expo-symbols`), `CategoryGlyph` (hand-drawn SVG
  icons replacing emoji for the fixed category list), `GlassSurface`
  (`expo-glass-effect` Liquid Glass with a themed fallback), `ProgressRing`,
  and `StaggerItem` (Reanimated list-entrance) all new.
- **Every screen and every modal repainted on the new system** — Home
  (net-worth hero, insight chips, account rows), Activity (search bar,
  sticky headers, empty state), Budgets (progress ring summary, row
    40|  cards, edit modal), Trends (recurring card, category breakdown), and
  Settings (icon rows throughout) in one pass; then add-account/link-
  account/manual-account, add-transaction/edit-balance/CSV-preview sheets,
  edit-budget and add-category modals, and transaction detail in a second
  pass so nothing shipped half-migrated.
- **A real motion pass, not just press feedback**: `useCountUp` (new,
  `lib/hooks/`) animates the Home net-worth number, Assets/Liabilities
  cards, and the Budgets "spent this month" figure up from their previous
  value on change, bridging a Reanimated shared value back to React state
    50|  so the actual currency formatting still happens in plain JS (`Intl`
  calls aren't worklet-safe). `StaggerItem` gives Home's account/upcoming
  rows, Budgets' rows, and Trends' category breakdown a staggered
  fade-in-from-below entrance, capped at a max delay so it stays a
  considered reveal rather than a slow crawl on longer lists.
- **Build 5 shipped**: `eas build --profile production --platform ios
  --non-interactive` (auto-incremented to build number 5) then `eas submit`
  with `ascAppId` added to `eas.json`'s submit profile (needed for a fully
  non-interactive submit — the interactive flow infers it, `--non-
  interactive` can't). Both credentials (distribution cert + ASC API key)
   60|  were already on file from build 4's interactive setup, so tonight's
  build never touched Apple sign-in/2FA at all.

## Decisions made without you tonight (flag anything you'd reverse)

1. **Number count-ups are scoped to hero numbers only** (net worth,
   Assets/Liabilities, budget total spent) — not wired into every
   `Amount` in every transaction/budget row. A whole list counting up on
   every scroll-into-view would read as noisy, not premium; the plan
   specifically called out "hero values."
2. **`StaggerItem` renders as a plain, unanimated `View` on web.**
   70|   Reanimated's web layout-animation shim writes a raw kebab-case
   `transform-origin` DOM style, which React logs as a console warning and
   (via Expo's web dev-error toast) an on-screen banner obscuring the UI —
   purely a web-preview artifact; iOS/Android use the real native
   implementation and never hit this path. Rather than fight the shim for
   a target this app doesn't ship to, native gets the full staggered
   entrance and web silently skips it. Also added a narrow `console.error`
   filter in `app/_layout.tsx` (dev + web only) for this same string, since
   Card/Button's existing press-scale animation hits the identical shim
    80|   quirk and there's no per-component workaround for that one.
3. **`GlassSurface` callers must not pass `backgroundColor`/`border*` in
   their own `style` prop** — those get merged in *after* `GlassSurface`'s
   internal glass/fallback styling and would cover the translucency up
   entirely. Fixed retroactively in the bottom-sheet `Sheet` wrapper (was
   still setting an opaque `backgroundColor`, which would've silently
   defeated the whole point of switching it to `GlassSurface`) — documented
   in `docs/ARCHITECTURE.md` so the next new modal doesn't repeat it.
4. **`eas.json`'s `submit.production.ios.ascAppId` is now hardcoded**
   (`6807643939`, this app's App Store Connect app ID) instead of left
    90|   for the interactive prompt to resolve. Fine for a single-app project;
   would need to move to a per-target config if this ever became a
   multi-app monorepo.
5. Carried forward from nights 1-4 and still true: NativeTabs, onboarding
   isn't a router route, fictional institution names, manual balances
   don't follow transactions, budgets apply going-forward only, dark-only,
   fixed category list plus user-added custom ones, Impause always-on for
   its four categories, SimpleFIN-not-Plaid as the future bank-data
   direction (still unbuilt — `lib/providers/BankProvider.ts` is still just
   the interface stub).

## Open questions for you

- **How does 2.0 actually look on your phone?** Build 5 is processing in
   100|  App Store Connect as of this write-up — check TestFlight in a few
  minutes. Web-preview screenshots and a real device (especially the
  Liquid Glass sheets on iOS 26, and the SF Symbols `Icon` fallback on
  whatever iOS version you're running) can differ enough to be worth a
  real look before calling this done.
- **Worth a light mode eventually?** Still no — carried forward — but the
  new `Elevation`/`AccentUsage` token layer would make one meaningfully
  easier to add later than the ad-hoc styling it replaced, if that ever
  changes.
- Everything else carried forward from night 4 is still open — see that
  section below.
   110|
## Where to start next

Update via TestFlight once build 5 finishes processing (should already be
there — check your email or App Store Connect directly:
https://appstoreconnect.apple.com/apps/6807643939/testflight/ios). On the
device, the things most worth a deliberate look: the app icon on your home
screen (the actual bug this session started from), the Home screen's
net-worth count-up on first load, pressing into any card (Reanimated scale
feedback should feel snappier than the old opacity fade), and any bottom
sheet/modal on iOS 26 if you have it (real Liquid Glass vs. the themed
   120|fallback everywhere else).

---

# Handoff — night 4: the three open decisions get resolved

Picked up exactly where night 3 left off: "continue onward" on the two open
product decisions (Impause UX, real-bank-data path) plus the banner
placement question, all three of which had been carried forward across
nights 1–3 as "needs your input." All three got decided (with you, live)
and built tonight instead of carried forward a fourth time. See
`docs/STRATEGY.md`'s "Addendum — night 4" for the reasoning; this is the
receipt. Verified by `npx tsc --noEmit` clean, `npx expo lint` clean, and
Playwright click-throughs (manual dining transaction → pause prompt with
correct "Nth purchase" count and running total; setting a budget then
triggering the pause again → progress bar flips to over-budget red at
110%; a linked, current-month Subscriptions transaction opened for the
first time → retroactive pause; reopening it → doesn't show a second time;
Home screen renders correctly with the moved suggestion banner).

## What's done tonight

- **Impause v1.1, resolved as a universal layer, discretionary-category
  trigger.** New `lib/utils/impause.ts` + `components/impause/PausePrompt.tsx`:
  a one-time, dismissible "spend pause" reflection card — never a
  blocking gate, since this app has no way to see a purchase before it
  happens — showing "Your Nth [Category] purchase this month — $X of $Y
  spent so far" plus a budget progress bar (or a "Set a budget" link if
  none exists yet). Discretionary categories: Dining Out, Shopping,
  Entertainment, Subscriptions. Fires in two places, covering manual and
  linked/imported transactions alike without spamming a bulk backfill:
  - **Immediately** after a manual transaction is added in a discretionary
    category (`account/[id].tsx`'s `AddTransactionSheet` → `onAdded`).
  - **Retroactively, once**, the first time a not-yet-acknowledged
    discretionary transaction from the *current month* is opened from its
    detail screen (`transaction/[id].tsx`) — scoped to the current month
    specifically so linking a demo bank with months of history doesn't
    queue up dozens of pauses for old transactions. Acknowledgment
    (`acknowledgedPauseIds`, new persisted array in `FinanceContext`) means
    it never shows twice for the same transaction.
- **Real bank data: SimpleFIN-style, not Plaid, if this ever gets built.**
  New `lib/providers/BankProvider.ts` — a design-only interface stub, not
  wired to anything (`generateBankData()` remains the only "linked" data
  source). Fixes the *shape* of a future real connection now, so it isn't
  invented under deadline pressure later or built Plaid-shaped by default.
  `lib/types.ts`'s header comments updated to stop implying a Plaid
  commitment.
- **"N suggestions to review" banner moved from Settings to Home**, next
  to the existing "N accounts need attention" banner — same visual
  treatment (orange vs. amber), same destination (`/review-categories`).
  Settings' Categories section lost the banner but kept category
  add/delete.

## Decisions made without you tonight (flag anything you'd reverse)

1. **The pause is framed as "reflect," never "block."** There's no version
   of this app that sees a transaction before it posts (no card-network
   integration, ever, regardless of the Plaid/SimpleFIN decision) — so an
   Impause-style "wait 10 seconds before you buy" is not something this
   product can honestly build. What ships instead is a brief "here's where
   this category stands" moment right after the fact.
2. **Retroactive pauses are scoped to the current month only.** Otherwise
   "universal" would mean linking a demo bank instantly queues up a pause
   for every discretionary transaction in its multi-month backfill, which
   is spam, not a nudge. A four-month-old backfilled coffee run isn't
   useful to reflect on regardless.
3. **Custom categories are never discretionary**, even though users could
   invent a "Takeout" or "Impulse buys" category that obviously should be.
   No signal exists to guess what a user-created category means to them;
   guessing wrong (pausing on someone's "Kids" category) reads as noise,
   not a nudge. Revisit if custom categories ever get a "treat as
   discretionary" toggle.
4. **`BankProvider.ts` is a stub, not a start on a real integration.** No
   real SimpleFIN credentials exist for a demo app, and building against
   an untested guess at the real protocol's exact request/response shapes
   would be worse than not building it yet. What it fixes is intent, not
   code: the interface commits to read-only, token-based access instead of
   Plaid's broader delegated-access model, so the *next* real build starts
   from the right assumptions.
5. Carried forward from nights 1–3 and still true: NativeTabs, onboarding
   isn't a router route, fictional institution names, manual balances
   don't follow transactions, budgets apply going-forward only, dark-only,
   fixed category list plus user-added custom ones.

## Open questions for you

- **Should custom categories get a "treat as discretionary" toggle**, so
  Impause pauses can extend to categories the fixed list doesn't cover
  (Takeout, Impulse buys, etc.)? Not built tonight — see decision #3 above.
- **Does the pause ever want a per-category "stop showing me this" opt-out?**
  Right now it's always-on for the four discretionary categories; someone
  who dines out five times a week doesn't need a reflection card every
  single time. No data yet on whether that's actually annoying in practice
  or just a hypothetical — worth watching before building a dismiss-forever
  control preemptively.
- **When (if ever) does `BankProvider.ts` become a real integration?** Not
  urgent — the mock generator remains the only data source either way —
  but worth deciding once there's a reason to prioritize it (e.g. a real
  beta user who wants their real accounts).

## Where to start next

Run `npx expo start`, add a manual transaction in Dining Out/Shopping/
Entertainment/Subscriptions to see the pause prompt, set a budget for that
category and add another to see the progress bar flip color at 100%+, then
link a demo bank and open a current-month Subscriptions/Dining transaction
from Activity to see the retroactive version. Home should show the moved
suggestion banner (import a CSV with an unrecognized merchant to trigger
one). Everything in this doc should be visibly true within about five
minutes.

---

# Handoff — night 3: strategy audit + Insights, no reversal

See `docs/STRATEGY.md` for the full audit (written first, per instruction,
before touching code). Short version: the night-2 bet — real product path,
data-ownership/local-first identity, Plaid optional, sync-status UI now,
Impause deferred to v1.1 — holds. Nothing reversed. Rocket Money shipping an
agentic "Rowan" assistant five days ago was the one genuinely new signal;
the read on it (in the strategy doc) is "match the proactive-surfacing
*value*, skip the agent/LLM/bank-action *risk*" — that's what tonight's
Insights feature is. Verified by `npx tsc --noEmit` clean, `npx expo lint`
clean, and Playwright-driven click-throughs of every new flow in the web
preview (custom category creation/deletion, CSV import → categorizer guess
→ transaction detail "why" note → `/review-categories` apply/skip/apply-all,
and the new Trends "Recurring & subscriptions" card against a real linked
demo bank with realistic subscription/bill data).

## What's done tonight

- **Real app icon, finally** (flagged as the most visible "looks
  unfinished" signal for two nights running). LavaMesh's flame mark, an
  orange `automatic-gradient` fill via Expo's iOS Icon Composer format
  (`assets/expo.icon/`), regenerated favicon/splash/Android adaptive-icon
  layers to match.
- **Custom categories.** Settings has a new "Categories" section — add a
  name/emoji/color, delete anything you added (the fixed starter list can't
  be deleted, see `docs/ARCHITECTURE.md`). Every screen that used to read
  the static category list (`account/[id]`, `CategoryDonut`, `trends`,
  `budgets`, `transactions`, `export`) now reads the context's merged
  fixed+custom list via `findCategory()` instead.
- **Recurring detection is real now, not generator-only.** New
  `lib/utils/recurring.ts`: merchant-normalize + amount-tolerance +
  interval-gap clustering over actual `Transaction[]`, computed live in
  `FinanceContext` (memoized, not persisted). Means manual and
  CSV-imported accounts get recurring-charge detection for the first time —
  previously only generator-linked accounts had any `RecurringSeries` at
  all, because the generator just handed back its own templates. Stress-
  tested against synthetic multi-month histories; found and fixed a mock-
  data realism bug in the process (subscriptions were getting the same
  ±$3 jitter as variable bills, which is a 30% swing on a $10 charge — real
  subscriptions charge the same price every cycle; fixed in
  `lib/mock/generator.ts`).
- **Rules-based categorization with a visible "why."** New
  `lib/utils/categorizer.ts`: exact-merchant and keyword rule tables produce
  a category + confidence + human-readable reason. Runs automatically on
  CSV import (`categoryGuess` on the transaction); transaction detail shows
  "Auto-categorized: matched known merchant 'X'" (with a soft nudge to
  double-check on low confidence). New `/review-categories` modal (linked
  from a "N category suggestions to review" banner in Settings) lets you
  apply or skip suggestions for existing "Other" transactions one at a time,
  or all at once. Picking a category yourself always clears the guess —
  it's not a guess anymore once a human confirmed it.
- **Insights: "Recurring & subscriptions" card on Trends.** New
  `lib/utils/insights.ts` + `components/insights/RecurringInsightsCard.tsx`:
  monthly-equivalent subscriptions total, separate recurring-bills total, a
  per-item list sorted by next-expected date, and `due_soon`/`overdue`
  badges ("may have lapsed" past a per-cadence grace window). Built
  entirely on the recurring detector's output — same data, different lens,
  no new source of truth. This is deliberately the full scope of tonight's
  "match Rowan's proactive-surfacing value, skip the agent risk" work; it
  does not watch, cancel, or negotiate anything.

## Decisions made without you tonight (flag anything you'd reverse)

1. **"Overdue" language is deliberately hedged** ("may have lapsed," not
   "you're being charged for something you don't use") — the only signal
   available is "expected charge didn't show up by its grace window,"
   which could mean lapsed, could mean the merchant is just running a few
   days late. Didn't want the copy to claim more certainty than the data
   supports.
2. **Insights lives on the Trends tab, not a 6th tab.** NativeTabs already
   has 5 (Home/Activity/Budgets/Trends/Settings); a 6th felt like it'd
   crowd the bar for a feature that's a lens on data Trends already shows.
   Revisit as its own tab if it grows real interactivity (per-item
   snooze/dismiss, etc.) rather than staying a read-only summary card.
3. **The categorizer is a fixed rule table, not a learning model.** Matches
   the explicit "don't try to out-AI Copilot, do rules-with-explanations
   instead" call from the earlier competitive analysis — an auditable "why"
   is the actual differentiator here, not the categorization accuracy
   itself. A real per-user learning pass is future scope, not a gap to
   apologize for now.
4. **`recurringSeries` and merged `categories` moved from persisted state to
   computed values** (`useMemo` in `FinanceContext`, off `transactions`/
   `accounts` and `customCategories` respectively). Both are now strictly
   derived from other state, so persisting them risked drift (e.g. stale
   `RecurringSeries` surviving a transaction delete). `customCategories`
   itself is still persisted — that one's actual user input, not derived.
5. Carried forward from nights 1–2 and still true: NativeTabs, onboarding
   isn't a router route, fictional institution names, manual balances don't
   follow transactions, budgets apply going-forward only, dark-only.

## Open questions for you

All three resolved night 4 — see that section at the top of this file and
`docs/STRATEGY.md`'s addendum. Left here for the historical record:

- ~~Impause-style spend-pause interaction~~ → universal layer,
  discretionary-category trigger, built night 4.
- ~~Real bank data, ever, or stay demo/portfolio, or a lighter-trust
  read-only aggregator (SimpleFIN-style) instead of Plaid~~ → SimpleFIN-
  style, decided night 4 (not yet built — see `lib/providers/BankProvider.ts`).
- ~~Does the "N suggestions to review" banner belong on Settings long-term,
  or Home~~ → moved to Home, night 4.

## Where to start next

Run `npx expo start`, link a demo bank (onboarding or Settings → "Connect a
bank"), then check Trends for the new Recurring & subscriptions card, and
Settings → Categories for custom-category add/delete and the suggestion
review flow (import a CSV with an unrecognized-but-rule-matchable merchant
like "STARBUCKS" to see a fresh suggestion appear). Everything in this doc
should be visibly true within about five minutes.

---

# Handoff — night 2: the data-ownership pivot

Last night was the MVP (net worth, budgets, trends, activity, a fake
Plaid-Link-style onboarding). This session took the strategic direction we
landed on together — real product path, data-ownership/local-first identity,
Plaid optional, sync-status UI now, Impause-style behavior deferred to
v1.1 — and actually built it, not just planned it. Verified by
`npx tsc --noEmit` clean, `npx expo lint` clean, and clicking through every
new flow in the web preview via Playwright (onboarding both ways, manual
account creation, hand-entering a transaction, editing a balance, CSV import
with a real generated file, refreshing a linked account, exporting data from
Settings, all four other tabs).

## What's done tonight

- **"Add an account" is now a real fork, not link-or-nothing.** Onboarding
  and the Settings/Home "add account" entry point both go through a new
  chooser (`AddAccountChooser`) presenting "Connect a bank" and "Add
  manually" as equal options — copy deliberately avoids making manual entry
  read like a fallback for people who can't/won't link a bank.
- **Manual accounts are real, not a stub.** `ManualAccountFlow` collects a
  name, type, and starting balance (credit limit for cards); the resulting
  account has `source: 'manual'` and lives under a placeholder
  "Manually tracked" institution. Balance is directly editable afterward
  from the account detail screen.
- **Hand-entering transactions works.** The account detail screen
  (`/account/[id]`, new) has an "+ Add transaction" bottom sheet — merchant,
  spend/income toggle, amount, category — for manual accounts.
- **CSV import is a real feature, not a mock.** "Import CSV" opens the
  system file picker, reads the file (web via the `File` object,
  native via `expo-file-system/legacy`), parses it with a hand-rolled
  parser (`lib/utils/csv.ts`) that auto-detects a Date column, a Merchant/
  Description column, and either a single signed Amount column or separate
  Debit/Credit columns, shows a preview (row count + any warnings) before
  committing, and skips-and-counts malformed rows instead of aborting.
  Tested end-to-end with a real generated CSV through the actual file-picker
  dialog in Playwright, not just unit-style.
- **Connection health is modeled and visible, ahead of any real bank
  connection.** Every linked account now has a `syncStatus`
  (`synced`/`stale`/`error`) and rolls into a plausible mix on creation, so
  the UI's full range of states is visible from a fresh install:
  - Home: each account row shows a status line + dot; a "N accounts need
    attention" banner appears when anything's stale/errored, tap to refresh
    all linked accounts at once.
  - Settings: linked accounts section has a "Refresh all (N)" action;
    manual accounts get their own section instead of being lumped in.
  - Account detail: a status row with a "Refresh now" action for
    stale/error accounts (simulated: ~92% success, and a failed refresh
    correctly leaves `lastSyncedAt` where it was rather than lying about a
    successful sync).
- **Real data export.** Settings has a "Data & Privacy" section: "Export
  all data (JSON)" (full backup — institutions, accounts, transactions,
  recurring series, budgets) and "Export transactions (CSV)", both through
  the OS share sheet on native and a browser download on web. This is the
  part that makes "you own your data" a real claim instead of a tagline —
  there's an actual way to get everything back out.
- **Transaction detail got real teeth**: a delete action (with confirm),
  and a "Source" row showing linked/manual/imported.
- Fixed two pre-existing lint errors that the newer React-19-compiler-aware
  ESLint rules flagged as real bugs (not touched last night, caught while
  running `expo lint` for the first time tonight): a mutated-during-render
  loop variable in `CategoryDonut`, and a ref's `.current` read directly in
  a render body in `LinkAccountFlow`'s spinner. Both fixed without changing
  behavior — see the inline comments at each fix.
- Installed `expo-document-picker`, `expo-sharing`, `expo-clipboard` (the
  last one unused for now, felt likely to want soon — cheap to have
  already).

## Decisions made without you tonight (flag anything you'd reverse)

1. **Manual account balance is independent of its transactions.** Adding,
   importing, or deleting transactions on a manual account never
   recalculates the balance — you edit the number directly, same mental
   model as any manual net-worth tracker. Making balance *follow* from
   transactions is a real, different product decision (reconciliation
   rules, starting balance, etc.) — didn't want to invent that unilaterally.
2. **CSV-imported transactions get a generic category** (`income` for
   positive amounts, `other` for negative), no merchant-based
   categorization heuristic. Fine for "preview, then re-categorize by
   hand"; real categorization is a bigger, separate feature.
3. **The manual/linked chooser lives inside the existing `link-account`
   route** rather than a new route name, to avoid touching every place that
   already links to `/link-account`. The screen title says "Add an
   account," so this is invisible to anyone but someone reading the router
   file names.
4. **Sync-status simulation is deliberately a little unfair** (rolls
   ~30% of linked accounts into stale/error on creation) so the "needs
   attention" UI is actually visible in a demo without waiting for real
   time to pass. A real provider would set these from actual webhook/poll
   results — see `docs/ARCHITECTURE.md`'s "Connection health" section for
   exactly where that swap happens.
5. **Didn't add a global "+ add transaction" on the Activity tab** — hand
   entry lives on the account detail screen only for now, so you pick the
   account by navigating to it first rather than picking one from a dropdown
   in a global form. Simpler to ship tonight; revisit if that friction turns
   out to matter.
6. Carried forward from night 1 and still true: NativeTabs (not JS tabs),
   onboarding isn't a router route, fictional institution names, budgets
   apply going-forward only (no per-month history), fixed category list.
   See git history / the ARCHITECTURE doc if you want the reasoning again.

## Open questions for you

- ~~Does "Impause-style behavior" want to hook into manual-entry
  specifically, or layer on top of both linked and manual equally?~~ →
  universal layer, resolved and built night 4.
- **App icon / splash graphic** — still the default Expo placeholder, per
  night 1's open question. Untouched again tonight; still the most visible
  remaining "this looks unfinished" signal if you screenshot the app cold.
- **Real bank data, ever, or stay demo/portfolio?** Also carried forward —
  the manual/data-ownership path tonight actually makes "stay demo forever,
  but be a genuinely useful local-only app" a more credible standalone
  option than it was last night, not just a fallback while waiting for
  Plaid. Worth explicitly deciding whether that's the actual plan or Plaid
  is still coming later.
- **Should CSV export include a re-importable superset** (categories,
  notes) instead of staying a plain portable format? Right now export and
  import are deliberately asymmetric — export is for humans (Excel/Sheets),
  import is for whatever your bank actually gives you. A "Lava Money
  native" format would need its own decision about whether that's worth the
  complexity.

## Where to start next

Run `npx expo start`, go through onboarding via **both** paths at least
once (link a fake bank, and separately, add a manual account + hand-enter a
transaction + import a small CSV you export from your own bank), then check
Settings' two account sections and try "Export all data." Everything in
this doc should be visibly true within about five minutes. From there, the
Impause-hook question above and the app icon are the two things most worth
a decision before building further.
