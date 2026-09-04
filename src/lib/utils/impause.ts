/**
 * "Spend pause" — the v1.1 Impause-style feature deferred across nights 1–3
 * and resolved night 4 (see docs/STRATEGY.md's addendum). Decision: a
 * universal layer over discretionary spend, not a manual-entry-only nudge.
 *
 * This is a *reflection* prompt, not a purchase blocker — Lava Money never
 * sees a transaction before it happens (no card-network integration, ever),
 * so "pause before you buy" isn't a thing this app can honestly do. What it
 * can do: surface a brief "here's where this category stands" moment right
 * after a discretionary transaction is recorded, once, non-blockingly,
 * dismissible with a single tap. See `PausePrompt` (components/impause) for
 * the UI and `FinanceContext`'s `acknowledgedPauseIds` for how "once" is
 * tracked.
 */
import type { Budget, Category, Transaction } from '@/lib/types';
import { currentMonthKey, monthKey } from '@/lib/utils/date';

/** Fixed-list category ids treated as "discretionary" -- the ones where a
 * brief reflection pause is actually useful (would you still buy this?),
 * as opposed to bills/rent/groceries where the question doesn't really
 * apply. Custom categories are never discretionary by default -- we have no
 * signal on what a user-invented category means to them, and guessing
 * wrong (pausing on someone's "Kids" category) would just read as noise. */
const DISCRETIONARY_CATEGORY_IDS = new Set(['dining', 'shopping', 'entertainment', 'subscriptions']);

export function isDiscretionaryCategory(categoryId: string): boolean {
  return DISCRETIONARY_CATEGORY_IDS.has(categoryId);
}

/** A transaction is pause-eligible if it's real spend (negative amount, not
 * a transfer) in a discretionary category. Income and transfers never
 * qualify regardless of categoryId -- there's no discretionary-spend
 * question to reflect on for money moving the other way. */
export function isPauseEligible(tx: Transaction): boolean {
  return tx.amount < 0 && !tx.isTransfer && !tx.hidden && isDiscretionaryCategory(tx.categoryId);
}

export interface PauseContext {
  category: Category;
  /** Count of transactions in this category this month, including `tx`
   * itself -- "this is your 4th Dining Out purchase this month," etc. */
  occurrenceThisMonth: number;
  /** Total spent in this category this month (positive number), including
   * `tx`. */
  monthTotal: number;
  budgetLimit?: number;
  /** 0..1+ , undefined if no budget set for this category. */
  budgetPct?: number;
}

export function buildPauseContext(tx: Transaction, transactions: Transaction[], budgets: Budget[], category: Category): PauseContext {
  const targetMonth = monthKey(tx.date);
  const sameMonthSameCategory = transactions.filter(
    t => t.categoryId === tx.categoryId && !t.isTransfer && !t.hidden && t.amount < 0 && monthKey(t.date) === targetMonth
  );
  const monthTotal = sameMonthSameCategory.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const budget = budgets.find(b => b.categoryId === tx.categoryId);

  return {
    category,
    occurrenceThisMonth: sameMonthSameCategory.length,
    monthTotal: Math.round(monthTotal * 100) / 100,
    budgetLimit: budget?.monthlyLimit,
    budgetPct: budget ? monthTotal / budget.monthlyLimit : undefined,
  };
}

const ORDINALS: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' };
function ordinal(n: number): string {
  return ORDINALS[n] ?? `${n}th`;
}

/** Plain-language reflection line -- same "explain the guess, don't just
 * flag it" philosophy as the categorizer's `reason` field. Deliberately not
 * judgmental ("you're overspending!") -- just the facts, so it reads as
 * useful context, not a scold. */
export function pauseMessage(ctx: PauseContext): string {
  const { category, occurrenceThisMonth, monthTotal, budgetLimit } = ctx;
  const nth = ordinal(occurrenceThisMonth);
  if (budgetLimit) {
    return `Your ${nth} ${category.name} purchase this month — ${formatShort(monthTotal)} of ${formatShort(budgetLimit)} spent so far.`;
  }
  return `Your ${nth} ${category.name} purchase this month — ${formatShort(monthTotal)} so far. No budget set for this category yet.`;
}

function formatShort(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** Whether a transaction should get a *retroactive* pause prompt the first
 * time its detail screen is opened -- pause-eligible, not yet acknowledged,
 * AND from the current month. That last condition matters: reflecting on a
 * four-month-old backfilled coffee run is noise, not a useful nudge. It's
 * also what keeps this "universal" without becoming "every historical
 * transaction from a freshly-linked demo bank pops a dialog" -- linking an
 * institution backfills months of history, but only this month's slice of
 * it is recent enough for a pause to mean anything. */
export function shouldShowRetroactivePause(tx: Transaction | undefined, acknowledgedIds: string[]): boolean {
  if (!tx) return false;
  return isPauseEligible(tx) && !acknowledgedIds.includes(tx.id) && monthKey(tx.date) === currentMonthKey();
}
