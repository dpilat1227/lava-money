import type { Account, NetWorthPoint, Transaction } from '@/lib/types';
import { isAssetAccount } from '@/lib/types';
import { addMonths, isoDate, startOfMonth } from '@/lib/utils/date';

/**
 * Reconstructs a monthly net-worth history from the current account
 * balances by "unwinding" transactions rather than storing snapshots
 * separately -- current balance minus everything that happened after a
 * given month-end is that account's balance as of that month-end. Once real
 * balances come from a live provider, this stops being reconstructable past
 * whenever tracking started, at which point actual stored snapshots (a
 * simple monthly cron writing NetWorthPoint rows) take over -- this function
 * is the bridge for demo data, not the permanent mechanism.
 */
export function buildNetWorthHistory(accounts: Account[], transactions: Transaction[], monthsBack = 6): NetWorthPoint[] {
  const points: NetWorthPoint[] = [];
  const now = new Date();

  for (let m = monthsBack; m >= 0; m--) {
    const monthStart = startOfMonth(addMonths(now, -m));
    const cutoffExclusive = m === 0 ? addMonths(now, 1) : startOfMonth(addMonths(now, -m + 1));
    const cutoffIso = isoDate(cutoffExclusive);

    let assets = 0;
    let liabilities = 0;

    for (const account of accounts) {
      const futureSum = transactions
        .filter(t => t.accountId === account.id && t.date >= cutoffIso)
        .reduce((s, t) => s + t.amount, 0);

      if (isAssetAccount(account.type)) {
        const balanceAsOf = account.balance - futureSum;
        assets += balanceAsOf;
      } else {
        // Liability accounts: balance is "amount owed." Spend (negative tx)
        // increases what's owed, so subtracting the future sum un-increases it.
        const owedAsOf = account.balance + futureSum;
        liabilities += Math.max(0, owedAsOf);
      }
    }

    points.push({ date: isoDate(monthStart), assets: Math.round(assets), liabilities: Math.round(liabilities) });
  }

  return points;
}

export function netWorthOf(point: NetWorthPoint): number {
  return point.assets - point.liabilities;
}
