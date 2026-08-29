import { useMemo } from 'react';

import { useFinance } from '@/lib/store/FinanceContext';
import type { NetWorthPoint, Transaction } from '@/lib/types';
import { currentMonthKey, monthKey } from '@/lib/utils/date';
import { buildNetWorthHistory, netWorthOf } from '@/lib/utils/netWorth';

export function useNetWorthHistory(monthsBack = 6): NetWorthPoint[] {
  const { accounts, transactions } = useFinance();
  return useMemo(() => buildNetWorthHistory(accounts, transactions, monthsBack), [accounts, transactions, monthsBack]);
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

/** Real (non-transfer) transactions for a given YYYY-MM month key. */
function monthTransactions(transactions: Transaction[], month: string): Transaction[] {
  return transactions.filter(t => !t.isTransfer && monthKey(t.date) === month);
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

export function useUpcomingRecurring(limit = 6) {
  const { recurringSeries } = useFinance();
  return useMemo(
    () => [...recurringSeries].sort((a, b) => (a.nextExpectedDate < b.nextExpectedDate ? -1 : 1)).slice(0, limit),
    [recurringSeries, limit]
  );
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

export function useCategorySpendTotals(monthsBack = 1): { categoryId: string; total: number }[] {
  const { transactions } = useFinance();
  return useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);
    const totals = new Map<string, number>();
    for (const t of transactions) {
      if (t.isTransfer || t.amount >= 0) continue;
      if (new Date(t.date + 'T00:00:00') < cutoff) continue;
      totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + Math.abs(t.amount));
    }
    return [...totals.entries()]
      .map(([categoryId, total]) => ({ categoryId, total }))
      .sort((a, b) => b.total - a.total);
  }, [transactions, monthsBack]);
}

/** Transactions sorted newest-first and grouped by date for a list view. */
export function useGroupedTransactions(searchQuery = '', accountId?: string) {
  const { transactions } = useFinance();
  return useMemo(() => {
    let filtered = transactions;
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
