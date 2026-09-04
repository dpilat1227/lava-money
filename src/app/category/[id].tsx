import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EditBudgetModal } from '@/components/budgets/EditBudgetModal';
import { SpendCeilingChart } from '@/components/charts/SpendCeilingChart';
import { Amount, Atmosphere, CategoryIcon, EmptyState, Icon, Text } from '@/components/ui';
import { WebPageShell } from '@/components/web/DesktopShell';
import { Breakpoints, Colors, Spacing } from '@/constants/theme';
import { useBudgetProgress, useCategoryMonthlyHistory, useCategoryTransactions, useCurrentMonthSpendByCategory } from '@/hooks/useFinanceSelectors';
import { findCategory } from '@/lib/mock/categories';
import { useFinance } from '@/lib/store/FinanceContext';
import type { Transaction } from '@/lib/types';
import { SUGGESTED_DEFAULTS } from '@/lib/utils/budgetSetup';
import { formatCurrency } from '@/lib/utils/currency';

/**
 * New in the design-audit-round-3 pass: "I want users to be able to click
 * into categories" -- Copilot's own category page (monthly bar + budget
 * line, yearly total/average, that category's recurring items, a
 * transaction history) is the reference, reached today from `BudgetList`
 * (was a direct tap-to-edit-modal) and Trends' "By category" list. Scoped
 * v1 per the plan: skips Copilot's editable inline-sentence rule editor
 * and dot-timeline visualization -- those are recurring-*item* features
 * anyway (see the plan's Recurring section), not this category-level
 * screen's job.
 *
 * Deliberately doesn't repeat this category's own icon/badge on every
 * transaction row below (`TransactionRow` does, which is fine when a list
 * mixes categories) -- every row on this screen is already the same
 * category by definition, so a repeated icon is pure noise. This is the
 * fix for a real weakness in Copilot's own category pages: their
 * transaction rows repeat the exact same category icon 20+ times in a row
 * with zero new information each time.
 */
export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= Breakpoints.wide;
  const { categories, budgets, recurringSeries, setBudget } = useFinance();
  const [editing, setEditing] = useState(false);

  const category = findCategory(categories, id ?? '');
  const budget = budgets.find(b => b.categoryId === id);
  const spendByCategory = useCurrentMonthSpendByCategory();
  const monthlySpend = spendByCategory.get(id ?? '') ?? 0;
  // Design-audit-round-4: fetches 25 months (was 13) so the year-picker
  // below has up to two full prior years to switch between once there's
  // real history to show -- today's mock data only backfills ~6-7 months,
  // so most of that range is legitimately empty, which is fine; this is
  // sized for where the data grows *to*, not just what a fresh demo has
  // right now. The bar chart itself still only plots the trailing 13 (see
  // `chartHistory` below) -- its job is "recent trend," not "this
  // specific calendar year," and 25 bars of month-only labels (no year
  // suffix) would start colliding ("Sep" appearing three times) if it
  // plotted the whole fetched range.
  const fullHistory = useCategoryMonthlyHistory(id ?? '', 25);
  const chartHistory = useMemo(() => fullHistory.slice(-13), [fullHistory]);
  const categoryTransactions = useCategoryTransactions(id ?? '');
  // Budgets progress isn't otherwise needed here, but EditBudgetModal wants
  // the exact same "currentSpent" the Budgets screen would've passed it --
  // one source of truth for that number instead of a second computation
  // that could drift from it.
  const progress = useBudgetProgress();

  const hasBudget = !!budget && budget.monthlyLimit > 0;
  const over = hasBudget && monthlySpend > budget.monthlyLimit;
  const overUnderAmount = hasBudget ? Math.abs(monthlySpend - budget.monthlyLimit) : 0;

  const now = new Date();
  const currentYear = now.getFullYear();
  // Design-audit-round-4: "a toggle option to select different years
  // would be nice" -- years present in whatever history actually got
  // fetched, always including the current year even on a brand-new
  // install with zero months of real data yet (so the picker/label never
  // shows a blank year with nothing to decrement to).
  // Not useMemo -- React Compiler flagged the manual memoization here as
  // unpreservable (currentYear derives from a fresh `Date` each render,
  // which its analysis treats conservatively) and skipped optimizing the
  // whole component over it. Cheap enough (a couple dozen items, at
  // most) that computing it plainly every render costs nothing anyway.
  const years = new Set(fullHistory.map(m => Number(m.key.slice(0, 4))));
  years.add(currentYear);
  const yearsAvailable = Array.from(years).sort((a, b) => a - b);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const yearMonths = useMemo(() => fullHistory.filter(m => Number(m.key.slice(0, 4)) === selectedYear), [fullHistory, selectedYear]);
  const yearTotal = yearMonths.reduce((s, m) => s + m.total, 0);
  // A fully-past year averages over all 12 months; the current year only
  // over however many have actually elapsed -- averaging January-through-
  // now spend by 12 would understate a still-in-progress year.
  const monthsElapsedThisYear = selectedYear === currentYear ? now.getMonth() + 1 : 12;
  const yearAverage = monthsElapsedThisYear > 0 ? yearTotal / monthsElapsedThisYear : 0;
  const canGoEarlierYear = selectedYear > yearsAvailable[0];
  const canGoLaterYear = selectedYear < currentYear;

  const recurringInCategory = recurringSeries.filter(s => s.categoryId === id);

  const monthGroups = useMemo(() => groupByMonth(categoryTransactions), [categoryTransactions]);

  if (!category || !id) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <Text variant="body" color={Colors.text3}>
            Category not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const body = (
    <>
      <View style={{ alignItems: 'center' }}>
        <CategoryIcon id={category.id} emoji={category.emoji} color={category.color} size={48} />
        <Text variant="display" weight="bold" color={category.color} style={{ marginTop: Spacing.md, fontSize: 30 }}>
          {category.name}
        </Text>
      </View>

      <View style={{ alignItems: 'center', marginTop: Spacing.xl }}>
        <Text variant="caption" color={Colors.text3} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Spent this month
        </Text>
        <Text variant="display" weight="bold" style={{ marginTop: 4, fontSize: 40, fontVariant: ['tabular-nums'] }}>
          {formatCurrency(monthlySpend)}
        </Text>
        {hasBudget && (
          <Text variant="caption" color={over ? Colors.red : Colors.green} style={{ marginTop: 4 }}>
            {overUnderAmount < 1 ? 'Right on budget' : `${formatCurrency(overUnderAmount, { compact: true })} ${over ? 'over' : 'under'}`}
          </Text>
        )}
      </View>

      <View style={{ marginTop: Spacing.xl }}>
        <SpendCeilingChart
          periods={chartHistory}
          granularity="month"
          monthlyCeiling={hasBudget ? budget!.monthlyLimit : 0}
          ceilingLabel="Budget"
          colorMode="status"
          height={110}
        />
      </View>

      <Pressable onPress={() => setEditing(true)} style={styles.editBudgetRow}>
        <Icon name="pencil" size={13} color={Colors.orange} />
        <Text variant="caption" weight="semibold" color={Colors.orange}>
          {hasBudget ? 'Edit budget' : 'Set a budget for this category'}
        </Text>
      </Pressable>

      <View style={styles.yearlyMetricsHeader}>
        <Text variant="title" weight="semibold" color={Colors.text1}>
          Yearly metrics
        </Text>
        <View style={styles.yearPicker}>
          <Pressable onPress={() => setSelectedYear(y => y - 1)} disabled={!canGoEarlierYear} hitSlop={8}>
            <Icon name="chevronLeft" size={14} color={canGoEarlierYear ? Colors.text2 : Colors.text4} />
          </Pressable>
          <Text variant="body" weight="semibold" color={Colors.text2} style={{ minWidth: 40, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
            {selectedYear}
          </Text>
          <Pressable onPress={() => setSelectedYear(y => y + 1)} disabled={!canGoLaterYear} hitSlop={8}>
            <Icon name="chevronRight" size={14} color={canGoLaterYear ? Colors.text2 : Colors.text4} />
          </Pressable>
        </View>
      </View>
      <View style={styles.metricsRow}>
        <View style={styles.metricTile}>
          <Text variant="caption" color={Colors.text3}>
            Total spent in {selectedYear}
          </Text>
          <Text variant="subtitle" weight="semibold" style={{ marginTop: 2, fontVariant: ['tabular-nums'] }}>
            {formatAggregate(yearTotal)}
          </Text>
        </View>
        <View style={styles.metricTile}>
          <Text variant="caption" color={Colors.text3}>
            Average per month
          </Text>
          <Text variant="subtitle" weight="semibold" style={{ marginTop: 2, fontVariant: ['tabular-nums'] }}>
            {formatAggregate(yearAverage)}
          </Text>
        </View>
      </View>

      {recurringInCategory.length > 0 && (
        <View>
          <SectionLabel text="Recurring in this category" />
          <View>
            {recurringInCategory.map((s, i) => (
              <View key={s.id} style={[styles.recurringRow, i > 0 && styles.rowDivider]}>
                <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
                  {s.merchantName}
                </Text>
                <Text variant="caption" color={Colors.text4} style={{ marginRight: Spacing.sm }}>
                  {s.cadence.charAt(0).toUpperCase() + s.cadence.slice(1)}
                </Text>
                {/* averageAmount is signed the same way Transaction.amount is
                    (negative = spend) -- this screen only ever lists expense
                    categories, so it's already negative here. The earlier
                    `-s.averageAmount` double-flipped it to positive, which
                    rendered a rent/subscription charge in Amount's "income"
                    green -- backwards. */}
                <Amount amount={s.averageAmount} variant="body" />
              </View>
            ))}
          </View>
        </View>
      )}

      <SectionLabel text="Transactions" />
      {monthGroups.length === 0 ? (
        <EmptyState icon={<Icon name="receipt" size={22} color={Colors.text3} />} title="No transactions yet" subtitle={`Nothing categorized as ${category.name} yet.`} />
      ) : (
        monthGroups.map(group => (
          <View key={group.month} style={{ marginBottom: Spacing.md }}>
            <Text variant="micro" weight="semibold" color={Colors.text3} style={styles.monthHeaderLabel}>
              {group.label}
            </Text>
            {group.transactions.map((tx, i) => (
              <Pressable
                key={tx.id}
                onPress={() => router.push(`/transaction/${tx.id}`)}
                style={({ pressed }) => [styles.txRow, i > 0 && styles.rowDivider, pressed && { opacity: 0.7 }]}
              >
                <View style={{ flex: 1, marginRight: Spacing.sm }}>
                  <Text variant="body" numberOfLines={1}>
                    {tx.merchantName}
                  </Text>
                  <Text variant="micro" color={Colors.text4} style={{ marginTop: 2 }}>
                    {formatShortDate(tx.date)}
                  </Text>
                </View>
                <Amount amount={tx.amount} />
              </Pressable>
            ))}
          </View>
        ))
      )}
    </>
  );

  const editModal = editing && (
    <EditBudgetModal
      categoryId={id}
      currentLimit={budget?.monthlyLimit ?? SUGGESTED_DEFAULTS[id] ?? 100}
      currentSpent={progress.find(p => p.categoryId === id)?.spent ?? monthlySpend}
      onClose={() => setEditing(false)}
      onSave={limit => {
        setBudget(id, limit);
        setEditing(false);
      }}
    />
  );

  if (isWideWeb) {
    return (
      <WebPageShell>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.webScroll}>
          <Pressable onPress={() => router.back()} style={styles.webBackRow} hitSlop={8}>
            <Icon name="chevronLeft" size={13} color={Colors.text3} />
            <Text variant="caption" color={Colors.text3}>
              Back
            </Text>
          </Pressable>
          {body}
        </ScrollView>
        {editModal}
      </WebPageShell>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <Atmosphere />
      <View style={styles.header}>
        {/* Design-audit-round-4: this was the same size/weight/case as
            "Close" on the opposite side -- "I thought I could click
            'Category' since it seems identical to 'Close'" in review.
            It's wayfinding, not a control -- lower contrast and no
            letter-spacing/case treatment that reads as button-like now
            separates "this is a label" from "this is the dismiss action." */}
        <Text variant="micro" color={Colors.text4}>
          Category
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text variant="body" color={Colors.text3}>
            Close
          </Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl }}>{body}</ScrollView>
      {editModal}
    </SafeAreaView>
  );
}

function SectionLabel({ text, trailing }: { text: string; trailing?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: Spacing.xl, marginBottom: Spacing.sm }}>
      <Text variant="subtitle" color={Colors.text2}>
        {text}
      </Text>
      {trailing && (
        <Text variant="caption" color={Colors.text4}>
          {trailing}
        </Text>
      )}
    </View>
  );
}

/** Ember currency rule applied to this screen's two yearly aggregates:
 * `compact` (`$2.3k`) once it's big enough to abbreviate, otherwise a
 * whole dollar amount with no cents -- never full cent-precision for a
 * derived statistic, which is what let "$2.3k Total spent" sit next to
 * "$254.12 Average per month" as mismatched peers before this. */
function formatAggregate(value: number): string {
  return Math.abs(value) >= 1000 ? formatCurrency(value, { compact: true }) : formatCurrency(value, { precision: 'whole' });
}

function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function monthYearLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Groups already-newest-first transactions into newest-first month
 * buckets -- same shape as Activity's own day-grouping, one level up. */
function groupByMonth(transactions: Transaction[]): { month: string; label: string; transactions: Transaction[] }[] {
  const groups: { month: string; label: string; transactions: Transaction[] }[] = [];
  for (const t of transactions) {
    const month = t.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.transactions.push(t);
    else groups.push({ month, label: monthYearLabel(month), transactions: [t] });
  }
  return groups;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  webScroll: { padding: Spacing.xl, maxWidth: 720, width: '100%', alignSelf: 'center', paddingBottom: Spacing.xxxl },
  webBackRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: Spacing.lg, alignSelf: 'flex-start' },
  editBudgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  yearlyMetricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  yearPicker: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  metricsRow: { flexDirection: 'row', gap: Spacing.xl },
  metricTile: { flex: 1 },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
  },
  monthHeaderLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingBottom: Spacing.xs,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border1,
  },
});
