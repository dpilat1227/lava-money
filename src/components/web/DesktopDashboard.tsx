import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { SpendCeilingChart } from '@/components/charts/SpendCeilingChart';
import { NetWorthHero } from '@/components/home/NetWorthHero';
import { CategoryRankedList } from '@/components/insights/CategoryRankedList';
import { Amount, Badge, Card, CategoryIcon, Icon, Text } from '@/components/ui';
import { Breakpoints, Colors, Spacing } from '@/constants/theme';
import { useNetWorthHistory, useNetWorthSummary, useSpendByPeriod, useUpcomingRecurring } from '@/hooks/useFinanceSelectors';
import { findCategory } from '@/lib/mock/categories';
import { useFinance } from '@/lib/store/FinanceContext';
import { findCategorySuggestions } from '@/lib/utils/categorizer';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDayLabel } from '@/lib/utils/date';

const RANGE_OPTIONS = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
] as const;

/**
 * Wide-web-only dashboard (see (tabs)/index.tsx -- only rendered above
 * Breakpoints.wide; the phone-shaped stacked layout is untouched). Net
 * worth is the one full-width hero -- literally `NetWorthHero`, the same
 * component Home uses, not a re-implementation -- with everything else
 * demoted to a row of flatter, thin-bordered (Vercel-style, no blur) cards
 * underneath. Previously a 2x2 grid of equal-weight cards fighting each
 * other for attention; see the redesign plan for why that read as generic.
 */
export function DesktopDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { accounts, transactions, categories } = useFinance();
  const [range, setRange] = useState<1 | 3 | 6 | 12>(6);

  // Weekly, not monthly -- see buildNetWorthHistory's "granularity" note.
  // useNetWorthSummary (the +$X-this-month change line) stays on its own
  // monthly path below, unaffected.
  const chartHistory = useNetWorthHistory(range, 'week');
  const summary = useNetWorthSummary();
  const upcoming = useUpcomingRecurring(5);
  const suggestions = findCategorySuggestions(transactions).slice(0, 4);
  // "Transactions to review" is an action item, not a metric -- it only
  // earns equal billing with Monthly spending/Top categories when there's
  // actually something to act on. Empty, it used to sit there as a full
  // dead card saying "Nothing to review" while the two cards that actually
  // matter got squeezed to a third of the row each.
  const hasReview = suggestions.length > 0;

  // Design-audit-round-3: was a `Sparkline` (deliberately axis-less by its
  // own doc comment -- "a shape, not a chart to be read precisely") plus
  // one plain number. "Shouldn't monthly spending be a bar chart, with
  // dates?" -- fair; this card is one of two main content pieces on the
  // dashboard, not a decorative footnote, and mobile's own SpendingCard
  // already gets the full SpendCeilingChart treatment. `completeOnly` for
  // the same "don't show a misleadingly tiny in-progress month" reason the
  // old flow.slice(0, -1) existed for.
  const monthlySpend = useSpendByPeriod('month', 6, { completeOnly: true });
  const thisMonth = monthlySpend[monthlySpend.length - 1];
  const lastMonth = monthlySpend[monthlySpend.length - 2];
  const monthlySpendWithData = monthlySpend.filter(p => p.total > 0);
  const monthlyAverage = monthlySpendWithData.length > 0 ? monthlySpendWithData.reduce((s, p) => s + p.total, 0) / monthlySpendWithData.length : 0;

  // "Top categories" is a teaser, not the chart -- the full ranked
  // breakdown (every category, budgeted or not, plus the segmented
  // proportion bar) lives on Budgets now (`BudgetBreakdownCard`; see
  // design-audit-round-4's IA restructure). Reuses `thisMonth`
  // (monthlySpend's own last entry)
  // rather than a second `useSpendByPeriod('month', 1, ...)` call -- this
  // and "Monthly spending" used to run two independent queries that could
  // (and did) disagree about what month "the current one" meant on the
  // first few days of a new month; sharing the exact same object makes
  // that class of bug impossible instead of just unlikely.
  const topCategories = thisMonth?.byCategory.slice(0, 3) ?? [];

  // Above Breakpoints.xwide (defined in theme.ts, previously unused) a
  // fixed 1040px column leaves distracting dead space on either side on a
  // large monitor -- widen the canvas instead of just centering a phone-web
  // grid in the middle of it.
  const maxWidth = width >= Breakpoints.xwide ? 1280 : 1040;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.scroll, { maxWidth }]}>
      <NetWorthHero
        netWorth={summary.netWorth}
        change={summary.change}
        accountCount={accounts.length}
        assets={summary.assets}
        liabilities={summary.liabilities}
        history={chartHistory}
        range={range}
        onRangeChange={setRange}
        rangeOptions={RANGE_OPTIONS}
      />

      <View style={[styles.row, { marginTop: Spacing.section }]}>
        <Card level="flat" style={hasReview ? styles.thirdCard : styles.halfCard}>
          <Text variant="subtitle" color={Colors.text2}>
            Monthly spending{thisMonth ? ` (${thisMonth.label})` : ''}
          </Text>
          {/* Design-audit-round-3 fix: this was `variant="display"` with no
              explicit weight, which defaults to Inter_900Black -- visibly
              heavier than NetWorthHero's own hero number right above it
              (`weight="bold"` -> Inter_700Bold), despite both being "the
              big number" in their own card. Same weight now. */}
          <Text variant="display" weight="bold" style={{ marginTop: Spacing.sm, fontSize: 28 }}>
            {formatCurrency(thisMonth?.total ?? 0)}
          </Text>
          <Text variant="caption" color={Colors.text4}>
            {lastMonth ? `${formatCurrency(lastMonth.total)} in ${lastMonth.label}` : 'spent this month'}
          </Text>
          <View style={{ marginTop: Spacing.md }}>
            <SpendCeilingChart periods={monthlySpend} granularity="month" monthlyCeiling={monthlyAverage} ceilingIsPrescaled ceilingLabel="Avg." height={90} />
          </View>
        </Card>

        {hasReview && (
          <Card level="flat" style={styles.thirdCard}>
            <View style={styles.cardHeader}>
              <Text variant="subtitle" color={Colors.text2}>
                Transactions to review
              </Text>
              <Link href="/review-categories" asChild>
                <Pressable>
                  <Text variant="caption" color={Colors.orange}>
                    View all ›
                  </Text>
                </Pressable>
              </Link>
            </View>

            <View style={{ marginTop: Spacing.sm, gap: Spacing.sm }}>
              {suggestions.map(s => (
                <ReviewRow key={s.transaction.id} transactionId={s.transaction.id} merchant={s.transaction.merchantName} amount={s.transaction.amount} categoryId={s.result.categoryId} />
              ))}
            </View>
          </Card>
        )}

        <Card level="flat" style={hasReview ? styles.thirdCard : styles.halfCard}>
          <View style={styles.cardHeader}>
            <Text variant="subtitle" color={Colors.text2}>
              Top categories
            </Text>
            {/* Trends retired -- category ranking lives on Budgets now
                (BudgetBreakdownCard), design-audit-round-4. */}
            <Link href="/budgets" asChild>
              <Pressable>
                <Text variant="caption" color={Colors.orange}>
                  View all ›
                </Text>
              </Pressable>
            </Link>
          </View>

          <View style={{ marginTop: Spacing.lg }}>
            <CategoryRankedList
              items={topCategories}
              categories={categories}
              periodTotal={thisMonth?.total ?? 0}
              emptyLabel="No spending yet this month."
              onSelectCategory={categoryId => router.push(`/category/${categoryId}`)}
            />
          </View>
        </Card>
      </View>

      {upcoming.length > 0 && (
        <Card level="flat" style={{ marginTop: Spacing.xl }}>
          <View style={styles.cardHeader}>
            <Text variant="subtitle" color={Colors.text2}>
              Upcoming
            </Text>
            <Link href="/recurring" asChild>
              <Pressable>
                <Text variant="caption" color={Colors.orange}>
                  View all ›
                </Text>
              </Pressable>
            </Link>
          </View>
          <View style={{ marginTop: Spacing.sm }}>
            {upcoming.map((r, i) => {
              const category = findCategory(categories, r.categoryId);
              return (
                // expo-router's <Link asChild> clones this Pressable and merges
                // its own `style` in -- an array `style` prop trips a (real, if
                // noisy) dev warning asking for a flattened object (same fix
                // DesktopShell.tsx's nav rows already needed).
                <Link key={r.id} href="/recurring" asChild>
                  <Pressable style={StyleSheet.flatten([styles.upcomingRow, i > 0 && styles.upcomingRowDivider])}>
                    <CategoryIcon id={category.id} emoji={category.emoji} color={category.color} size={36} />
                    <View style={{ flex: 1, marginLeft: Spacing.md }}>
                      <Text variant="body" numberOfLines={1}>
                        {r.merchantName}
                      </Text>
                      <Text variant="caption" color={Colors.text4}>
                        {formatDayLabel(r.nextExpectedDate)}
                      </Text>
                    </View>
                    <Amount amount={r.averageAmount} variant="body" />
                  </Pressable>
                </Link>
              );
            })}
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

function ReviewRow({ transactionId, merchant, amount, categoryId }: { transactionId: string; merchant: string; amount: number; categoryId: string }) {
  const { categorizeTransaction, categories } = useFinance();
  const category = categories.find(c => c.id === categoryId) ?? categories[0];
  return (
    <Pressable style={styles.reviewRow} onPress={() => categorizeTransaction(transactionId, categoryId)}>
      <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
        {merchant}
      </Text>
      <Badge label={category.name.toUpperCase()} color={category.color} />
      <Amount amount={amount} variant="caption" />
      <Icon name="check" size={14} color={Colors.text4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxxl, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg },
  thirdCard: { flexGrow: 1, flexBasis: 300, minWidth: 260 },
  halfCard: { flexGrow: 1, flexBasis: 420, minWidth: 320 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  upcomingRowDivider: { borderTopWidth: 1, borderTopColor: Colors.border1 },
});
