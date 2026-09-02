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

/** Same "unwind transactions from the current balance" trick as
 * `buildNetWorthHistory`, but for a single account and expressed as a
 * signed contribution to net worth -- a liability account paying itself
 * down counts as a *positive* contribution, matching how a plain-language
 * caption ("mostly from X") should read. */
function netWorthContributionAsOf(account: Account, transactions: Transaction[], cutoffIso: string): number {
  const futureSum = transactions
    .filter(t => t.accountId === account.id && t.date >= cutoffIso)
    .reduce((s, t) => s + t.amount, 0);

  if (isAssetAccount(account.type)) {
    return account.balance - futureSum;
  }
  return -Math.max(0, account.balance + futureSum);
}

export interface NetWorthMover {
  account: Account;
  delta: number;
}

/** Which single account moved net worth the most over the last N months --
 * the one fact behind Home's "mostly from X" caption. Deliberately just the
 * single biggest mover, not a full attribution breakdown: one sentence
 * should read like an observation, not a report. */
export function biggestNetWorthMover(accounts: Account[], transactions: Transaction[], monthsBack: number): NetWorthMover | undefined {
  const cutoffIso = isoDate(startOfMonth(addMonths(new Date(), -monthsBack + 1)));

  let best: NetWorthMover | undefined;
  for (const account of accounts) {
    const before = netWorthContributionAsOf(account, transactions, cutoffIso);
    const now = isAssetAccount(account.type) ? account.balance : -account.balance;
    const delta = now - before;
    if (!best || Math.abs(delta) > Math.abs(best.delta)) {
      best = { account, delta };
    }
  }
  return best;
}
