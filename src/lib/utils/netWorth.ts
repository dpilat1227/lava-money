import type { Account, NetWorthPoint, Transaction } from '@/lib/types';
import { isAssetAccount } from '@/lib/types';
import { addDays, addMonths, addWeeks, isoDate, startOfMonth, startOfWeek } from '@/lib/utils/date';

/** ~weeks per calendar month -- only used to translate a "months back"
 * range selection (1M/3M/6M/1Y) into a comparable weekly point count, not
 * for any date-math that needs to be exact. */
const WEEKS_PER_MONTH = 4.345;

/**
 * Reconstructs a net-worth history from the current account balances by
 * "unwinding" transactions rather than storing snapshots separately --
 * current balance minus everything that happened after a given cutoff is
 * that account's balance as of that cutoff. Once real balances come from a
 * live provider, this stops being reconstructable past whenever tracking
 * started, at which point actual stored snapshots (a simple cron writing
 * NetWorthPoint rows) take over -- this function is the bridge for demo
 * data, not the permanent mechanism.
 *
 * `granularity: 'week'` (redesign pass 2) exists because a monthly-only
 * reconstruction only ever produces `monthsBack + 1` points -- 2 for a "1M"
 * view, 7 for "6M" -- which flattens whatever real week-to-week texture the
 * underlying transactions have into a straight line between a handful of
 * dots. Real finance-app charts (Mint, Copilot) plot weekly/daily
 * specifically to keep the paycheck-then-spend sawtooth visible; this is
 * the same "unwind transactions" trick, just walked forward in smaller
 * steps. `useNetWorthSummary`'s month-over-month change/caption math stays
 * on the monthly path (the default) -- only chart-plotting call sites ask
 * for weekly.
 */
export function buildNetWorthHistory(
  accounts: Account[],
  transactions: Transaction[],
  monthsBack = 6,
  granularity: 'month' | 'week' = 'month'
): NetWorthPoint[] {
  const now = new Date();

  const unwind = (cutoffIso: string) => {
    let assets = 0;
    let liabilities = 0;
    for (const account of accounts) {
      const futureSum = transactions
        .filter(t => t.accountId === account.id && t.date >= cutoffIso)
        .reduce((s, t) => s + t.amount, 0);

      if (isAssetAccount(account.type)) {
        assets += account.balance - futureSum;
      } else {
        // Liability accounts: balance is "amount owed." Spend (negative tx)
        // increases what's owed, so subtracting the future sum un-increases it.
        liabilities += Math.max(0, account.balance + futureSum);
      }
    }
    return { assets: Math.round(assets), liabilities: Math.round(liabilities) };
  };

  if (granularity === 'week') {
    const points: NetWorthPoint[] = [];
    const currentWeekStart = startOfWeek(now);
    const weeksBack = Math.max(1, Math.round(monthsBack * WEEKS_PER_MONTH));

    for (let w = weeksBack; w >= 0; w--) {
      const weekStart = addWeeks(currentWeekStart, -w);
      const cutoffExclusive = w === 0 ? addDays(now, 1) : addWeeks(currentWeekStart, -w + 1);
      const { assets, liabilities } = unwind(isoDate(cutoffExclusive));
      points.push({ date: isoDate(weekStart), assets, liabilities });
    }
    return points;
  }

  const points: NetWorthPoint[] = [];
  for (let m = monthsBack; m >= 0; m--) {
    const monthStart = startOfMonth(addMonths(now, -m));
    const cutoffExclusive = m === 0 ? addMonths(now, 1) : startOfMonth(addMonths(now, -m + 1));
    const { assets, liabilities } = unwind(isoDate(cutoffExclusive));
    points.push({ date: isoDate(monthStart), assets, liabilities });
  }
  return points;
}

export function netWorthOf(point: NetWorthPoint): number {
  return point.assets - point.liabilities;
}

/**
 * Single-account analog of `buildNetWorthHistory`'s "unwind transactions
 * from the current balance" trick -- lets an account's detail page plot a
 * balance-over-time chart even though this app has no separate
 * balance-snapshot history, only a current balance + a transaction log.
 * Returned as `NetWorthPoint`s (not a plain number series) purely so the
 * existing `NetWorthChart` can render it unmodified -- `netWorthOf` already
 * just does `assets - liabilities`, so putting the whole signed balance on
 * one side or the other reproduces the same number `NetWorthChart` expects,
 * with the same up-is-green/down-is-red convention as everywhere else.
 */
export function buildAccountBalanceHistory(account: Account, transactions: Transaction[], monthsBack = 6): NetWorthPoint[] {
  const points: NetWorthPoint[] = [];
  const now = new Date();
  const isAsset = isAssetAccount(account.type);

  for (let m = monthsBack; m >= 0; m--) {
    const monthStart = startOfMonth(addMonths(now, -m));
    const cutoffExclusive = m === 0 ? addMonths(now, 1) : startOfMonth(addMonths(now, -m + 1));
    const cutoffIso = isoDate(cutoffExclusive);

    const futureSum = transactions
      .filter(t => t.accountId === account.id && t.date >= cutoffIso)
      .reduce((s, t) => s + t.amount, 0);

    const balanceAsOf = isAsset ? account.balance - futureSum : account.balance + futureSum;
    points.push({
      date: isoDate(monthStart),
      assets: isAsset ? Math.round(balanceAsOf) : 0,
      liabilities: isAsset ? 0 : Math.round(Math.max(0, balanceAsOf)),
    });
  }

  return points;
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
 * should read like an observation, not a report.
 *
 * `directionFilter` -- design-audit pass: without this, "biggest mover" was
 * whichever account had the largest swing *in either direction*, with no
 * guarantee it actually pointed the same way as the overall change. It's
 * entirely possible (and, once actually testable with the mock generator's
 * scattered discretionary spend, not even rare) for the single largest
 * individual swing to be a *growing* checking account while net worth
 * overall is *down* -- because something else fell by more. That produced
 * sentences like "Down 21% ... mostly from Everyday Checking, which grew
 * $9.5k" -- a caption contradicting itself in one breath. Restricting the
 * search to accounts whose own delta shares the overall direction's sign
 * guarantees "mostly from X" always names something that actually pushed
 * net worth *that way* -- and there's always at least one: if the total
 * fell, at least one account's own delta must have been negative (a sum of
 * every-account deltas can't go negative if every single one was >= 0). */
export function biggestNetWorthMover(
  accounts: Account[],
  transactions: Transaction[],
  monthsBack: number,
  directionFilter?: 'up' | 'down'
): NetWorthMover | undefined {
  const cutoffIso = isoDate(startOfMonth(addMonths(new Date(), -monthsBack + 1)));

  let best: NetWorthMover | undefined;
  for (const account of accounts) {
    const before = netWorthContributionAsOf(account, transactions, cutoffIso);
    const now = isAssetAccount(account.type) ? account.balance : -account.balance;
    const delta = now - before;
    if (directionFilter === 'up' && delta < 0) continue;
    if (directionFilter === 'down' && delta > 0) continue;
    if (!best || Math.abs(delta) > Math.abs(best.delta)) {
      best = { account, delta };
    }
  }
  return best;
}
