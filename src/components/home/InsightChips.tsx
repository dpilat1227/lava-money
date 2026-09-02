import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useCategorySpendTotals, useMonthlyIncomeVsExpense, useRecurringInsights } from '@/hooks/useFinanceSelectors';
import { findCategory } from '@/lib/mock/categories';
import { useFinance } from '@/lib/store/FinanceContext';
import { formatCurrency } from '@/lib/utils/currency';

/**
 * A row of small, glanceable facts pulled from data the app was already
 * computing elsewhere (recurring detection, category totals) but never
 * surfaced on Home. The point isn't new math -- it's turning "you have a
 * Trends tab if you go dig" into "here's one thing worth knowing, right
 * now," which is the difference between a dashboard and a spreadsheet with
 * nicer fonts.
 */
export function InsightChips() {
  const router = useRouter();
  const { categories } = useFinance();
  const recurring = useRecurringInsights();
  const topCategories = useCategorySpendTotals(1);
  const flow = useMonthlyIncomeVsExpense(6);

  const avgExpense = flow.reduce((s, f) => s + f.expense, 0) / flow.length;
  const currentExpense = flow[flow.length - 1]?.expense ?? 0;
  const paceDelta = currentExpense - avgExpense;
  const topCategory = topCategories[0];

  const chips: { emoji: string; value: string; label: string; tint: string; onPress: () => void }[] = [];

  if (recurring.subscriptionsMonthlyTotal > 0) {
    chips.push({
      emoji: '📺',
      value: formatCurrency(recurring.subscriptionsMonthlyTotal, { compact: true }) + '/mo',
      label: `${recurring.items.filter(i => i.series.categoryId === 'subscriptions').length} subscription${recurring.items.filter(i => i.series.categoryId === 'subscriptions').length === 1 ? '' : 's'} detected`,
      tint: Colors.purple,
      onPress: () => router.push('/trends'),
    });
  }

  if (topCategory) {
    const cat = findCategory(categories, topCategory.categoryId);
    chips.push({
      emoji: cat.emoji,
      value: formatCurrency(topCategory.total, { compact: true }),
      label: `Top category: ${cat.name}`,
      tint: cat.color,
      onPress: () => router.push('/trends'),
    });
  }

  chips.push({
    emoji: paceDelta > 0 ? '📈' : '📉',
    value: formatCurrency(currentExpense, { compact: true }),
    label: `Spent so far, vs ${formatCurrency(avgExpense, { compact: true })} avg/mo`,
    tint: paceDelta > 0 ? Colors.amber : Colors.green,
    onPress: () => router.push('/trends'),
  });

  if (recurring.overdueCount > 0) {
    chips.push({
      emoji: '⏳',
      value: String(recurring.overdueCount),
      label: `recurring charge${recurring.overdueCount === 1 ? '' : 's'} may have lapsed`,
      tint: Colors.red,
      onPress: () => router.push('/trends'),
    });
  }

  if (chips.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, paddingRight: Spacing.lg }}>
      {chips.map((chip, i) => (
        <Pressable
          key={i}
          onPress={chip.onPress}
          style={({ pressed }) => [
            {
              width: 148,
              padding: Spacing.md,
              borderRadius: Radius.lg,
              backgroundColor: Colors.surfaceCard,
              borderWidth: 1,
              borderColor: Colors.border1,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 15 }}>{chip.emoji}</Text>
            <Text variant="subtitle" weight="bold" color={chip.tint} numberOfLines={1}>
              {chip.value}
            </Text>
          </View>
          <Text variant="micro" color={Colors.text4} style={{ marginTop: 4 }} numberOfLines={2}>
            {chip.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
