import type { Category } from '@/lib/types';

/** A plausible "most people budget about this much" starting point per
 * category -- also the smart-setup fallback when a category has no real
 * spend to anchor a number to (a brand-new account with zero transaction
 * history). Purely a starting suggestion, changeable with one tap via the
 * preset chips in the edit sheet or by just typing over it. */
export const SUGGESTED_DEFAULTS: Record<string, number> = {
  groceries: 500,
  dining: 250,
  transport: 150,
  housing: 1800,
  utilities: 200,
  subscriptions: 60,
  shopping: 200,
  health: 100,
  travel: 150,
  entertainment: 100,
  personal_care: 75,
  fees: 25,
  other: 100,
};

/** Starter categories used for smart setup when there's no spend history at
 * all to anchor numbers to (a brand-new demo account) -- the handful of
 * categories most people actually budget for, so "Set up budgets" never
 * has literally nothing to do. */
const STARTER_CATEGORY_IDS = ['groceries', 'dining', 'transport', 'subscriptions', 'shopping'];

function roundToNearest(value: number, step: number): number {
  return Math.max(step, Math.ceil(value / step) * step);
}

/**
 * The one-tap "Set up budgets" action (see Budgets' empty state) -- rather
 * than dropping a user into 12 empty category rows and asking them to type
 * a number into each one ("too much work" was the exact complaint this
 * replaces), this proposes a real limit per category already **based on
 * what they've actually spent** this month, headroomed up ~15% and rounded
 * to a clean $25 increment so it reads like a considered number instead of
 * an arbitrary one. Falls back to `SUGGESTED_DEFAULTS` for a small starter
 * set when there's no spend history yet to anchor to.
 */
export function computeSmartBudgets(
  expenseCategories: Category[],
  spendByCategory: Map<string, number>
): { categoryId: string; limit: number }[] {
  const withSpend = expenseCategories.filter(c => (spendByCategory.get(c.id) ?? 0) > 0);

  if (withSpend.length === 0) {
    return expenseCategories
      .filter(c => STARTER_CATEGORY_IDS.includes(c.id))
      .map(c => ({ categoryId: c.id, limit: SUGGESTED_DEFAULTS[c.id] ?? 100 }));
  }

  return withSpend.map(c => {
    const spent = spendByCategory.get(c.id) ?? 0;
    const headroomed = spent * 1.15;
    const limit = roundToNearest(Math.max(headroomed, SUGGESTED_DEFAULTS[c.id] ?? 100), 25);
    return { categoryId: c.id, limit };
  });
}
