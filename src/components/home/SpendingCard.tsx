import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { SpendCeilingChart } from '@/components/charts/SpendCeilingChart';
import { Card, Icon, Text } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useMonthlyIncomeVsExpense, useMonthToDateComparison, useSpendByPeriod } from '@/hooks/useFinanceSelectors';
import { formatCurrency } from '@/lib/utils/currency';

const WEEKS_SHOWN = 6;

/**
 * Replaces `InsightChips`' three equal-weight boxes on Home with one
 * focused card: this month's total spend, a plain-language comparison to
 * last month, and the same Apple-Card-style category bar chart Budgets'
 * own spending-over-time card uses. Tapping anywhere routes to Budgets for
 * the full breakdown (design-audit-round-4: was Trends, since retired) --
 * progressive disclosure instead of a second dashboard competing with the
 * net worth hero above it.
 */
export function SpendingCard() {
  const router = useRouter();
  const flow = useMonthlyIncomeVsExpense(2);
  // completeOnly -- the headline number above already tells the honest
  // "$0 so far, it's early" story via month-to-date framing; the chart's
  // job is showing the *pattern*, which a barely-started current week (a
  // sliver bar next to six full ones) undercuts rather than supports.
  const weeks = useSpendByPeriod('week', WEEKS_SHOWN, { completeOnly: true });
  const monthToDate = useMonthToDateComparison();

  // A trailing average of these same weeks, not a summed budget -- this
  // chart plots *total* weekly spend (every category), and this app's
  // budgets are opt-in per-category, not a household total. Comparing
  // total spend against only the categories someone happened to budget
  // (excluding rent, travel, everything else) reads as "over budget" most
  // weeks regardless of whether the budgeted categories are on track. "Is
  // this week higher or lower than usual" is the honest question a
  // total-spend chart can actually answer.
  const weeksWithData = weeks.filter(w => w.total > 0);
  const weeklyAverage = weeksWithData.length > 0 ? weeksWithData.reduce((s, w) => s + w.total, 0) / weeksWithData.length : 0;

  const thisMonth = flow[flow.length - 1]?.expense ?? 0;
  // The comparison sentence uses month-*to-date* spend on both sides (not
  // last month's full total) -- otherwise this reads as "$X less than last
  // month!" for the first ~29 days of every month just because the month
  // hasn't finished yet, not because spending actually slowed down.
  const delta = monthToDate.current - monthToDate.previous;
  const comparison =
    monthToDate.previous > 0
      ? `${formatCurrency(Math.abs(delta), { compact: true })} ${delta >= 0 ? 'more' : 'less'} than by this time last month`
      : 'First month tracking spend here';

  return (
    // Design-audit-round-3: full redesign, not a tweak -- "the flat grey
    // component design is gross," "the bar chart takes up like 1/4 of the
    // component," "the comparison text is so tiny and wordy." Chart height
    // roughly doubled (84 -> 132, closer to Trends' own default) so it's
    // an actual second focus of the card instead of a strip underneath the
    // real content; the comparison line promoted from `micro` to `caption`
    // with real spacing instead of sitting jammed under the headline.
    // `level="resting"` now inherits the lighter `surfaceSubtle` fill from
    // the theme-foundation pass -- no code change needed here for that.
    <Card level="resting" onPress={() => router.push('/budgets')} style={{ gap: Spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color={Colors.text3}>
            {/* "So far," matching Recurring's own "Paid so far this month" --
                without it, "$0.00" on day 2 of a new month reads as broken
                rather than as an honest month-to-date number. */}
            Spent so far this month
          </Text>
          <Text variant="title" weight="bold" style={{ marginTop: 2, fontVariant: ['tabular-nums'] }}>
            {formatCurrency(thisMonth, { compact: true })}
          </Text>
          <Text variant="caption" weight="medium" color={delta > 0 ? Colors.amber : Colors.green} style={{ marginTop: 6 }}>
            {comparison}
          </Text>
        </View>
        <View style={{ marginTop: 4 }}>
          <Icon name="chevronRight" size={16} color={Colors.text4} />
        </View>
      </View>

      <View>
        {/* Design-audit pass: the headline above is deliberately month-to-date
            (reads as "$0.00" for days into a fresh month), while this chart
            plots the last 6 *complete* weeks regardless -- e.g. $600+ bars
            sitting directly under a "$0.00" headline with nothing explaining
            why. The date labels under each bar were the only existing hint
            they're not the same question; this caption states it outright
            instead of counting on someone to notice on a quick glance. */}
        <Text variant="micro" weight="semibold" color={Colors.text4} style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm }}>
          Last {WEEKS_SHOWN} weeks
        </Text>

        <SpendCeilingChart
          periods={weeks}
          granularity="week"
          monthlyCeiling={weeklyAverage}
          ceilingIsPrescaled
          ceilingLabel="Avg."
          height={132}
        />
      </View>
    </Card>
  );
}
