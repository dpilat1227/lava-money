import { Colors, ChartPalette } from '@/constants/theme';
import type { Category } from '@/lib/types';

export const CATEGORIES: Category[] = [
  { id: 'income', name: 'Income', emoji: '💰', color: Colors.green, group: 'income' },
  { id: 'transfer', name: 'Transfer', emoji: '↔️', color: Colors.text4, group: 'transfer' },

  { id: 'groceries', name: 'Groceries', emoji: '🛒', color: ChartPalette[0], group: 'expense' },
  { id: 'dining', name: 'Dining Out', emoji: '🍜', color: ChartPalette[1], group: 'expense' },
  { id: 'transport', name: 'Transport', emoji: '🚗', color: ChartPalette[2], group: 'expense' },
  { id: 'housing', name: 'Rent & Housing', emoji: '🏠', color: ChartPalette[3], group: 'expense' },
  { id: 'utilities', name: 'Utilities', emoji: '💡', color: ChartPalette[4], group: 'expense' },
  { id: 'subscriptions', name: 'Subscriptions', emoji: '📺', color: ChartPalette[5], group: 'expense' },
  { id: 'shopping', name: 'Shopping', emoji: '🛍️', color: ChartPalette[6], group: 'expense' },
  { id: 'health', name: 'Health & Fitness', emoji: '💪', color: ChartPalette[7], group: 'expense' },
  { id: 'travel', name: 'Travel', emoji: '✈️', color: ChartPalette[0], group: 'expense' },
  { id: 'entertainment', name: 'Entertainment', emoji: '🎬', color: ChartPalette[1], group: 'expense' },
  { id: 'personal_care', name: 'Personal Care', emoji: '🧴', color: ChartPalette[2], group: 'expense' },
  { id: 'fees', name: 'Fees & Interest', emoji: '🏦', color: Colors.red, group: 'expense' },
  { id: 'other', name: 'Other', emoji: '📦', color: Colors.text3, group: 'expense' },
];

/** Looks up a category by id in the fixed list only. Most of the app
 * shouldn't call this directly -- custom categories (see
 * `FinanceContext.categories`) live outside `CATEGORIES` and won't be found
 * here. Use `findCategory(categories, id)` with the merged list from
 * `useFinance()` instead; this stays exported for the couple of call sites
 * (default-budget seeding, the mock generator) that only ever reference the
 * fixed list on purpose. */
export function getCategory(id: string): Category {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

/** Looks up a category by id in a caller-supplied list (fixed + custom),
 * falling back to "Other" so a stale/deleted categoryId never crashes a
 * render -- same fallback behavior as `getCategory`, just merge-aware. */
export function findCategory(categories: Category[], id: string): Category {
  return categories.find(c => c.id === id) ?? categories.find(c => c.id === 'other') ?? CATEGORIES[CATEGORIES.length - 1];
}

export const EXPENSE_CATEGORIES = CATEGORIES.filter(c => c.group === 'expense');
