/**
 * The Impause/Rowan-adjacent v1.1 feature from `docs/STRATEGY.md`: surface
 * recurring charges proactively instead of making the user notice a pattern
 * themselves, without an agent, an LLM call, or any bank-action capability
 * this app has no business attempting yet (see that doc's read on Rocket
 * Money's "Rowan" launch for why that boundary is deliberate, not a
 * shortcut). Built entirely on `detectRecurringSeries()` output -- there's
 * no separate data source, just a different lens on the same detection.
 */
import type { RecurringCadence, RecurringSeries } from '@/lib/types';

export type RecurringStatus = 'active' | 'due_soon' | 'late' | 'overdue';

export interface RecurringInsightItem {
  series: RecurringSeries;
  /** Amount normalized to a monthly-equivalent rate, so a weekly $12 charge
   * and a monthly $52 charge can be summed/compared meaningfully. */
  monthlyEquivalent: number;
  status: RecurringStatus;
  daysUntilExpected: number; // negative if overdue
}

const CADENCE_TO_MONTHLY: Record<RecurringCadence, number> = {
  weekly: 4.345, // average weeks per month
  biweekly: 2.1725,
  monthly: 1,
  yearly: 1 / 12,
};

/** How many days past `nextExpectedDate` before a recurring charge is
 * flagged "may have lapsed" rather than just "running a little late" --
 * scaled to cadence, since a week of lateness means something different
 * for a weekly charge than a monthly one. */
const GRACE_DAYS: Record<RecurringCadence, number> = {
  weekly: 4,
  biweekly: 6,
  monthly: 8,
  yearly: 20,
};

const DUE_SOON_DAYS = 5;

function daysFromToday(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function statusFor(series: RecurringSeries, daysUntil: number): RecurringStatus {
  if (daysUntil < -GRACE_DAYS[series.cadence]) return 'overdue';
  // Design-audit pass: this used to fall straight through to 'due_soon' for
  // *any* daysUntil <= 5, including negative ones -- so a charge one day
  // past its expected date got the same forward-looking "due soon" badge as
  // one genuinely five days out, while the card's own caption (`relativeDue`
  // in RecurringGrid) correctly said "1d overdue" right next to it. Same
  // number, two contradictory tenses on one card. 'late' names the zone
  // between "hasn't happened yet, but will soon" and "likely lapsed."
  if (daysUntil < 0) return 'late';
  if (daysUntil <= DUE_SOON_DAYS) return 'due_soon';
  return 'active';
}

export interface RecurringInsights {
  items: RecurringInsightItem[];
  /** Monthly-equivalent total for everything categorized "Subscriptions"
   * specifically -- the number people actually mean when they ask "how
   * much am I spending on subscriptions." */
  subscriptionsMonthlyTotal: number;
  /** Monthly-equivalent total for every other recurring expense (rent,
   * utilities, gym, etc.) -- bills, not "things I could cancel on a whim." */
  billsMonthlyTotal: number;
  overdueCount: number;
}

export function buildRecurringInsights(recurringSeries: RecurringSeries[]): RecurringInsights {
  const items: RecurringInsightItem[] = recurringSeries
    .filter(s => s.averageAmount < 0) // spend only -- paychecks aren't "recurring charges" to flag
    .map(series => {
      const daysUntilExpected = daysFromToday(series.nextExpectedDate);
      return {
        series,
        monthlyEquivalent: Math.abs(series.averageAmount) * CADENCE_TO_MONTHLY[series.cadence],
        status: statusFor(series, daysUntilExpected),
        daysUntilExpected,
      };
    })
    .sort((a, b) => a.daysUntilExpected - b.daysUntilExpected);

  const subscriptionsMonthlyTotal = items
    .filter(i => i.series.categoryId === 'subscriptions')
    .reduce((s, i) => s + i.monthlyEquivalent, 0);
  const billsMonthlyTotal = items
    .filter(i => i.series.categoryId !== 'subscriptions')
    .reduce((s, i) => s + i.monthlyEquivalent, 0);
  const overdueCount = items.filter(i => i.status === 'overdue').length;

  return {
    items,
    subscriptionsMonthlyTotal: Math.round(subscriptionsMonthlyTotal * 100) / 100,
    billsMonthlyTotal: Math.round(billsMonthlyTotal * 100) / 100,
    overdueCount,
  };
}
