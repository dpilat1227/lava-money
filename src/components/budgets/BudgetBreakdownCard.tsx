import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryRankedList } from '@/components/insights/CategoryRankedList';
import { SampleTag, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useCategorySpendTotals, useSpendByPeriod } from '@/hooks/useFinanceSelectors';
import { findCategory } from '@/lib/mock/categories';
import { SAMPLE_CATEGORY_TOTALS } from '@/lib/mock/sampleChartData';
import { useFinance } from '@/lib/store/FinanceContext';
import type { Category } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/currency';

const RANGE_OPTIONS = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
] as const;

/**
 * Every category with spend in the selected window, budgeted or not -- the
 * list above only ever shows categories someone bothered to set a limit
 * for; this is the fuller picture next to it. Also this screen's home for
 * "what did I spend on" ranking now (IA restructure, design-audit-round-4):
 * absorbed the month-range picker and the Robinhood-style segmented
 * proportion bar from Trends' retired "By category" tab -- that tab was a
 * near-duplicate of this exact card one tab away, which was the actual
 * root of "why is Spend by Category in Trends, and why is Budgets
 * different." One card, one place, both features kept.
 *
 * The 1-month default still defaults to `completeOnly` (last *full* month,
 * not two days of a new one -- see below) for the exact reason the old
 * doc comment gave: a "spending by category" card with one $17 row on the
 * 2nd of the month looked broken, not "early." 3M/6M windows are trailing
 * full months either way, so that distinction stops mattering past 1M.
 */
export function BudgetBreakdownCard() {
  const router = useRouter();
  const { categories } = useFinance();
  const [months, setMonths] = useState<1 | 3 | 6>(1);

  // Always `completeOnly` regardless of window size -- an in-progress
  // current month skews a *ranking* (not just a single total) more than
  // it would a single hero number, so every window here stays trailing
  // full months only, same as the tab this absorbed always did.
  const rawTotals = useCategorySpendTotals(months, true);
  const totalsIsSample = rawTotals.length === 0;
  const categoryTotals = totalsIsSample ? SAMPLE_CATEGORY_TOTALS : rawTotals;
  const grandTotal = categoryTotals.reduce((s, c) => s + c.total, 0);
  // Only for the 1M label -- matches the real completed month's name
  // instead of a generic "Last month" once there's real (non-sample) data.
  const [oneMonthPeriod] = useSpendByPeriod('month', 1, { completeOnly: true });

  if (grandTotal === 0 && !totalsIsSample) return null;

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
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

      <View style={{ marginTop: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="title" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>
          {formatCurrency(grandTotal, { compact: true })}
        </Text>
        {totalsIsSample ? (
          <SampleTag />
        ) : (
          <Text variant="caption" color={Colors.text4}>
            {months === 1 ? `Last month${oneMonthPeriod ? ` (${oneMonthPeriod.label})` : ''}, budgeted or not` : `Last ${months} months, budgeted or not`}
          </Text>
        )}
      </View>

      {/* Robinhood-inspired segmented proportion bar -- categories are
          mutually-exclusive parts of one whole, the exact shape this
          answers well. Doesn't replace the ranked list below (that still
          states the actual numbers this bar can't), just gives an
          at-a-glance proportion read before the itemized detail. Segments
          under ~1.5% of the total are skipped rather than rendered as a
          sliver too thin to carry its own color meaningfully. */}
      <View style={{ marginTop: Spacing.lg }}>
        <CategorySegmentedBar items={categoryTotals} categories={categories} total={grandTotal} />
      </View>

      {/* No limit here on purpose -- "every category with spend" is the
          entire point of this card, and there's nowhere else on Budgets a
          cut-off category would resurface. Naturally bounded anyway: only
          ever a couple dozen categories at most. Rows now navigate to the
          category detail screen -- this used to render a plain, non-
          interactive list despite every other ranked-category surface in
          the app being tappable. */}
      <View style={{ marginTop: Spacing.xl }}>
        <CategoryRankedList
          items={categoryTotals}
          categories={categories}
          periodTotal={grandTotal}
          onSelectCategory={categoryId => router.push(`/category/${categoryId}`)}
        />
      </View>
    </View>
  );
}

function CategorySegmentedBar({ items, categories, total }: { items: { categoryId: string; total: number }[]; categories: Category[]; total: number }) {
  if (total <= 0) return null;
  return (
    <View style={styles.segmentedBarTrack}>
      {items.map(c => {
        const share = c.total / total;
        if (share < 0.015) return null;
        const category = findCategory(categories, c.categoryId);
        return <View key={c.categoryId} style={{ width: `${share * 100}%`, height: '100%', backgroundColor: category.color }} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rangePicker: { flexDirection: 'row', backgroundColor: Colors.surface2, borderRadius: Radius.pill, padding: 3 },
  rangeChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: Radius.pill },
  rangeChipActive: { backgroundColor: Colors.orangeCta },
  segmentedBarTrack: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: Colors.surface2 },
});
