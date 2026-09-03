import { Colors } from '@/constants/theme';
import type { Category } from '@/lib/types';

// Each expense category gets its own explicit, non-repeating color --
// previously these cycled through an 8-entry ChartPalette by index, which
// silently collided once the list grew past 8 (dining == entertainment,
// transport == personal_care, groceries == travel, shopping == the same
// red as Fees & Interest). Green and red are deliberately never assigned
// to a regular expense category -- this app uses both as "good/bad"
// signals everywhere else (income, positive net worth change, under vs.
// over budget), so Rent showing the same green as Income, or Shopping
// showing the same red as an actual fee, read as meaningful when they
// weren't -- worse than a generic collision between two ordinary categories.
//
// Round 2 (design-audit pass): swatch-rendering round 1's assignments as
// actual filled circles -- not just comparing hex/hue values on paper --
// surfaced two more collisions that hue-degree math alone didn't predict:
// subscriptions' yellow sat close enough to utilities' amber to read as the
// same gold, and entertainment's indigo blurred into transport's blue and
// travel's sky as one blue-purple cluster. Fixed by giving subscriptions
// its own `brown` and entertainment its own `rose` (see theme.ts for why
// `rose` isn't just reusing the existing `pink` token), and shifting travel
// from `sky` to the `indigo` that freed up.
export const CATEGORIES: Category[] = [
  { id: 'income', name: 'Income', emoji: '💰', color: Colors.green, group: 'income' },
  { id: 'transfer', name: 'Transfer', emoji: '↔️', color: Colors.text4, group: 'transfer' },

  { id: 'groceries', name: 'Groceries', emoji: '🛒', color: Colors.orange, group: 'expense' },
  { id: 'dining', name: 'Dining Out', emoji: '🍜', color: Colors.fuchsia, group: 'expense' },
  { id: 'transport', name: 'Transport', emoji: '🚗', color: Colors.blue, group: 'expense' },
  { id: 'housing', name: 'Rent & Housing', emoji: '🏠', color: Colors.purple, group: 'expense' },
  { id: 'utilities', name: 'Utilities', emoji: '💡', color: Colors.amber, group: 'expense' },
  { id: 'subscriptions', name: 'Subscriptions', emoji: '📺', color: Colors.brown, group: 'expense' },
  { id: 'shopping', name: 'Shopping', emoji: '🛍️', color: Colors.lime, group: 'expense' },
  { id: 'health', name: 'Health & Fitness', emoji: '💪', color: Colors.cyan, group: 'expense' },
  { id: 'travel', name: 'Travel', emoji: '✈️', color: Colors.indigo, group: 'expense' },
  { id: 'entertainment', name: 'Entertainment', emoji: '🎬', color: Colors.rose, group: 'expense' },
  { id: 'personal_care', name: 'Personal Care', emoji: '🧴', color: Colors.teal, group: 'expense' },
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
