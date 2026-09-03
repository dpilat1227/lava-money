# App Store Connect listing — draft copy

Not needed to get a build onto internal TestFlight (just you) — App Store
Connect only asks for app name, bundle ID, SKU, and primary language to
create the app record and start internal testing. This doc is prep for
whenever this moves to external TestFlight or a real App Store listing, so
it doesn't need to be written under deadline pressure later. Paste directly
into App Store Connect when that day comes.

## App record basics

- **App name**: `Lava Money`
- **Primary language**: English (U.S.)
- **Bundle ID**: `com.lavamesh.lavamoney`
- **SKU**: `lavamoney001` (any unique internal string — never shown to users)
- **Primary category**: Finance
- **Secondary category** (optional): Productivity

## Subtitle (30 characters max)

```
Your data. Your call.
```

## Promotional text (170 characters max, editable without a new review)

```
Local-first personal finance. Bank-linking is optional, not required — nothing leaves your device unless you export it yourself.
```

## Description (4000 characters max)

```
Lava Money is a personal finance app built around one different premise: bank-linking is optional, not required.

Every account can either be linked (automatic sync) or added manually — a real, fully-functional path, not a fallback. Add a manual account, hand-enter transactions, or import a CSV export from your own bank. Nothing about the manual path is a placeholder.

YOUR DATA STAYS ON YOUR DEVICE
Everything you enter or import — accounts, balances, transactions, budgets, notes — is stored only on your device. There's no server that holds it, no account required to use the app, and nothing is uploaded anywhere unless you choose to export it yourself.

CONNECTION HEALTH YOU CAN ACTUALLY SEE
Every linked account shows a real sync status — synced, stale, or a failed connection — instead of a silently out-of-date balance. If something needs attention, you'll know, and a single tap refreshes everything.

RECURRING CHARGES, SURFACED AUTOMATICALLY
Subscriptions and recurring bills are detected from your real transaction history — no setup required. See a running monthly total, and get flagged when something that used to charge you regularly goes quiet, which might mean it lapsed.

CATEGORIZED WITH A VISIBLE "WHY"
Imported transactions get categorized automatically with a plain-language explanation for every guess — never a black box you have to just trust. Add your own custom categories anytime.

A QUICK PAUSE BEFORE DISCRETIONARY SPEND ADDS UP
A brief, dismissible reflection card shows up after spending in categories like dining out or shopping — how many times this month, how much so far, and how it stacks up against a budget if you've set one. Never a blocker, always a tap away from dismissing.

NET WORTH, BUDGETS, AND TRENDS
Track net worth over time, set monthly budgets per category with progress bars, and see spending trends by category — all the fundamentals, with none of your data required.

Built for iOS and Android from day one — not an iOS-first app with Android bolted on later.

Lava Money is in early beta. We read every piece of feedback personally — see the Support tab for how to reach us.
```

## Keywords (100 characters max, comma-separated, no spaces needed but helps readability)

```
budget,net worth,finance,expense tracker,csv import,privacy,local-first,subscriptions,money,spending
```

## What's New (first version)

```
Welcome to the Lava Money beta. Track net worth, budgets, and spending — with bank-linking optional, not required. We'd love your feedback.
```

## Support & privacy URLs

- **Support URL**: `https://www.lavamoney.io/support`
- **Marketing URL** (optional): `https://www.lavamoney.io`
- **Privacy Policy URL**: `https://www.lavamoney.io/privacy`

## App Privacy questionnaire (the "Privacy Nutrition Label")

**Revisit before the build with real Plaid linking ships** -- this section
was written for the pre-Plaid beta and is no longer accurate on its own.
See `docs/PLAID_SETUP.md` for the feature this section is about.

Apple's App Privacy form asks what data types the app collects. The
accurate answer now depends on whether the build includes real bank
linking:

- **No analytics SDK, no account system** either way -- still true, still
  answer "Data Not Collected" for Usage Data, Identifiers, Diagnostics, etc.
- **Financial Info**: once real Plaid linking ships, this can no longer be
  blanket "Data Not Collected." A `public_token`/institution selection is
  sent to our backend during linking, and every subsequent balance/
  transaction refresh passes through it (never stored there, but it is
  *transmitted* through infrastructure we control, which is what Apple's
  form is actually asking about). The accurate answer is **"Data Linked to
  You"** for Financial Info, with "Used for App Functionality" as the
  purpose, "Not used for tracking," and "Not shared with third parties"
  (Plaid itself is a service provider processing the request on the app's
  behalf, not a third party the data is "shared" with in Apple's sense --
  double check this framing against Apple's current guidance before
  submitting, since their definitions shift).
- **Device ID**: the locally-generated `deviceId` (see `plaidProvider.ts`)
  is a random UUID never tied to an email/name, but it is sent to our
  backend and used to look up linked accounts -- likely needs to be
  disclosed as a form of Identifier ("Device ID") linked to the user's
  financial data, even though it's not linked to their real-world identity.
- **On the web build**: still fully "Data Not Collected" -- the web demo
  never gained real linking (see docs/PLAID_SETUP.md's platform-scope
  decision), so this distinction only applies to the native app submission.

## Screenshots (required before submitting for review, not for internal TestFlight)

Apple requires at minimum a 6.7" (iPhone 17 Pro Max class) screenshot set —
6.5"/5.5" sets are auto-generated from the 6.7" set if you don't provide them
separately. Once there's a build on a device or simulator, capture: Home
(net worth + accounts), the "Quick pause" card, Trends (recurring &
subscriptions card), Budgets. Happy to generate these via simulator once a
build exists — flag it and we'll do a screenshot pass.

## Age rating

No user-generated content, no gambling, no mature themes — should qualify
for the lowest tier (4+) on Apple's questionnaire. Answer "No" to everything
it asks about (violence, contests, unrestricted web access, etc.).
