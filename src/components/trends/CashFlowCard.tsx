import React from 'react';
import { View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useMonthlyIncomeVsExpense } from '@/hooks/useFinanceSelectors';
import { formatCurrency } from '@/lib/utils/currency';

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long' });
}

/**
 * Design-audit pass: the "Over time" tab used to end right after the chart
 * + a two-line Recurring teaser, leaving a few hundred px of plain black
 * before the tab bar on most phone heights -- not a crash, just an
 * unfinished-looking page compared to how much Copilot's trends screen
 * packs in. "Income vs. spending" is the other half of the story a pure
 * spend-over-time chart can't tell (you can't know if $6.5k of spending is
 * fine or alarming without knowing what came in), and every number it needs
 * already exists via `useMonthlyIncomeVsExpense`. Deliberately last
 * *complete* month, matching every other "last month" card on this app
 * (BudgetBreakdownCard, SpendingHeroCard's completeOnly periods) rather
 * than the in-progress current month, which would read as artificially
 * "saving a lot" for the first three weeks of every month just because
 * most bills haven't hit yet.
 */
export function CashFlowCard() {
  const flow = useMonthlyIncomeVsExpense(2);
  const last = flow[0];

  if (!last || (last.income === 0 && last.expense === 0)) return null;

  const net = last.income - last.expense;
  const savedPct = last.income > 0 ? Math.round((net / last.income) * 100) : 0;
  const spendRatio = last.income > 0 ? last.expense / last.income : 1;
  const barFillPct = Math.min(1, Math.max(0, spendRatio));

  return (
    <Card level="flat">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="subtitle" color={Colors.text2}>
          Income vs. spending
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

      {/* Filled portion = spend/income ratio, same "how much of the track
          is used up" language as the budget progress bars elsewhere --
          short green bar reads as healthy at a glance, a full red one as
          overspent, with no need to parse two numbers to know which. */}
      <View style={{ height: 6, borderRadius: 3, backgroundColor: Colors.surface2, marginTop: Spacing.lg, overflow: 'hidden' }}>
        <View
          style={{
            height: 6,
            borderRadius: 3,
            width: `${barFillPct * 100}%`,
            backgroundColor: net >= 0 ? Colors.green : Colors.red,
          }}
        />
      </View>

      <Text variant="caption" color={net >= 0 ? Colors.green : Colors.red} style={{ marginTop: Spacing.sm }}>
        {net >= 0
          ? `Saved ${formatCurrency(net, { compact: true })} — ${savedPct}% of income`
          : `Spent ${formatCurrency(Math.abs(net), { compact: true })} more than you earned`}
      </Text>
    </Card>
  );
}
