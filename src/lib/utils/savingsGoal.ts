import { isAssetAccount, type Account, type RecurringSeries, type Transaction } from '@/lib/types';
import { isoDate, startOfMonth } from './date';
import { CADENCE_TO_MONTHLY } from './insights';

function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

function monthKeyOffset(now: Date, monthsAgo: number): string {
  const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Naive day-of-month linear extrapolation ("spend so far / days so far *
 * days in month") looks artificially good for the first several days of
 * any month where a large recurring bill (rent, insurance) hasn't posted
 * yet, then swings hard once it does -- exactly the "rug pull" that
 * would undermine trust in a number claiming to say whether you're on
 * track to hit a savings goal. This is a real, pre-existing issue with
 * `BudgetHero`'s old pace projection too, just newly load-bearing now that
 * the hero metric is the thing actually being projected.
 *
 * Fix: don't extrapolate the recurring portion of spend/income at all --
 * its full monthly-equivalent amount counts immediately whether or not
 * it's actually posted yet (same `lastSeenDate`-this-month check
 * `RecurringGrid`/`insights.ts` already use to mean "already paid").
 * Only the genuinely variable remainder (groceries, dining -- spend that
 * doesn't repeat on a schedule) gets linearly extrapolated, which is a
 * reasonable assumption for the kind of spend that actually does accrue
 * roughly evenly through a month.
 *
 * Known simplification: a weekly/biweekly series that's only partially
 * recurred within the current month (say 2 of 4 expected weekly charges)
 * is treated as one lump "posted" or "not posted" rather than tracking
 * individual occurrences. Monthly-cadence bills -- rent, most
 * subscriptions, the ones large enough to actually cause the rug-pull
 * problem in practice -- don't have this issue at all.
 */
export function projectMonthlyIncomeAndExpense(
  transactions: Transaction[],
  recurringSeries: RecurringSeries[],
  now: Date = new Date()
): { projectedIncome: number; projectedExpense: number } {
  const currentMonthKey = monthKeyOf(isoDate(now));
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const thisMonthTx = transactions.filter(t => !t.isTransfer && !t.hidden && monthKeyOf(t.date) === currentMonthKey);
  const totalIncomeSoFar = thisMonthTx.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalSpendSoFar = thisMonthTx.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  let recurringIncomePosted = 0;
  let recurringIncomeDue = 0;
  let recurringExpensePosted = 0;
  let recurringExpenseDue = 0;

  for (const series of recurringSeries) {
    const monthlyEquivalent = Math.abs(series.averageAmount) * CADENCE_TO_MONTHLY[series.cadence];
    const postedThisMonth = monthKeyOf(series.lastSeenDate) === currentMonthKey;
    if (series.averageAmount >= 0) {
      if (postedThisMonth) recurringIncomePosted += monthlyEquivalent;
      else recurringIncomeDue += monthlyEquivalent;
    } else {
      if (postedThisMonth) recurringExpensePosted += monthlyEquivalent;
      else recurringExpenseDue += monthlyEquivalent;
    }
  }

  // Isolate the non-recurring ("variable") slice of what's already
  // happened, so only *that* gets extrapolated -- the recurring slice
  // (posted or still due) is added back at its known, full value below.
  const variableIncomeSoFar = Math.max(0, totalIncomeSoFar - recurringIncomePosted);
  const variableExpenseSoFar = Math.max(0, totalSpendSoFar - recurringExpensePosted);
  const variableIncomeProjected = dayOfMonth > 0 ? (variableIncomeSoFar / dayOfMonth) * daysInMonth : variableIncomeSoFar;
  const variableExpenseProjected = dayOfMonth > 0 ? (variableExpenseSoFar / dayOfMonth) * daysInMonth : variableExpenseSoFar;

  return {
    projectedIncome: variableIncomeProjected + recurringIncomePosted + recurringIncomeDue,
    projectedExpense: variableExpenseProjected + recurringExpensePosted + recurringExpenseDue,
  };
}

/** Actual (non-projected) net income for a given calendar month --
 * `monthsAgo=0` is the current, still-in-progress month; `1` is last
 * month, etc. Used for the "vs last month" comparison line and as the
 * non-projected "so far" figure alongside the projection above. */
export function actualNetForMonth(transactions: Transaction[], monthsAgo: number, now: Date = new Date()): number {
  const key = monthKeyOffset(now, monthsAgo);
  return transactions.filter(t => !t.isTransfer && !t.hidden && monthKeyOf(t.date) === key).reduce((s, t) => s + t.amount, 0);
}

/**
 * For `type: 'debt_payoff'` -- how much a liability account's balance
 * already dropped between the start of the given month and its end (or
 * now, for the current month). Positive = progress (balance went down);
 * negative = the balance grew (new charges outpaced any payment).
 * Deliberately not projected/extrapolated the way the 'save' type is --
 * debt payments are usually one lump transfer, not a daily trickle, so
 * there's nothing meaningful to extrapolate mid-month. This is a real,
 * actual-so-far number, same "just show honestly what's happened, don't
 * pretend to predict what hasn't" instinct as the rest of this file.
 *
 * Reuses the same "unwind transactions from the current balance" trick
 * `buildAccountBalanceHistory` (lib/utils/netWorth.ts) already uses for
 * historical net-worth points, just scoped to one account and one
 * specific month boundary instead of a monthsBack series.
 */
export function debtPaidDownForMonth(account: Account, transactions: Transaction[], monthsAgo: number, now: Date = new Date()): number {
  const isAsset = isAssetAccount(account.type);
  const monthStart = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const monthEndExclusive = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 1);
  const startIso = isoDate(monthStart);
  const endIso = monthsAgo === 0 ? isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)) : isoDate(monthEndExclusive);

  const onAccount = transactions.filter(t => t.accountId === account.id);
  const sumFrom = (fromIso: string) => onAccount.filter(t => t.date >= fromIso).reduce((s, t) => s + t.amount, 0);

  // "Unwind" the current balance back to each boundary by adding/removing
  // everything that happened after it -- same isAsset-aware sign as
  // buildAccountBalanceHistory (a liability's balance moves *opposite* to
  // its own transaction signs: a payment being a positive-signed inflow
  // to the account reduces what's owed).
  const balanceAtStart = isAsset ? account.balance - sumFrom(startIso) : account.balance + sumFrom(startIso);
  const balanceAtEnd = isAsset ? account.balance - sumFrom(endIso) : account.balance + sumFrom(endIso);

  return balanceAtStart - balanceAtEnd;
}
