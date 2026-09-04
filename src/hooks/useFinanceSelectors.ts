import { useMemo } from 'react';

import { useFinance } from '@/lib/store/FinanceContext';
import type { NetWorthPoint, SavingsGoal, Transaction } from '@/lib/types';
import {
  addMonths,
  addWeeks,
  currentMonthKey,
  formatMonthLabel,
  formatWeekLabel,
  formatYearLabel,
  isoDate,
  monthKey,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from '@/lib/utils/date';
import { buildRecurringInsights, type RecurringInsights } from '@/lib/utils/insights';
import { buildNetWorthHistory, netWorthOf } from '@/lib/utils/netWorth';
import { actualNetForMonth, debtPaidDownForMonth, projectMonthlyIncomeAndExpense } from '@/lib/utils/savingsGoal';

export function useNetWorthHistory(monthsBack = 6, granularity: 'month' | 'week' = 'month'): NetWorthPoint[] {
  const { accounts, transactions } = useFinance();
  return useMemo(
    () => buildNetWorthHistory(accounts, transactions, monthsBack, granularity),
    [accounts, transactions, monthsBack, granularity]
  );
}

export function useNetWorthSummary() {
  const history = useNetWorthHistory(6);
  return useMemo(() => {
    const latest = history[history.length - 1];
    const previous = history[history.length - 2];
    const netWorth = latest ? netWorthOf(latest) : 0;
    const prevNetWorth = previous ? netWorthOf(previous) : netWorth;
    const change = netWorth - prevNetWorth;
    return {
      netWorth,
      assets: latest?.assets ?? 0,
      liabilities: latest?.liabilities ?? 0,
      change,
      changePct: prevNetWorth !== 0 ? change / Math.abs(prevNetWorth) : 0,
    };
  }, [history]);
}

/** Real (non-transfer, non-hidden) transactions for a given YYYY-MM month key. */
function monthTransactions(transactions: Transaction[], month: string): Transaction[] {
  return transactions.filter(t => !t.isTransfer && !t.hidden && monthKey(t.date) === month);
}

export function useCurrentMonthSpendByCategory(): Map<string, number> {
  const { transactions } = useFinance();
  return useMemo(() => {
    const month = currentMonthKey();
    const map = new Map<string, number>();
    for (const t of monthTransactions(transactions, month)) {
      if (t.amount >= 0) continue; // spend only
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + Math.abs(t.amount));
    }
    return map;
  }, [transactions]);
}

export interface BudgetProgress {
  categoryId: string;
  spent: number;
  limit: number;
  pct: number; // 0..1+ (can exceed 1)
}

export function useBudgetProgress(): BudgetProgress[] {
  const { budgets } = useFinance();
  const spendByCategory = useCurrentMonthSpendByCategory();
  return useMemo(
    () =>
      budgets.map(b => {
        const spent = spendByCategory.get(b.categoryId) ?? 0;
        return { categoryId: b.categoryId, spent, limit: b.monthlyLimit, pct: b.monthlyLimit > 0 ? spent / b.monthlyLimit : 0 };
      }),
    [budgets, spendByCategory]
  );
}

export interface SavingsGoalProgress {
  goal: SavingsGoal | null;
  /** Actual, not projected. For `save`: income minus spend so far this
   * month. For `debt_payoff`: how much the tracked account's balance has
   * already dropped this month. Always real numbers, never a guess. */
  actualSoFar: number;
  /** Recurring-bill-aware projection to month-end for `save` (see
   * projectMonthlyIncomeAndExpense's doc). Equal to `actualSoFar` for
   * `debt_payoff` -- see debtPaidDownForMonth's doc for why that one isn't
   * projected at all. */
  projected: number;
  /** Same actual figure, for the last complete month -- powers a "vs last
   * month" comparison line. */
  lastMonthActual: number;
}

const NO_GOAL_PROGRESS: SavingsGoalProgress = { goal: null, actualSoFar: 0, projected: 0, lastMonthActual: 0 };

/** Design-audit-round-3: the data behind Budgets' "on track to save/pay
 * down $X" hero. One hook, one shape, regardless of which goal type (or
 * no goal at all) is active, so BudgetHero doesn't need type-narrowing at
 * the call site. */
export function useSavingsGoalProgress(): SavingsGoalProgress {
  const { savingsGoal, transactions, recurringSeries, accounts } = useFinance();
  return useMemo(() => {
    if (!savingsGoal) return NO_GOAL_PROGRESS;

    if (savingsGoal.type === 'debt_payoff') {
      const account = accounts.find(a => a.id === savingsGoal.debtAccountId);
      if (!account) return { ...NO_GOAL_PROGRESS, goal: savingsGoal };
      const actualSoFar = debtPaidDownForMonth(account, transactions, 0);
      const lastMonthActual = debtPaidDownForMonth(account, transactions, 1);
      return { goal: savingsGoal, actualSoFar, projected: actualSoFar, lastMonthActual };
    }

    const { projectedIncome, projectedExpense } = projectMonthlyIncomeAndExpense(transactions, recurringSeries);
    return {
      goal: savingsGoal,
      actualSoFar: actualNetForMonth(transactions, 0),
      projected: projectedIncome - projectedExpense,
      lastMonthActual: actualNetForMonth(transactions, 1),
    };
  }, [savingsGoal, transactions, recurringSeries, accounts]);
}

export function useUpcomingRecurring(limit = 6) {
  const { recurringSeries } = useFinance();
  return useMemo(() => {
    // A series whose expected date never got rolled forward (one-off
    // detection that didn't recur again, a cancelled subscription, a
    // false-positive match in otherwise-random spending) can end up with
    // `nextExpectedDate` sitting in the past -- sorting by date alone put
    // that *first*, at the top of a section titled "Upcoming," instead of
    // excluding it. The dedicated /recurring page already has a real
    // vocabulary for this (due_soon/late/overdue, see lib/utils/insights.ts);
    // this is just Home's compact forward-looking teaser, so it only needs
    // to filter, not duplicate that nuance.
    const today = isoDate(new Date());
    return [...recurringSeries]
      .filter(s => s.nextExpectedDate >= today)
      .sort((a, b) => (a.nextExpectedDate < b.nextExpectedDate ? -1 : 1))
      .slice(0, limit);
  }, [recurringSeries, limit]);
}

export function useRecurringInsights(): RecurringInsights {
  const { recurringSeries } = useFinance();
  return useMemo(() => buildRecurringInsights(recurringSeries), [recurringSeries]);
}

export interface MonthlyFlow {
  month: string; // YYYY-MM
  income: number;
  expense: number;
}

export function useMonthlyIncomeVsExpense(monthsBack = 6): MonthlyFlow[] {
  const { transactions } = useFinance();
  return useMemo(() => {
    const now = new Date();
    const months: string[] = [];
    for (let m = monthsBack - 1; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return months.map(month => {
      const txs = monthTransactions(transactions, month);
      const income = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const expense = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
      return { month, income, expense };
    });
  }, [transactions, monthsBack]);
}

/**
 * Spend so far this month vs. spend *through the same day-of-month* last
 * month -- not last month's full total. Comparing a partial current month
 * against a complete previous one always reads as "way less than last
 * month" for the first ~29 days of every month, which is misleading rather
 * than useful (see `SpendingCard`'s comparison line, which used to do
 * exactly that). This is the same "don't compare a partial period to a
 * complete one" fix as Budgets' month-end pace projection, applied to the
 * Home screen's spend comparison instead of extrapolated forward.
 */
export function useMonthToDateComparison(): { current: number; previous: number } {
  const { transactions } = useFinance();
  return useMemo(() => {
    const now = new Date();
    const dayOfMonth = now.getDate();

    function spendThroughDay(monthsAgo: number): number {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
      const daysInThatMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
      const cutoffDay = Math.min(dayOfMonth, daysInThatMonth);
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      return monthTransactions(transactions, key)
        .filter(t => t.amount < 0 && Number(t.date.slice(8, 10)) <= cutoffDay)
        .reduce((s, t) => s + Math.abs(t.amount), 0);
    }

    return { current: spendThroughDay(0), previous: spendThroughDay(1) };
  }, [transactions]);
}

/**
 * `completeOnly` shifts the whole "last N months" window back by one month,
 * i.e. "last N *complete* months" instead of "the current, still-in-progress
 * month plus N-1 previous ones." Without it, `monthsBack = 1` on the 2nd of
 * a month returns almost nothing (one or two days of spend) which reads as
 * broken, not as "early in the month" -- same class of bug as
 * `useSpendByPeriod`'s own `completeOnly`, and callers that want a
 * representative "spending by category" snapshot regardless of what day of
 * the month it is should default to `true`.
 */
export function useCategorySpendTotals(monthsBack = 1, completeOnly = false): { categoryId: string; total: number }[] {
  const { transactions } = useFinance();
  return useMemo(() => {
    const now = new Date();
    const endOffset = completeOnly ? 1 : 0;
    const cutoff = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1 - endOffset, 1);
    const end = completeOnly ? new Date(now.getFullYear(), now.getMonth() - endOffset + 1, 1) : null;
    const totals = new Map<string, number>();
    for (const t of transactions) {
      if (t.isTransfer || t.hidden || t.amount >= 0) continue;
      const d = new Date(t.date + 'T00:00:00');
      if (d < cutoff) continue;
      if (end && d >= end) continue;
      totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + Math.abs(t.amount));
    }
    return [...totals.entries()]
      .map(([categoryId, total]) => ({ categoryId, total }))
      .sort((a, b) => b.total - a.total);
  }, [transactions, monthsBack, completeOnly]);
}

export type SpendGranularity = 'week' | 'month' | 'year';

export interface SpendPeriod {
  /** ISO date of the period's start -- stable, sortable, safe as a React key
   * and as the "selected" identity passed back through `onSelectPeriod`. */
  key: string;
  label: string;
  total: number;
  byCategory: { categoryId: string; total: number }[];
}

function periodStart(date: Date, granularity: SpendGranularity): Date {
  if (granularity === 'week') return startOfWeek(date);
  if (granularity === 'year') return startOfYear(date);
  return startOfMonth(date);
}

function periodAdd(date: Date, granularity: SpendGranularity, n: number): Date {
  if (granularity === 'week') return addWeeks(date, n);
  if (granularity === 'year') return new Date(date.getFullYear() + n, date.getMonth(), date.getDate());
  return addMonths(date, n);
}

function periodLabel(date: Date, granularity: SpendGranularity): string {
  const iso = isoDate(date);
  if (granularity === 'week') return formatWeekLabel(iso);
  if (granularity === 'year') return formatYearLabel(iso);
  return formatMonthLabel(iso);
}

/**
 * Powers `CategoryStackedBarChart` on both Home and Trends -- one bar per
 * period, each bucketed by category so the chart can stack/color segments
 * (see docs/HANDOFF.md's Apple-Card-style redesign notes). Spend-only,
 * non-transfer, same exclusion rules as every other spend selector here.
 */
/**
 * `completeOnly` shifts the entire window back by one period, so the last
 * entry returned is the most recently *finished* period instead of the
 * current, still-accumulating one. Every "over time" trend view wants this
 * -- comparing a two-day-old month against a full previous month (or
 * plotting it as a bar a fraction of the height of every other bar) reads
 * as "spending collapsed" or "the chart is broken," not as "it's early in
 * the month." Live, in-progress totals still belong on screens answering
 * "how am I doing *right now*" (Budgets' hero/list, `useMonthToDateComparison`)
 * -- this is only for screens answering "what does my spending look like
 * over time," where a half-finished trailing bar actively misleads.
 */
export function useSpendByPeriod(granularity: SpendGranularity, periods: number, options?: { completeOnly?: boolean }): SpendPeriod[] {
  const { transactions } = useFinance();
  const endOffset = options?.completeOnly ? 1 : 0;
  return useMemo(() => {
    const currentStart = periodStart(new Date(), granularity);
    const starts: Date[] = [];
    for (let i = periods - 1; i >= 0; i--) {
      starts.push(periodAdd(currentStart, granularity, -(i + endOffset)));
    }

    return starts.map((start, i) => {
      const end = i < starts.length - 1 ? starts[i + 1] : periodAdd(start, granularity, 1);
      const byCategory = new Map<string, number>();
      let total = 0;
      for (const t of transactions) {
        if (t.isTransfer || t.hidden || t.amount >= 0) continue;
        const d = new Date(t.date + 'T00:00:00');
        if (d < start || d >= end) continue;
        const amt = Math.abs(t.amount);
        byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + amt);
        total += amt;
      }
      return {
        key: isoDate(start),
        label: periodLabel(start, granularity),
        total,
        byCategory: [...byCategory.entries()]
          .map(([categoryId, categoryTotal]) => ({ categoryId, total: categoryTotal }))
          .sort((a, b) => b.total - a.total),
      };
    });
  }, [transactions, granularity, periods, endOffset]);
}

/**
 * One category's monthly spend across `monthsBack` months, most recent
 * last -- powers the category-detail screen's monthly bar chart. Reuses
 * `useSpendByPeriod`'s existing month-bucketing/`byCategory` breakdown
 * instead of re-deriving date buckets a second time; just narrows each
 * month down to one category's slice of it.
 */
export function useCategoryMonthlyHistory(categoryId: string, monthsBack = 13): SpendPeriod[] {
  const months = useSpendByPeriod('month', monthsBack);
  return useMemo(
    () =>
      months.map(m => ({
        ...m,
        total: m.byCategory.find(c => c.categoryId === categoryId)?.total ?? 0,
      })),
    [months, categoryId]
  );
}

/** One category's transactions, newest first -- the category-detail
 * screen groups these by month itself (presentation concern, same as
 * Activity grouping its own list by day) rather than this hook doing it. */
export function useCategoryTransactions(categoryId: string): Transaction[] {
  const { transactions } = useFinance();
  return useMemo(
    () => transactions.filter(t => t.categoryId === categoryId && !t.hidden).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [transactions, categoryId]
  );
}

/** Transactions sorted newest-first and grouped by date for a list view. */
export function useGroupedTransactions(searchQuery = '', accountId?: string) {
  const { transactions } = useFinance();
  return useMemo(() => {
    // Hidden rows drop out of the visible ledger entirely (that's the
    // point -- see Transaction.hidden's doc), but stay in `transactions`
    // itself so Settings' "Hidden transactions" row can still list and
    // unhide them.
    let filtered = transactions.filter(t => !t.hidden);
    if (accountId) filtered = filtered.filter(t => t.accountId === accountId);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(t => t.merchantName.toLowerCase().includes(q));
    }
    const sorted = [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1));
    const groups: { date: string; transactions: Transaction[] }[] = [];
    for (const t of sorted) {
      const last = groups[groups.length - 1];
      if (last && last.date === t.date) last.transactions.push(t);
      else groups.push({ date: t.date, transactions: [t] });
    }
    return groups;
  }, [transactions, searchQuery, accountId]);
}
