import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SpendCeilingChart } from '@/components/charts/SpendCeilingChart';
import { CategoryRankedList } from '@/components/insights/CategoryRankedList';
import { Card, SampleTag, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useCategorySpendTotals, useSpendByPeriod, type SpendGranularity } from '@/hooks/useFinanceSelectors';
import { findCategory } from '@/lib/mock/categories';
import { buildSampleSpendByPeriod, SAMPLE_CATEGORY_TOTALS } from '@/lib/mock/sampleChartData';
import { useFinance } from '@/lib/store/FinanceContext';
import type { Category } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/currency';

const DONUT_RANGE_OPTIONS = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
] as const;

const GRANULARITY_OPTIONS: { label: string; value: SpendGranularity }[] = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];

const PERIOD_COUNT: Record<SpendGranularity, number> = { week: 8, month: 6, year: 3 };
const GRANULARITY_NOUN: Record<SpendGranularity, string> = { week: 'week', month: 'month', year: 'year' };

type Tab = 'time' | 'category';

/**
 * Trends' single hero -- folds what used to be two separate cards (a
 * "Spending over time" bar chart and a "Spending by category" donut, each
 * with its own header + picker, stacked one after another) into one card
 * switched by an internal tab. Per the redesign plan, the original "packed
 * in tight / busy" complaint was largely two charts competing for the same
 * screen rather than either chart being wrong on its own -- they answer
 * related-but-different questions ("when did I spend" vs. "what did I
 * spend on"), so they read better as two views of one thing. Shared by
 * mobile Trends and `DesktopTrends` so both platforms move together.
 */
export function SpendingHeroCard({ chartHeight = 130 }: { chartHeight?: number }) {
  const router = useRouter();
  const { categories } = useFinance();
  const [tab, setTab] = useState<Tab>('time');
  const [months, setMonths] = useState<1 | 3 | 6>(1);
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

  const rawCategoryTotals = useCategorySpendTotals(months, true);
  const categoryTotalsIsSample = rawCategoryTotals.length === 0;
  const categoryTotals = categoryTotalsIsSample ? SAMPLE_CATEGORY_TOTALS : rawCategoryTotals;
  const categoryGrandTotal = categoryTotals.reduce((s, c) => s + c.total, 0);

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
      <View style={styles.tabRow}>
        <TabButton label="Over time" active={tab === 'time'} onPress={() => setTab('time')} />
        <TabButton label="By category" active={tab === 'category'} onPress={() => setTab('category')} />
      </View>

      {tab === 'time' ? (
        <View style={{ marginTop: Spacing.lg }}>
          <View style={styles.pickerRow}>
            <Text variant="subtitle" color={Colors.text2}>
              Spending
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
                    {/* Design-audit-round-3 fix: `compact: true` only kicks
                        in above $1000 ("$1.6k"), leaving everything smaller
                        at full precision ("$792.37") in the same 6-row
                        list -- two formats side by side read as a bug.
                        This list is short enough that full precision
                        everywhere costs nothing and reads consistently. */}
                    <Text variant="caption" weight="semibold" style={{ fontVariant: ['tabular-nums'] }}>
                      {formatCurrency(c.total)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ) : (
        <View style={{ marginTop: Spacing.lg }}>
          <View style={styles.pickerRow}>
            <Text variant="subtitle" color={Colors.text2}>
              By category
            </Text>
            <View style={styles.rangePicker}>
              {DONUT_RANGE_OPTIONS.map(opt => (
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

          {/* Redesign-pass-2: donut replaced with the same ranked-list
              pattern Dashboard/Budgets use -- angle/area comparisons are
              measurably harder to read than length once there's more than
              a handful of categories, and a donut never states a number,
              only a shape. A list states the number, ranks it, and reuses
              a component instead of maintaining a second chart. */}
          <View style={{ marginTop: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text variant="title" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>
              {formatCurrency(categoryGrandTotal, { compact: true })}
            </Text>
            {categoryTotalsIsSample ? <SampleTag /> : (
              <Text variant="caption" color={Colors.text4}>
                {months === 1 ? 'Last month' : `Last ${months} months`}
              </Text>
            )}
          </View>
          {/* Design-audit-round-3: the Robinhood asset-allocation bar (a
              single chunky segmented strip, width-per-holding proportional
              to share of the whole) is the one visualization from that
              reference that actually fits something here -- categories are
              mutually-exclusive parts of one whole, the exact shape that
              bar answers well. Doesn't replace the ranked list below (that
              still states the actual numbers this bar can't), just gives
              an at-a-glance proportion read before the itemized detail. */}
          <View style={{ marginTop: Spacing.lg }}>
            <CategorySegmentedBar items={categoryTotals} categories={categories} total={categoryGrandTotal} />
          </View>

          {/* No limit here either -- this *is* the dedicated "every
              category" view (Dashboard's teaser links here), so capping it
              would truncate the one screen whose whole job is to not. */}
          <View style={{ marginTop: Spacing.xl }}>
            <CategoryRankedList
              items={categoryTotals}
              categories={categories}
              periodTotal={categoryGrandTotal}
              onSelectCategory={categoryId => router.push(`/category/${categoryId}`)}
            />
          </View>
        </View>
      )}
    </Card>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
      <Text variant="body" weight={active ? 'semibold' : 'medium'} color={active ? Colors.text1 : Colors.text4}>
        {label}
      </Text>
    </Pressable>
  );
}

/** The Robinhood-inspired segmented proportion bar -- see the doc comment
 * at its call site above for why this is the one visualization from that
 * reference that actually earns a place here. Segments under ~1.5% of the
 * total are skipped entirely rather than rendered as a sliver too thin to
 * carry its own color meaningfully -- the ranked list below already
 * accounts for every category exactly, this bar's job is just the
 * at-a-glance shape. */
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
  tabRow: { flexDirection: 'row', gap: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border1 },
  tabButton: { paddingBottom: Spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabButtonActive: { borderBottomColor: Colors.orange },
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
  segmentedBarTrack: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: Colors.surface2 },
});
