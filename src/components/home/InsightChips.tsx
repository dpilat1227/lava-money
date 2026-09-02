import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';

import { Card, CategoryGlyph, CategoryIcon, Icon, Text, type IconName } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useCategorySpendTotals, useMonthlyIncomeVsExpense, useRecurringInsights } from '@/hooks/useFinanceSelectors';
import { findCategory } from '@/lib/mock/categories';
import { useFinance } from '@/lib/store/FinanceContext';
import { formatCurrency } from '@/lib/utils/currency';

interface Chip {
  icon: React.ReactNode;
  value: string;
  label: string;
  tint: string;
  onPress: () => void;
}

const CHIP_WIDTH = 148;

/**
 * A row of small, glanceable facts pulled from data the app was already
 * computing elsewhere (recurring detection, category totals) but never
 * surfaced on Home. The point isn't new math -- it's turning "you have a
 * Trends tab if you go dig" into "here's one thing worth knowing, right
 * now," which is the difference between a dashboard and a spreadsheet with
 * nicer fonts.
 *
 * The audit flagged this row collapsing awkwardly to one lonely
 * fixed-width card when data is thin (new account, no subscriptions yet).
 * Below 3 chips there's no need to scroll, so those render as equal-width
 * flex siblings that fill the row instead of a horizontal ScrollView with
 * dead space on the right.
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

  const chips: Chip[] = [];

  if (recurring.subscriptionsMonthlyTotal > 0) {
    const count = recurring.items.filter(i => i.series.categoryId === 'subscriptions').length;
    chips.push({
      icon: <CategoryGlyph id="subscriptions" size={15} color={Colors.purple} />,
      value: formatCurrency(recurring.subscriptionsMonthlyTotal, { compact: true }) + '/mo',
      label: `${count} subscription${count === 1 ? '' : 's'} detected`,
      tint: Colors.purple,
      onPress: () => router.push('/trends'),
    });
  }

  if (topCategory) {
    const cat = findCategory(categories, topCategory.categoryId);
    chips.push({
      icon: <CategoryIcon id={cat.id} emoji={cat.emoji} color={cat.color} size={20} />,
      value: formatCurrency(topCategory.total, { compact: true }),
      label: `Top category: ${cat.name}`,
      tint: cat.color,
      onPress: () => router.push('/trends'),
    });
  }

  const paceIcon: IconName = paceDelta > 0 ? 'arrowUpRight' : 'arrowDownRight';
  chips.push({
    icon: <Icon name={paceIcon} size={14} color={paceDelta > 0 ? Colors.amber : Colors.green} />,
    value: formatCurrency(currentExpense, { compact: true }),
    label: `Spent so far, vs ${formatCurrency(avgExpense, { compact: true })} avg/mo`,
    tint: paceDelta > 0 ? Colors.amber : Colors.green,
    onPress: () => router.push('/trends'),
  });

  if (recurring.overdueCount > 0) {
    chips.push({
      icon: <Icon name="warning" size={14} color={Colors.red} />,
      value: String(recurring.overdueCount),
      label: `recurring charge${recurring.overdueCount === 1 ? '' : 's'} may have lapsed`,
      tint: Colors.red,
      onPress: () => router.push('/trends'),
    });
  }

  if (chips.length === 0) return null;

  if (chips.length <= 3) {
    return (
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        {chips.map((chip, i) => (
          <InsightChipCard key={i} chip={chip} style={{ flex: 1 }} />
        ))}
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, paddingRight: Spacing.lg }}>
      {chips.map((chip, i) => (
        <InsightChipCard key={i} chip={chip} style={{ width: CHIP_WIDTH }} />
      ))}
    </ScrollView>
  );
}

function InsightChipCard({ chip, style }: { chip: Chip; style: StyleProp<ViewStyle> }) {
  return (
    <Card onPress={chip.onPress} style={[{ padding: Spacing.md }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {chip.icon}
        <Text variant="subtitle" weight="bold" color={chip.tint} numberOfLines={1}>
          {chip.value}
        </Text>
      </View>
      <Text variant="micro" color={Colors.text4} style={{ marginTop: 4 }} numberOfLines={2}>
        {chip.label}
      </Text>
    </Card>
  );
}
