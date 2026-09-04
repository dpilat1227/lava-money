import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SpendCeilingChart } from '@/components/charts/SpendCeilingChart';
import { Card, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useSpendByPeriod, type SpendGranularity } from '@/hooks/useFinanceSelectors';
import { findCategory } from '@/lib/mock/categories';
import { buildSampleSpendByPeriod } from '@/lib/mock/sampleChartData';
import { useFinance } from '@/lib/store/FinanceContext';
import { formatCurrency } from '@/lib/utils/currency';

const GRANULARITY_OPTIONS: { label: string; value: SpendGranularity }[] = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];

const PERIOD_COUNT: Record<SpendGranularity, number> = { week: 8, month: 6, year: 3 };
const GRANULARITY_NOUN: Record<SpendGranularity, string> = { week: 'week', month: 'month', year: 'year' };

/**
 * Design-audit-round-4 / IA restructure: this used to be a two-tab card
 * ("Over time" bar chart + a "By category" ranked list+proportion bar),
 * living on a since-retired "Trends" tab. The category-ranking tab was a
 * near-duplicate of what `BudgetBreakdownCard` already showed one tab
 * away on Budgets (same underlying data, different framing) -- exactly
 * the "why is Spend by Category in Trends, and why does Budgets have
 * something similar" confusion flagged in review. That tab's genuinely
 * useful pieces (the multi-month picker, the segmented proportion bar)
 * moved onto `BudgetBreakdownCard` itself instead of being deleted; this
 * component is now single-purpose ("when did I spend," a trend, which is
 * what belongs on a card living inside Budgets as supporting context for
 * "how am I doing this month"). Still shared by mobile Budgets and
 * `DesktopBudgets` so both platforms move together.
 */
export function SpendingHeroCard({ chartHeight = 130 }: { chartHeight?: number }) {
  const { categories } = useFinance();
  const [granularity, setGranularity] = useState<SpendGranularity>('month');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // `completeOnly` for week/month -- a still-forming period as the most
  // recent (most prominent, right-most) bar reads as "spending collapsed"
  // rather than "the period just started," and skews the "more/less than
  // last [period]" comparison below against a full previous period. Year
  // is left alone: at that resolution a few incomplete days barely move the
  // total, and "this year so far" is the more useful framing to keep live.
  const completeOnly = granularity !== 'year';
  const rawPeriods = useSpendByPeriod(granularity, PERIOD_COUNT[granularity], { completeOnly });
  const periodsIsSample = rawPeriods.every(p => p.total === 0);
  const displayPeriods = periodsIsSample ? buildSampleSpendByPeriod(granularity, PERIOD_COUNT[granularity]) : rawPeriods;

  // A trailing average of what's plotted, not a summed budget -- this tab
  // plots *total* spend (every category) at whatever granularity is
  // selected, and this app's budgets are opt-in per-category, not a
  // household total. Comparing total spend against only the categories
  // someone happened to budget (excluding rent, travel, everything else)
  // reads as "over budget" almost every period regardless of whether the
  // budgeted categories are on track. "Higher or lower than usual" is the
  // honest question a total-spend chart can actually answer, and it's
  // already correctly scaled for the current granularity since it's
  // computed from the same periods being plotted (see `ceilingIsPrescaled`).
  const periodsWithData = rawPeriods.filter(p => p.total > 0);
  const periodAverage = periodsWithData.length > 0 ? periodsWithData.reduce((s, p) => s + p.total, 0) / periodsWithData.length : 0;

  const latest = displayPeriods[displayPeriods.length - 1];
  const previous = displayPeriods[displayPeriods.length - 2];
  const delta = latest && previous ? latest.total - previous.total : 0;
  const comparison =
    latest && previous && previous.total > 0
      ? `${formatCurrency(Math.abs(delta), { compact: true })} ${delta >= 0 ? 'more' : 'less'} than last ${GRANULARITY_NOUN[granularity]}`
      : null;

  const selectedPeriod = displayPeriods.find(p => p.key === selectedKey) ?? null;

  const handleGranularityChange = (value: SpendGranularity) => {
    if (value === granularity) return;
    Haptics.selectionAsync().catch(() => {});
    setGranularity(value);
    setSelectedKey(null);
  };

  return (
    <Card level="raised">
      <View style={styles.pickerRow}>
        <Text variant="subtitle" color={Colors.text2}>
          Spending over time
        </Text>
        <View style={styles.rangePicker}>
          {GRANULARITY_OPTIONS.map(opt => (
            <Pressable
              key={opt.value}
              onPress={() => handleGranularityChange(opt.value)}
              style={[styles.rangeChip, granularity === opt.value && styles.rangeChipActive]}
            >
              <Text variant="micro" color={granularity === opt.value ? Colors.text1 : Colors.text4} weight="semibold">
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {comparison && (
        <Text variant="caption" color={delta > 0 ? Colors.amber : Colors.green} style={{ marginTop: Spacing.xs, marginBottom: Spacing.lg }}>
          {comparison}
        </Text>
      )}

      <SpendCeilingChart
        periods={rawPeriods}
        granularity={granularity}
        monthlyCeiling={periodAverage}
        ceilingIsPrescaled
        ceilingLabel="Avg."
        selectedKey={selectedKey}
        onSelectPeriod={p => setSelectedKey(prev => (prev === p.key ? null : p.key))}
        sample={periodsIsSample}
        height={chartHeight}
      />

      {selectedPeriod && selectedPeriod.total > 0 && (
        <View style={styles.drillIn}>
          <Text variant="micro" color={Colors.text3} style={styles.drillInLabel}>
            {selectedPeriod.label} breakdown
          </Text>
          {selectedPeriod.byCategory.slice(0, 6).map(c => {
            const category = findCategory(categories, c.categoryId);
            return (
              <View key={c.categoryId} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: category.color }} />
                <Text variant="caption" weight="medium" color={category.color} style={{ flex: 1 }} numberOfLines={1}>
                  {category.name}
                </Text>
                {/* Ember rule (docs/EMBER_DESIGN_SYSTEM.md, "numbers are
                    typography too"): full precision, no compact
                    abbreviation, for every row in this short list -- see
                    that doc for why mixing the two read as a bug. */}
                <Text variant="caption" weight="semibold" style={{ fontVariant: ['tabular-nums'] }}>
                  {formatCurrency(c.total)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  pickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  // Design-audit-round-3: padding bumped (10/4 -> 13/7) and the active
  // state switched from a translucent `orangeSoft` fill to a solid
  // `orangeCta` one with light text -- "the toggles don't look modern"
  // was partly the theme-foundation orange-wash card making this track
  // float oddly on a tinted background, but the chips themselves were
  // also genuinely small/low-contrast at rest.
  rangePicker: { flexDirection: 'row', backgroundColor: Colors.surface2, borderRadius: Radius.pill, padding: 3 },
  rangeChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: Radius.pill },
  rangeChipActive: { backgroundColor: Colors.orangeCta },
  drillIn: { marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border1, gap: 2 },
  drillInLabel: { textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.xs },
});
