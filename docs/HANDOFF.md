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

- **Does "Impause-style behavior" (v1.1, per our plan) want to hook into
  the manual-entry flow specifically** (e.g., a "pause" moment when adding
  a discretionary-category transaction by hand) or does it want to be its
  own thing layered on top of both linked and manual transactions equally?
  Worth deciding before starting that build so it doesn't get bolted onto
  whichever path happens to exist first.
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
  import is for whatever your bank actually gives you. A "Lava Finance
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
