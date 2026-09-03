# Plaid setup

Referenced from `docs/app-store-listing.md`'s Privacy Nutrition Label
section. This is the missing piece that ties the Plaid work together: why
Plaid (reversing an earlier decision), the platform split, the security
model, and how to actually run it against Sandbox.

## Why Plaid, reversing the SimpleFIN decision

`docs/STRATEGY.md` ("night 4") deliberately chose a SimpleFIN-style
read-only aggregator over Plaid, specifically because it's a lighter trust
ask that fit a "bank-linking is optional, and legible" identity better than
Plaid's broader account-access model. `lib/providers/BankProvider.ts` was
shaped for that — no institution-picker method, since SimpleFIN's model is
"user brings a token from their own bank/aggregator."

That decision got reversed. Two things drove it:

1. **No real SimpleFIN credentials exist for a demo/beta app to actually
   test against** — SimpleFIN is aggregator-mediated (the user has to
   already have an account with a participating aggregator like SimpleFIN
   Bridge), which is a real onboarding cost most people evaluating a new
   finance app won't pay. Plaid supports 12,000+ institutions with a
   picker flow most people have already used in some other app.
2. **The actual product decision this app needed wasn't "no bank data
   provider," it was "don't require one."** Manual accounts (real balance
   entry, real CSV import) already deliver that half honestly. Choosing
   Plaid for the *optional* linked-account path doesn't weaken that — it's
   a separate axis (how does data get in) from where it's stored (still
   on-device once it's in, see "Security model" below).

`BankProvider.ts` is deleted; `lib/providers/plaidProvider.ts` replaces it.

## Platform split: native gets real linking, web stays a demo

Real Plaid Link only runs on native (iOS/Android) via
`react-native-plaid-link-sdk`, an Expo Modules package with real native
code — it can't run in a browser tab at all, and this app's web build is
specifically the public, no-signup demo linked from lavamoney.io (see
`components/web/DesktopShell.tsx`'s `DemoBanner`), which has no backend
session to exchange a token against anyway.

- **Native**: `AddAccountChooser` offers a real **"Connect a bank"** (Plaid
  Link) alongside **"Try with sample data"** (the original mock flow,
  relabeled — kept intentionally, not removed, as a no-signup way to
  evaluate the app without a real bank).
- **Web**: only the mock flow exists; `usePlaidLink.web.ts` is a stub that
  never gets called (the "Connect a bank" option isn't shown at all on
  web).

## Security model

Plaid's own security model requires a backend — the secret key that
exchanges a `public_token` for an `access_token` can never touch a mobile
client. That's a real, unavoidable architecture addition for an app that
otherwise has zero server. The backend (`lava_money_web/app/api/plaid/`,
Next.js + Prisma 7/Postgres) is a deliberately "thin relay," not a copy of
the user's financial life:

- **What's stored** (`PlaidItem` model): `deviceId`, `itemId`,
  `accessTokenEncrypted`, `cursor`, `institutionId`, `institutionName`,
  `status`, timestamps. That's it — no account balances, no transactions.
- **What's never stored**: every actual balance/transaction response from
  Plaid is relayed straight through to the client on each request and
  never written to the database. If the database were ever compromised,
  there's no transaction history sitting in it to steal — only a
  revocable connection token per linked institution.
- **Token encryption**: `accessTokenEncrypted` is AES-256-GCM at rest,
  keyed by `TOKEN_ENCRYPTION_KEY`.
- **Auth model**: no user accounts. A `deviceId` (random UUID, generated
  and stored locally on first launch — see `DEVICE_ID_KEY`) plus the
  specific `itemId` must both match a stored row for any action on it —
  knowing one alone isn't enough to act on someone else's connection.
- **Sign convention**: Plaid returns positive amounts for money *leaving*
  an account, negative for money coming in — backwards from this app's own
  convention (negative = spend, positive = income) used everywhere
  internally. `lib/utils/plaidMapping.ts` flips this at the adapter
  boundary, once, rather than inverting it throughout the app.

## Environment variables

**`lava_finance`** (this app) — see `.env.example`:

```
EXPO_PUBLIC_API_BASE_URL="https://www.lavamoney.io"
```

Points the client at the backend's Plaid routes. For local dev-client
testing against a Sandbox item, this needs to be your Mac's LAN IP + the
port `next dev` printed (a phone/simulator can't reach `localhost` on your
Mac), e.g. `http://10.0.0.180:3001`.

**`lava_money_web`** (the backend, separate repo) — not committed there
either, set locally / in Vercel's project settings:

```
DATABASE_URL=              # Postgres connection string (Prisma 7 + pg adapter)
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV="sandbox"         # sandbox | development | production
TOKEN_ENCRYPTION_KEY=       # 32-byte key for AES-256-GCM, base64 or hex
```

`PLAID_CLIENT_ID`/`PLAID_SECRET` come from a free Plaid Sandbox account
(dashboard.plaid.com) — Sandbox is unlimited and free, no application
required; moving to `development`/`production` does require Plaid's
approval process.

## Testing against Sandbox

Plaid Sandbox uses fake test institutions with predictable credentials
(`user_good` / `pass_good` for the standard test bank) — no real bank
account needed to exercise the whole flow end to end.

One quirk worth knowing: a fresh Item's very first `transactionsSync` call
right after linking sometimes returns zero accounts — Sandbox (and
occasionally real banks) can take a moment to finish producing them.
`exchange-token`'s route handles this with a bounded retry (up to 4
attempts with increasing delays) before responding, so the client almost
always gets a populated result on the first try rather than a
just-linked-but-empty institution.

## What's not done

- Still on Plaid's **Sandbox** tier — moving to a live bank connection
  needs Plaid's Production access approval, applied for with a real Item
  count estimate and use-case description.
- No webhook listener yet (`/transactions/sync`'s cursor is currently only
  advanced on-demand, via pull, not push) — fine at demo/beta scale, would
  want Plaid's webhook (`SYNC_UPDATES_AVAILABLE`) before this scales past
  a handful of real users refreshing manually.
