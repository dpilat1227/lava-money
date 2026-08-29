# Handoff — overnight build

Built while you slept. Everything below is real and working, verified by
type-checking clean and clicking through every screen in a browser preview
(bundler + runtime sanity check — the real target is iOS/Android, see
`docs/ARCHITECTURE.md`).

## What's done

- Full onboarding: welcome screen -> pick a (fake) institution -> simulated
  Plaid-Link-style connect sequence -> lands on a populated Home screen.
- **Home**: net worth (big number + 6-month trend line chart), assets vs.
  liabilities, an account list, an "upcoming bills" widget, a "link another
  account" entry point.
- **Activity**: every transaction, grouped by day, searchable by merchant,
  tap through to a detail modal with an editable category (grid picker) and
  a free-text note.
- **Budgets**: per-category monthly limits with progress bars (color shifts
  to red past 100%), tap to edit a limit via a small modal, "add a budget"
  chips for any category that doesn't have one yet.
- **Trends**: income-vs-spending bar chart (6 months) and a spending-by-
  category donut with a 1/3/6-month range toggle, plus a plain-list
  breakdown under it.
- **Settings**: linked accounts grouped by institution with tap-to-unlink,
  link another account, appearance note (dark-only, intentional), about
  block, "reset all data" (with a confirm dialog).
- Mock data generator that produces ~6 months of genuinely plausible history
  per linked institution: a paycheck, rent, utilities, 3–5 subscriptions
  (randomly chosen per account), groceries/dining/transport/shopping/
  entertainment at realistic frequencies, occasional travel/health one-offs,
  occasional bonus income, occasional card interest charges. Account
  balances are derived from that history, not picked independently — see
  `lib/mock/generator.ts`.
- Everything persists locally via `AsyncStorage` and survives an app reload.
- `npx tsc --noEmit` is clean. No ESLint config exists in this template
  (nothing to run — `npx expo lint` would set one up if you want it).

## Decisions made without you (flag anything you'd reverse)

1. **NativeTabs, not JS tabs.** Used `expo-router/unstable-native-tabs`
   with SF Symbols (iOS) + Material icon names (Android) rather than custom
   PNG tab icons, so there are zero image assets to generate for the tab
   bar. If you want custom icon glyphs later (e.g. a flame-mark icon set to
   match LavaMesh even more), that's a icon-asset task, not a re-architecture.
2. **Onboarding is not a router route** — see `docs/ARCHITECTURE.md` for
   why. If you want onboarding to support deep links or a proper back stack
   later, that'd need to move into the `Stack`.
3. **Fictional institution names** (North Star Bank, Harbor Credit Union,
   etc.), not real bank names/logos. This is a mock linking flow — using
   real bank names would read as implying a real integration that doesn't
   exist.
4. **No cross-account transfers in the mock generator yet** (see
   Architecture doc's Known Limitations) — the `isTransfer` flag exists and
   is respected everywhere it matters, it's just never populated by the
   generator today. Low effort to add if the demo data ever feels
   incomplete without it (e.g., a credit card that's never paid down might
   look odd on a longer demo).
5. **Budgets apply to every month going forward**, no per-month history —
   matches "my grocery budget is $500" as most people actually think about
   it, rather than a spreadsheet with a column per month. Revisit if you
   want month-over-month budget history/comparison later.
6. **Categories are a fixed list**, not user-editable. Fine for a demo;
   would need a "manage categories" screen for anything beyond that.

## Open questions for you

- **App icon / splash graphic.** Currently using the default Expo
  placeholder icon and a splash screen with LavaMesh's dark background color
  but the stock Expo splash image. A real Lava Finance mark (or a reused/
  adapted version of the LavaMesh flame) would finish the branding pass.
- **Real bank data, ever, or stay a demo/portfolio piece?** If real Plaid
  integration is the goal, that's a meaningfully bigger scope (Plaid Link
  SDK, a backend to hold the Plaid secret key, webhook handling for
  transaction updates) — worth deciding intentionally rather than drifting
  into it. The adapter seam is ready either way.
- **Push notifications for budget overruns / bill reminders?** Not built —
  easy to add later (`expo-notifications`) once there's a reason to.
- **Multiple currencies?** Everything currently assumes USD. Not hard to
  generalize if it matters.
- I didn't touch `app.json`'s app icon / adaptive icon images, only the
  `userInterfaceStyle` (now `"dark"`) and splash background color (now
  LavaMesh's `#080706`).

## Where to start next

Probably the fastest way back in: run `npx expo start`, go through
onboarding once, and click through all 5 tabs plus a transaction detail and
a budget edit. Everything in this doc should be visibly true within two
minutes. From there, the icon/splash pass and "should transfers be real"
question are the two things most worth a decision before building further.
