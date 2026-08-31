/**
 * Design-only stub. Nothing in the app imports this yet -- `generateBankData()`
 * (lib/mock/generator.ts) remains the only source of "linked" account data.
 * This file exists so that *if* a real bank connection ever gets built, the
 * shape is decided in advance instead of invented under deadline pressure.
 *
 * Decision (docs/STRATEGY.md, night 4): SimpleFIN-style read-only aggregator,
 * not Plaid. Plaid is the industry default, but it's a heavier trust ask --
 * broad delegated account access, opaque to the end user about exactly what
 * it can see or do -- than fits a product whose whole identity is "your
 * data, your call." SimpleFIN's actual protocol is read-only by design: the
 * user gets a token from their own bank/aggregator (their choice, not ours)
 * and hands Lava Money that token to fetch balances/transactions. No
 * standing OAuth-style delegated access, no write capability, nothing this
 * interface can do that isn't "read what the user explicitly handed over."
 *
 * This interface is shaped generically enough that a real SimpleFIN adapter
 * -- or, if that ever changes, a Plaid adapter -- can implement it without
 * every screen that calls `useFinance()` needing to know which provider is
 * behind it. See `Account`/`Transaction` in lib/types.ts for why the shape
 * already leans Plaid-adjacent (documented there) despite this decision;
 * that's a data-shape convenience, not a protocol commitment.
 */

import type { Account, Transaction } from '@/lib/types';

export interface BankProviderAccountSnapshot {
  account: Account;
  transactions: Transaction[];
}

export interface BankProviderConnectionResult {
  ok: boolean;
  /** Present on success -- what actually got connected, so the caller can
   * merge it into app state the same way `generateBankData()` output is
   * merged today. */
  accounts?: BankProviderAccountSnapshot[];
  /** Present on failure -- surfaced verbatim in the link-account UI, not
   * swallowed, since "why didn't this work" matters more for a real
   * connection than it ever did for the simulated one. */
  error?: string;
}

/**
 * What any real bank-data provider would need to implement. Deliberately
 * small: connect once with a token, refresh on demand, disconnect. No
 * "list available institutions and pick one" method -- that's a SimpleFIN
 * concept (the user brings their own token from their own bank/aggregator
 * already scoped to specific accounts), not a Plaid Link-style institution
 * picker, and building the picker UI around the wrong mental model would be
 * exactly the "Plaid-shaped scaffolding that needs reworking later" this
 * file exists to avoid.
 */
export interface BankProvider {
  readonly kind: 'simplefin';
  /** `token` is whatever the user pasted in from their SimpleFIN-compatible
   * aggregator -- opaque to this interface on purpose. */
  connect(token: string): Promise<BankProviderConnectionResult>;
  refresh(accountId: string): Promise<BankProviderConnectionResult>;
  disconnect(accountId: string): Promise<void>;
}
