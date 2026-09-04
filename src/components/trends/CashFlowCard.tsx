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

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg }}>
        <View style={{ flex: 1 }}>
          <Text variant="micro" color={Colors.text4}>
            Income
          </Text>
          <Text variant="title" weight="semibold" color={Colors.green} style={{ marginTop: 2 }}>
            {formatCurrency(last.income, { compact: true })}
          </Text>
        </View>
        <View style={{ width: 1, height: 28, backgroundColor: Colors.border1, marginHorizontal: Spacing.lg }} />
        <View style={{ flex: 1 }}>
          <Text variant="micro" color={Colors.text4}>
            Spending
          </Text>
          <Text variant="title" weight="semibold" color={Colors.text1} style={{ marginTop: 2 }}>
            {formatCurrency(last.expense, { compact: true })}
          </Text>
        </View>
      </View>

      <Text variant="caption" color={net >= 0 ? Colors.green : Colors.red} style={{ marginTop: Spacing.sm }}>
        {net >= 0
          ? `Saved ${formatCurrency(net, { compact: true })} — ${savedPct}% of income`
          : `Spent ${formatCurrency(Math.abs(net), { compact: true })} more than you earned`}
      </Text>

      {periods.length > 1 && (
        <View style={{ marginTop: Spacing.xl }}>
          <Text variant="micro" weight="semibold" color={Colors.text4} style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm }}>
            Net savings, last {periods.length} months
          </Text>
          <NetFlowChart periods={periods} height={90} />
        </View>
      )}
    </Card>
  );
}
