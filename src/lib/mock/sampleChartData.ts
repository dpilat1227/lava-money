/**
 * Purely illustrative chart data, shown *only* while a user's real history
 * is too thin to draw a meaningful chart (a brand-new manual account with
 * no transactions renders as a flat line / an empty donut / a blank bar
 * chart, which reads as "broken," not "empty"). Every place this is used
 * pairs it with a visible "Sample data" tag (see `Badge` call sites) so it's
 * never mistaken for the user's own numbers -- the moment real data exists,
 * these are swapped out entirely, never blended with it.
 *
 * Nothing here is persisted, counted in totals, or exported. It only ever
 * feeds chart-drawing components directly.
 */
import {
  addMonths,
  addWeeks,
  formatMonthLabel,
  formatWeekLabel,
  formatYearLabel,
  isoDate,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from '@/lib/utils/date';
import type { NetWorthPoint } from '@/lib/types';
import type { MonthlyFlow, SpendGranularity, SpendPeriod } from '@/hooks/useFinanceSelectors';

/** A history counts as "real" once net worth actually moved across the
 * window -- a freshly added manual account with zero transactions unwinds
 * to the exact same balance every month (see `buildNetWorthHistory`), which
 * is the flat line this is meant to catch. */
export function hasEnoughHistoryForChart(history: NetWorthPoint[]): boolean {
  if (history.length < 2) return false;
  const values = history.map(p => p.assets - p.liabilities);
  return new Set(values).size > 1;
}

function monthsAgo(n: number): string {
  return isoDate(startOfMonth(addMonths(new Date(), -n)));
}

/** A gently-rising 7-point net worth curve (6 months back through now) --
 * shaped like "someone saving a bit each month," not a hockey stick. */
export function buildSampleNetWorthHistory(): NetWorthPoint[] {
  const assetsCurve = [24800, 25400, 26900, 27600, 29100, 30450, 31980];
  const liabilitiesCurve = [2200, 2100, 1950, 1800, 1600, 1400, 1200];
  return assetsCurve.map((assets, i) => ({
    date: monthsAgo(6 - i),
    assets,
    liabilities: liabilitiesCurve[i],
  }));
}

/** Six months of plausible income-vs-spending, current month last. */
export function buildSampleMonthlyFlow(): MonthlyFlow[] {
  const income = [5100, 5100, 5250, 5250, 5400, 5400];
  const expense = [3900, 3400, 3700, 3300, 3850, 3550];
  return income.map((inc, i) => ({
    month: monthsAgo(5 - i).slice(0, 7),
    income: inc,
    expense: expense[i],
  }));
}

/** Feeds `CategoryStackedBarChart`'s sample state (a brand-new account with
 * no spend history yet). Reuses `SAMPLE_CATEGORY_TOTALS`'s category mix but
 * scales it to the requested granularity and nudges each period up/down a
 * bit so the bars read as "real recent weeks," not six identical clones. */
export function buildSampleSpendByPeriod(granularity: SpendGranularity, periods: number): SpendPeriod[] {
  const scale = granularity === 'week' ? 1 / 4.345 : granularity === 'year' ? 12 : 1;
  const currentStart = granularity === 'week' ? startOfWeek(new Date()) : granularity === 'year' ? startOfYear(new Date()) : startOfMonth(new Date());

  return Array.from({ length: periods }, (_, i) => {
    const n = -(periods - 1 - i);
    const start = granularity === 'week' ? addWeeks(currentStart, n) : granularity === 'year' ? new Date(currentStart.getFullYear() + n, 0, 1) : addMonths(currentStart, n);
    const wobble = 0.82 + ((i * 53) % 40) / 100; // deterministic, no Math.random flakiness in snapshots
    const byCategory = SAMPLE_CATEGORY_TOTALS.map(c => ({ categoryId: c.categoryId, total: Math.round(c.total * scale * wobble) })).filter(c => c.total > 0);
    const iso = isoDate(start);
    return {
      key: iso,
      label: granularity === 'week' ? formatWeekLabel(iso) : granularity === 'year' ? formatYearLabel(iso) : formatMonthLabel(iso),
      total: byCategory.reduce((s, c) => s + c.total, 0),
      byCategory: byCategory.sort((a, b) => b.total - a.total),
    };
  });
}

/** Category totals for the "Spending by category" donut -- ids match
 * `lib/mock/categories.ts` exactly so colors/names/icons resolve for real. */
export const SAMPLE_CATEGORY_TOTALS: { categoryId: string; total: number }[] = [
  { categoryId: 'groceries', total: 512 },
  { categoryId: 'dining', total: 344 },
  { categoryId: 'housing', total: 1800 },
  { categoryId: 'transport', total: 168 },
  { categoryId: 'subscriptions', total: 62 },
  { categoryId: 'shopping', total: 227 },
];

export interface SampleRecurringItem {
  id: string;
  merchantName: string;
  categoryId: string;
  cadenceLabel: string;
  monthlyEquivalent: number;
  dueLabel: string;
}

/** Shaped like `RecurringInsightItem` but simplified to what
 * `RecurringInsightsCard` actually renders, since building a fully-typed
 * fake `RecurringSeries` (with fabricated ids/dates that mean nothing) buys
 * nothing over rendering the sample card's rows directly. */
export const SAMPLE_RECURRING_ITEMS: SampleRecurringItem[] = [
  { id: 'sample-1', merchantName: 'Streamflix', categoryId: 'subscriptions', cadenceLabel: 'monthly · 4x seen', monthlyEquivalent: 15.99, dueLabel: 'in 6d' },
  { id: 'sample-2', merchantName: 'City Power & Light', categoryId: 'utilities', cadenceLabel: 'monthly · 3x seen', monthlyEquivalent: 118, dueLabel: 'in 12d' },
  { id: 'sample-3', merchantName: 'Iron Gym', categoryId: 'health', cadenceLabel: 'monthly · 5x seen', monthlyEquivalent: 45, dueLabel: 'in 3d' },
];

export const SAMPLE_SUBSCRIPTIONS_MONTHLY_TOTAL = 15.99;
export const SAMPLE_BILLS_MONTHLY_TOTAL = 163;

export interface SampleTransaction {
  id: string;
  merchantName: string;
  categoryId: string;
  amount: number;
}

/** For the Activity tab's true-empty state (a real account, zero real
 * transactions yet) -- see `EmptyState`'s `action` slot in
 * app/(tabs)/transactions.tsx. Rendered dimmed and non-interactive, purely
 * so "what this screen looks like once you're using it" is visible instead
 * of a bare "nothing here" message. */
export const SAMPLE_TRANSACTIONS: SampleTransaction[] = [
  { id: 'sample-tx-1', merchantName: 'Trader Joe\u2019s', categoryId: 'groceries', amount: -64.12 },
  { id: 'sample-tx-2', merchantName: 'Streamflix', categoryId: 'subscriptions', amount: -15.99 },
  { id: 'sample-tx-3', merchantName: 'Paycheck', categoryId: 'income', amount: 2450 },
  { id: 'sample-tx-4', merchantName: 'Corner Cafe', categoryId: 'dining', amount: -8.5 },
];
