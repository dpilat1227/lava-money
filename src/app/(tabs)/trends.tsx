import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { FlowBarChart } from '@/components/charts/FlowBarChart';
import { RecurringInsightsCard } from '@/components/insights/RecurringInsightsCard';
import { Card, ScreenHeader, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useCategorySpendTotals, useMonthlyIncomeVsExpense, useRecurringInsights } from '@/hooks/useFinanceSelectors';
import { findCategory } from '@/lib/mock/categories';
import { useFinance } from '@/lib/store/FinanceContext';
import { formatCurrency } from '@/lib/utils/currency';

const RANGE_OPTIONS = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
] as const;

export default function TrendsScreen() {
  const { categories } = useFinance();
  const [months, setMonths] = useState<1 | 3 | 6>(1);
  const flow = useMonthlyIncomeVsExpense(6);
  const categoryTotals = useCategorySpendTotals(months);
  const recurringInsights = useRecurringInsights();

  const avgIncome = flow.reduce((s, f) => s + f.income, 0) / flow.length;
  const avgExpense = flow.reduce((s, f) => s + f.expense, 0) / flow.length;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: Spacing.xxxl }}>
      <ScreenHeader title="Trends" />

      <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.lg }}>
        <RecurringInsightsCard insights={recurringInsights} />

        <Card>
          <Text variant="subtitle" color={Colors.text2} style={{ marginBottom: Spacing.md }}>
            Income vs. spending
          </Text>
          <FlowBarChart data={flow} />
          <View style={styles.avgRow}>
            <Text variant="micro" color={Colors.text4}>
              Avg income: {formatCurrency(avgIncome, { compact: true })}
            </Text>
            <Text variant="micro" color={Colors.text4}>
              Avg spend: {formatCurrency(avgExpense, { compact: true })}
            </Text>
          </View>
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
            <Text variant="subtitle" color={Colors.text2}>
              Spending by category
            </Text>
            <View style={styles.rangePicker}>
              {RANGE_OPTIONS.map(opt => (
                <Pressable
                  key={opt.label}
                  onPress={() => setMonths(opt.months)}
                  style={[styles.rangeChip, months === opt.months && styles.rangeChipActive]}
                >
                  <Text variant="micro" color={months === opt.months ? Colors.text1 : Colors.text4} weight="semibold">
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <CategoryDonut data={categoryTotals} centerLabel={months === 1 ? 'This month' : `${months} months`} categories={categories} />
        </Card>

        {categoryTotals.length > 0 && (
          <Card style={{ gap: Spacing.sm }}>
            {categoryTotals.map((c, i) => (
              <View
                key={c.categoryId}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 6,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: Colors.border1,
                }}
              >
                <Text variant="body">
                  {findCategory(categories, c.categoryId).emoji} {findCategory(categories, c.categoryId).name}
                </Text>
                <Text variant="body" weight="semibold">
                  {formatCurrency(c.total)}
                </Text>
              </View>
            ))}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  avgRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
  rangePicker: { flexDirection: 'row', backgroundColor: Colors.surface2, borderRadius: Radius.pill, padding: 2 },
  rangeChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  rangeChipActive: { backgroundColor: Colors.surface4 },
});
