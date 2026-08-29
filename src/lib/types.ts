/**
 * Core data model. Shaped loosely after what Plaid returns (accounts,
 * transactions with a merchant + category) so a real bank-data provider can
 * be dropped in later behind the same `BankProvider` interface (see
 * lib/store/FinanceContext.tsx) without reshaping every screen.
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
  lastSyncedAt: string; // ISO
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
  recurringSeriesId?: string;
  notes?: string;
}

export type RecurringCadence = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface RecurringSeries {
  id: string;
  merchantName: string;
  categoryId: string;
  cadence: RecurringCadence;
  averageAmount: number;
  nextExpectedDate: string; // ISO date
  accountId: string;
}

/** One row per category. No per-month history in the MVP -- a limit applies
 * to every month going forward, same as most people's mental model of "my
 * grocery budget," not a spreadsheet with a column per month. */
export interface Budget {
  categoryId: string;
  monthlyLimit: number;
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
