/**
 * Core data model. Shaped loosely after what Plaid returns (accounts,
 * transactions with a merchant + category) purely because that shape is a
 * reasonable lowest-common-denominator for bank data generally -- NOT a
 * commitment to Plaid as the provider. Per docs/STRATEGY.md's night-4
 * decision, a real connection (if built) would be SimpleFIN-style
 * read-only, not Plaid; see `lib/providers/BankProvider.ts` for that
 * decision's design stub. A real provider drops in later behind that
 * interface without reshaping every screen.
 *
 * One deliberate departure from Plaid's own convention: Plaid returns
 * *positive* amounts for money leaving an account and negative for money
 * coming in, which reads backwards in a UI. Here, negative = money out
 * (spend), positive = money in (income) -- the sign you'd actually want to
 * render with a "-" or "+" in a transaction list. If a real Plaid adapter
 * gets wired in later, negate at the adapter boundary, not throughout the
 * app.
 */

export type AccountType = 'checking' | 'savings' | 'credit_card' | 'investment' | 'loan' | 'cash';

export interface Institution {
  id: string;
  name: string;
  /** Stand-in for a real institution logo -- a single brand color used for
   * the little squircle mark next to the account name. */
  color: string;
}

/**
 * Where an account's data comes from. `linked` accounts came through the
 * (simulated) bank-connection flow and have a `syncStatus`; `manual`
 * accounts were typed in directly by the user and never "sync" at all --
 * the user IS the data source. This distinction is the backbone of Lava
 * Finance's actual product bet: bank-linking is optional, not required. See
 * `MANUAL_INSTITUTION` in `lib/mock/institutions.ts`.
 */
export type AccountSource = 'linked' | 'manual';

/**
 * Connection health for a `linked` account. Modeled now, ahead of any real
 * bank-data provider, so the UI (badges, refresh actions, the "needs
 * attention" banner) already exists and doesn't get bolted on later when a
 * real SimpleFIN-style adapter starts producing these states for real:
 * - `synced` -- last refresh succeeded recently.
 * - `stale` -- last refresh succeeded, but it's been a while; balances may
 *   be out of date.
 * - `error` -- last refresh failed outright (expired credentials, provider
 *   outage, etc.) and needs the user to act.
 * `manual` accounts don't have a meaningful sync status; they're always
 * exactly as current as the user last left them.
 */
export type SyncStatus = 'synced' | 'stale' | 'error' | 'manual';

export interface Account {
  id: string;
  institutionId: string;
  name: string;
  /** Last 4 digits, cosmetic only. */
  mask: string;
  type: AccountType;
  /** Current balance. For credit cards/loans this is what's owed (positive
   * number), and isAsset below decides whether it adds or subtracts from
   * net worth -- it is NOT stored as negative, to match how a bank actually
   * displays a card balance. */
  balance: number;
  /** Credit cards only. */
  creditLimit?: number;
  /** Investment/savings only -- shown as a small extra line, not modeled. */
  apy?: number;
  isHidden?: boolean;
  source: AccountSource;
  syncStatus: SyncStatus;
  /** ISO timestamp. For `linked` accounts, last successful sync. For
   * `manual` accounts, last time the user edited the balance -- same field,
   * different meaning, so every account row can show one "as of" line
   * without a branch at every call site. */
  lastSyncedAt: string;
  /** Set only for accounts that came through a *real* Plaid connection
   * (see lib/providers/plaidProvider.ts) -- undefined for mock-linked and
   * manual accounts. Plaid Items, not individual accounts, are the unit of
   * refresh/revocation: one bank login can yield several accounts sharing
   * one `plaidItemId`, so refreshing/unlinking operates on every account
   * with the same id together, not one at a time. */
  plaidItemId?: string;
}

export function isAssetAccount(type: AccountType): boolean {
  return type === 'checking' || type === 'savings' || type === 'investment' || type === 'cash';
}

export type CategoryGroup = 'income' | 'expense' | 'transfer';

export interface Category {
  id: string;
  name: string;
  /** Single emoji, cheap stand-in for an icon set. */
  emoji: string;
  color: string;
  group: CategoryGroup;
  /** True for a category the user created themselves (see
   * `FinanceContext`'s `addCustomCategory`). Undefined/false for the fixed
   * starter list in `lib/mock/categories.ts`. Only custom categories can be
   * deleted -- the fixed list is load-bearing for mock data generation and
   * default budgets, so removing one of those would leave dangling
   * references everywhere. */
  isCustom?: boolean;
}

/** Payload for hand-creating a category. Always `group: 'expense'` in the
 * UI today -- letting users invent custom income/transfer categories opens
 * up net-worth and budget-math edge cases (what does a custom "transfer"
 * category even mean for the isTransfer exclusion logic?) that aren't worth
 * solving for a v1 of "let me add a Pets category." */
export interface CustomCategoryInput {
  name: string;
  emoji: string;
  color: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string; // ISO date, no time component needed
  merchantName: string;
  /** Raw description as a bank would show it -- used for search, not display. */
  rawDescription: string;
  /** See file header: negative = spend, positive = income. */
  amount: number;
  categoryId: string;
  isPending?: boolean;
  /** Transfers between the user's own accounts -- excluded from spend totals
   * and budgets so moving money to savings doesn't look like a purchase. */
  isTransfer?: boolean;
  /** User-hidden -- excluded from every spend/budget/trend total the same
   * way `isTransfer` is, but reversible (see `hideTransaction`/
   * `unhideTransaction` in FinanceContext, and Settings' "Hidden
   * transactions" row). Design-audit-round-4: "instead of 'deleting' a
   * transaction, you can 'hide' it so if you ever need to see it again
   * it's still there" -- also the semantically correct action for a real
   * bank-linked charge, which can't actually be deleted (the bank still
   * has it); hard delete stays for manually-entered rows only, where the
   * user is the sole author. */
  hidden?: boolean;
  recurringSeriesId?: string;
  notes?: string;
  /** How this row entered the app: generated by the simulated bank-link
   * flow, typed in by hand, or bulk-loaded from a CSV export. Cosmetic only
   * (a small tag in the detail view) -- nothing downstream branches on it. */
  entrySource?: 'linked' | 'manual' | 'import';
  /** Set when `categoryId` was assigned by the rules-based categorizer
   * (`lib/utils/categorizer.ts`) rather than chosen by the user -- lets the
   * transaction detail screen show "why" this category was picked. Cleared
   * the moment the user picks a category themselves (see
   * `categorizeTransaction` in `FinanceContext`), since at that point it's
   * not a guess anymore and showing a stale explanation would be
   * misleading. */
  categoryGuess?: { reason: string; confidence: 'high' | 'medium' | 'low' };
}

/** Payload for hand-entering a transaction on a manual (or any) account. */
export interface ManualTransactionInput {
  accountId: string;
  date: string; // ISO date
  merchantName: string;
  amount: number;
  categoryId: string;
  notes?: string;
}

/** Payload for creating a manual account -- no institution, no bank
 * connection, just what the user typed in. */
export interface ManualAccountInput {
  name: string;
  type: AccountType;
  balance: number;
  creditLimit?: number;
}

export type RecurringCadence = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

/** Produced live by `lib/utils/recurring.ts`'s `detectRecurringSeries()` --
 * not stored in persisted state. See that file for the detection approach
 * (merchant + amount tolerance + interval clustering) and why it runs over
 * real transactions instead of being generated alongside mock data. */
export interface RecurringSeries {
  id: string;
  merchantName: string;
  categoryId: string;
  cadence: RecurringCadence;
  averageAmount: number;
  nextExpectedDate: string; // ISO date
  accountId: string;
  /** How many matching transactions the detector found -- higher means more
   * confidence this is a real recurring charge, not coincidence. */
  occurrenceCount: number;
  /** ISO date of the most recent matching transaction. Compared against
   * `nextExpectedDate` by the Insights screen to flag things that are
   * overdue (may have lapsed/been cancelled) vs. just due soon. */
  lastSeenDate: string;
}

/** One row per category. No per-month history in the MVP -- a limit applies
 * to every month going forward, same as most people's mental model of "my
 * grocery budget," not a spreadsheet with a column per month. */
export interface Budget {
  categoryId: string;
  monthlyLimit: number;
}

export type SavingsGoalType = 'save' | 'debt_payoff';

/**
 * Design-audit-round-3: "Left to spend" treated every dollar not yet
 * assigned to a category limit as fully disposable, which doesn't match
 * why most people actually open a budgeting app -- they're trying to save,
 * not find out how much more they're technically allowed to spend before
 * cash flow goes negative (see docs -- Monarch's default "Flex Budgeting"
 * subtracts a savings/goal commitment *before* it shows you a spendable
 * number; YNAB goes further and treats savings/debt as literal budget
 * categories with no "leftover" concept at all).
 *
 * Deliberately the smallest version of that idea that's still real: one
 * number, one type, not a multi-goal system, not a YNAB-style re-architecture
 * of how income gets allocated. `debt_payoff` exists as an equal option to
 * `save` (not a `save`-only field) because a user actively paying down debt
 * is not well served by a metric that only ever talks about savings --
 * see lib/utils/savingsGoal.ts for how progress is measured differently
 * per type (net income-minus-spending for `save`, the tracked liability
 * account's balance delta for `debt_payoff`).
 */
export interface SavingsGoal {
  type: SavingsGoalType;
  monthlyTarget: number;
  /** `debt_payoff` only -- which liability account's balance drop counts
   * toward the target. Required for that type since "pay down debt" is
   * meaningless without knowing *which* balance; unset for `save`, where
   * progress is measured from income/spending instead of any one account. */
  debtAccountId?: string;
}

export interface NetWorthPoint {
  date: string; // ISO, first of month
  assets: number;
  liabilities: number;
}

export interface FinanceSnapshot {
  institutions: Institution[];
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  recurringSeries: RecurringSeries[];
  budgets: Budget[];
  netWorthHistory: NetWorthPoint[];
  hasLinkedAccounts: boolean;
}
