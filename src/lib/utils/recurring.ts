/**
 * Real recurring-charge detection over actual transaction history --
 * merchant + amount tolerance + interval clustering -- rather than the mock
 * generator just handing back the templates it used to invent the data (see
 * the "why this isn't run through a detector" note that used to live in
 * `lib/mock/generator.ts`). This is what makes recurring detection work for
 * manual and CSV-imported accounts too, not just simulated-linked ones: it
 * only ever looks at `Transaction[]`, the one shape every entry path
 * (linked, manual, imported) already produces.
 *
 * `FinanceContext` calls this live (memoized on `transactions`/`accounts`)
 * instead of storing a `RecurringSeries[]` in persisted state, so it's
 * always a consequence of current history, not a snapshot that can drift
 * out of sync with it (e.g. after deleting the transactions that justified
 * it, or unlinking the account).
 */
import type { Account, RecurringCadence, RecurringSeries, Transaction } from '@/lib/types';

/** [min, max] gap-in-days bucket a cadence's *typical* interval must fall
 * within to be classified as that cadence at all. Yearly is deliberately
 * excluded -- with only 6 months of mock/real history available, there's
 * never enough data to distinguish "an annual charge" from "a one-off,"
 * and a wrong "yearly" guess is a worse UI experience than no guess. */
const CADENCE_BUCKETS: { cadence: RecurringCadence; min: number; max: number }[] = [
  { cadence: 'weekly', min: 5, max: 9 },
  { cadence: 'biweekly', min: 12, max: 16 },
  { cadence: 'monthly', min: 26, max: 35 },
];

const MIN_OCCURRENCES = 2;
/** Relative amount tolerance (as a fraction of the group's mean amount) --
 * covers things like a variable utility bill or a paycheck with a few
 * dollars/hours of overtime, without also matching two unrelated purchases
 * that happen to share a merchant name. Combined with a flat floor so
 * tiny/free-ish charges don't get an unreasonably tight window. */
const AMOUNT_TOLERANCE_PCT = 0.22;
const AMOUNT_TOLERANCE_FLOOR = 3;
/** With 3+ occurrences, also require the gaps between them to be
 * consistent with each other (not just each individually falling in a
 * bucket) -- guards against e.g. three coincidentally-spaced but unrelated
 * charges at the same merchant. Expressed as (max gap - min gap) / median. */
const MAX_GAP_SPREAD_RATIO = 0.45;

function normalizeMerchant(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mode<T>(values: T[]): T {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0];
  let bestCount = 0;
  for (const [v, count] of counts) {
    if (count > bestCount) {
      best = v;
      bestCount = count;
    }
  }
  return best;
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / msPerDay);
}

interface Group {
  accountId: string;
  merchantKey: string;
  transactions: Transaction[];
}

function classifyCadence(gaps: number[]): RecurringCadence | null {
  const med = median(gaps);
  const bucket = CADENCE_BUCKETS.find(b => med >= b.min && med <= b.max);
  if (!bucket) return null;

  if (gaps.length >= 2) {
    const spread = Math.max(...gaps) - Math.min(...gaps);
    if (spread / med > MAX_GAP_SPREAD_RATIO) return null;
  }
  return bucket.cadence;
}

/** With only 2 occurrences, a coincidental repeat purchase at the same
 * merchant (e.g. two unrelated haircuts a month apart, similar price) is
 * far more likely to slip through than with 3+, since there's no third data
 * point to disagree with a false pattern. Demand a noticeably tighter
 * amount match in that case -- a real recurring charge (subscription, bill)
 * is usually the *same* number or close to it every time; two independent
 * purchases landing within 22% of each other by chance is a real risk that
 * within 8% is not. */
function amountsAreConsistent(amounts: number[]): boolean {
  const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  const pct = amounts.length <= 2 ? 0.08 : AMOUNT_TOLERANCE_PCT;
  const tolerance = Math.max(AMOUNT_TOLERANCE_FLOOR, Math.abs(mean) * pct);
  return amounts.every(a => Math.abs(a - mean) <= tolerance);
}

/**
 * Detects recurring charges/deposits from real transaction history.
 * Deliberately conservative (see thresholds above) -- a missed recurring
 * charge just means it shows up as a normal transaction; a *false positive*
 * would misrepresent someone's actual bill schedule, which is worse.
 */
export function detectRecurringSeries(transactions: Transaction[], accounts: Account[]): RecurringSeries[] {
  const accountIds = new Set(accounts.map(a => a.id));
  const groups = new Map<string, Group>();

  for (const t of transactions) {
    if (t.isTransfer) continue;
    if (!accountIds.has(t.accountId)) continue; // stale reference to a removed/unlinked account
    const merchantKey = normalizeMerchant(t.merchantName);
    const groupKey = `${t.accountId}::${merchantKey}`;
    const existing = groups.get(groupKey);
    if (existing) existing.transactions.push(t);
    else groups.set(groupKey, { accountId: t.accountId, merchantKey, transactions: [t] });
  }

  const results: RecurringSeries[] = [];

  for (const [groupKey, group] of groups) {
    if (group.transactions.length < MIN_OCCURRENCES) continue;

    const sorted = [...group.transactions].sort((a, b) => (a.date < b.date ? -1 : 1));
    const amounts = sorted.map(t => t.amount);
    if (!amountsAreConsistent(amounts)) continue;

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) gaps.push(daysBetween(sorted[i - 1].date, sorted[i].date));

    const cadence = classifyCadence(gaps);
    if (!cadence) continue;

    const last = sorted[sorted.length - 1];
    const medianGap = Math.round(median(gaps));
    const nextExpectedDate = new Date(last.date + 'T00:00:00');
    nextExpectedDate.setDate(nextExpectedDate.getDate() + medianGap);

    const averageAmount = Math.round((amounts.reduce((s, a) => s + a, 0) / amounts.length) * 100) / 100;

    results.push({
      id: `recurring::${groupKey}`,
      merchantName: mode(sorted.map(t => t.merchantName)),
      categoryId: mode(sorted.map(t => t.categoryId)),
      cadence,
      averageAmount,
      nextExpectedDate: nextExpectedDate.toISOString().slice(0, 10),
      accountId: group.accountId,
      occurrenceCount: sorted.length,
      lastSeenDate: last.date,
    });
  }

  return results.sort((a, b) => (a.nextExpectedDate < b.nextExpectedDate ? -1 : 1));
}
