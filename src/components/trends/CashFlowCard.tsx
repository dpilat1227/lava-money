import React from 'react';
import { View } from 'react-native';

import { NetFlowChart } from '@/components/charts/NetFlowChart';
import { Card, Text } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useMonthlyIncomeVsExpense } from '@/hooks/useFinanceSelectors';
import { formatCurrency } from '@/lib/utils/currency';

const MONTHS_SHOWN = 6;

function monthLabel(month: string, style: 'long' | 'short' = 'long'): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: style });
}

/**
 * Design-audit-round-3: full redesign, not a re-skin -- "Income vs.
 * Spending... I feel like that's not the best possible visualization...
 * do you have a better idea?" This used to show exactly one month's
 * income/spending as two numbers and a single static bar; below the same
 * header numbers, it now plots *net savings per month* as a trend (see
 * `NetFlowChart`'s doc comment for why that's the strongest answer from
 * the reference set) -- a single month answers "did this month go well,"
 * a trend answers "is saving actually a pattern here." Renamed "Cash
 * flow" to match what it now shows; "Income vs. spending" described two
 * numbers, not a multi-month trend.
 *
 * Design-audit-round-4: that redesign was still eight separate text
 * elements before the chart even started ("so many rows of text... my
 * brain doesn't even process that," direct quote) -- title, period,
 * Income label, Income value, Spending label, Spending value, the saved
 * sentence, and an eyebrow. Ember tenet 1 (docs/EMBER_DESIGN_SYSTEM.md,
 * "show the real number, organized"): the fix is re-ranking, not
 * deleting. One hero number now carries the answer to "did this month go
 * well" at the same scale every other hero number in this app uses;
 * Income/Spending demote to a single supporting line instead of two
 * equal-weight stat tiles; the chart's eyebrow is gone since the hero
 * number and card title already establish what it's plotting.
 */
export function CashFlowCard() {
  // +1 so the trailing entry is the current, still-in-progress month --
  // dropped below, same "don't plot an in-progress bar next to complete
  // ones" rule as every other trend chart in this app (see
  // useSpendByPeriod's completeOnly doc). `useMonthlyIncomeVsExpense` has
  // no completeOnly option of its own; slicing here is simpler than
  // adding one for a single caller.
  const flow = useMonthlyIncomeVsExpense(MONTHS_SHOWN + 1);
  const completeMonths = flow.slice(0, -1);
  const last = completeMonths[completeMonths.length - 1];

  if (!last || (last.income === 0 && last.expense === 0)) return null;

  const net = last.income - last.expense;
  const savedPct = last.income > 0 ? Math.round((net / last.income) * 100) : 0;

  const periods = completeMonths.map(f => ({ key: f.month, label: monthLabel(f.month, 'short'), value: f.income - f.expense }));

  return (
    <Card level="resting">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="subtitle" color={Colors.text2}>
          Cash flow
        </Text>
        <Text variant="caption" color={Colors.text4}>
          {monthLabel(last.month)}
        </Text>
      </View>

      {/* Hero: same job as every other "did this period go well" number in
          the app (BudgetHero, NetWorthHero) -- one answer, at hero scale,
          not buried under two equal-weight stat tiles. */}
      <Text
        variant="display"
        weight="bold"
        color={Colors.text1}
        style={{ marginTop: Spacing.sm, fontSize: 32, letterSpacing: -0.5, fontVariant: ['tabular-nums'] }}
      >
        {net >= 0 ? 'Saved ' : 'Spent '}
        <Text variant="display" weight="bold" color={net >= 0 ? Colors.green : Colors.red} style={{ fontSize: 32 }}>
          {formatCurrency(Math.abs(net), { compact: true })}
        </Text>
      </Text>
      <Text variant="caption" color={Colors.text3} style={{ marginTop: 4 }}>
        {net >= 0 ? `${savedPct}% of income this month` : 'more than you earned this month'}
      </Text>

      {/* Demoted from two equal-weight stat tiles to one supporting line --
          still states both real numbers, just no longer competing with
          the hero above for the same visual weight. */}
      <Text variant="caption" color={Colors.text4} style={{ marginTop: Spacing.md }}>
        Income {formatCurrency(last.income, { compact: true })} · Spending {formatCurrency(last.expense, { compact: true })}
      </Text>

      {periods.length > 1 && (
        <View style={{ marginTop: Spacing.lg }}>
          <NetFlowChart periods={periods} height={90} />
        </View>
      )}
    </Card>
  );
}
