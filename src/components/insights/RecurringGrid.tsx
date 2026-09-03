import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { Badge, Card, CategoryIcon, ProgressRing, SampleTag, Text } from '@/components/ui';
import { Breakpoints, Colors, Spacing } from '@/constants/theme';
import { findCategory } from '@/lib/mock/categories';
import { SAMPLE_RECURRING_ITEMS } from '@/lib/mock/sampleChartData';
import { useFinance } from '@/lib/store/FinanceContext';
import type { RecurringInsights } from '@/lib/utils/insights';
import { formatCurrency } from '@/lib/utils/currency';

function relativeDue(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days > 1) return `in ${days}d`;
  if (days === -1) return '1d overdue';
  return `${Math.abs(days)}d overdue`;
}

function cadenceLabel(cadence: string): string {
  return cadence.charAt(0).toUpperCase() + cadence.slice(1);
}

type Flag = 'paid' | 'due_soon' | 'late' | 'overdue' | 'upcoming';

const FLAG_META: Record<Flag, { label: string; color: string }> = {
  paid: { label: 'Paid', color: Colors.green },
  due_soon: { label: 'Due soon', color: Colors.amber },
  // Distinct from 'due_soon' -- that badge's forward-looking tense ("due
  // soon") directly contradicted a same-card caption already reading "1d
  // overdue" once a charge's expected date had actually passed (see
  // statusFor() in lib/utils/insights.ts). 'Running late' matches the
  // caption's own tense instead of promising something that already happened.
  late: { label: 'Running late', color: Colors.orangeCta },
  overdue: { label: 'Overdue', color: Colors.red },
  upcoming: { label: 'Upcoming', color: Colors.text4 },
};

interface DisplayItem {
  key: string;
  merchantName: string;
  categoryId: string;
  amount: number;
  cadence: string;
  dueLabel: string;
  flag: Flag;
}

/**
 * Recurring's dedicated page, rebuilt Copilot-style: a ring hero answering
 * "how much of this month's recurring spend has already gone out the
 * door," then a card grid (icon, name, amount, cadence, a paid/due-soon/
 * overdue flag) instead of the flat list this replaces. A grid scans
 * faster than a list for "which of these ~15 things needs my attention"
 * because flags/colors sit in a fixed spot on every card instead of
 * sharing one line of text with the cadence, which is what made the old
 * list read as "cluttered" per the redesign brief.
 *
 * Deliberately never uses a truly-absolute "corner flag" overlay -- the
 * flag renders in the card's own header row instead. Copilot's overlays
 * (coaching tooltips, FAB) sitting *on top of* the content they describe
 * was one of the flaws this whole pass set out to avoid; a flag that could
 * clip over a long merchant name would be the same mistake in miniature.
 */
export function RecurringGrid({ insights }: { insights: RecurringInsights }) {
  const { categories } = useFinance();
  const { width } = useWindowDimensions();
  // The dedicated /recurring page caps its own content width at 900px (see
  // recurring.tsx), so this only needs two tiers -- mobile-width vs. the
  // fixed web container -- not a third `xwide` tier that would never get
  // a wider box to actually grow into.
  const columns = width >= Breakpoints.wide ? 3 : 2;

  const isSample = insights.items.length === 0;
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const displayItems: DisplayItem[] = isSample
    ? SAMPLE_RECURRING_ITEMS.map(s => ({
        key: s.id,
        merchantName: s.merchantName,
        categoryId: s.categoryId,
        amount: s.monthlyEquivalent,
        cadence: s.cadenceLabel.split(' ')[0],
        dueLabel: s.dueLabel,
        flag: 'upcoming',
      }))
    : insights.items.map(item => {
        const paidThisMonth = item.series.lastSeenDate.slice(0, 7) === currentMonthKey;
        const flag: Flag =
          item.status === 'overdue'
            ? 'overdue'
            : item.status === 'late'
              ? 'late'
              : item.status === 'due_soon'
                ? 'due_soon'
                : paidThisMonth
                  ? 'paid'
                  : 'upcoming';
        return {
          key: item.series.id,
          merchantName: item.series.merchantName,
          categoryId: item.series.categoryId,
          amount: item.monthlyEquivalent,
          cadence: cadenceLabel(item.series.cadence),
          dueLabel: flag === 'paid' ? `Charged ${formatShortDate(item.series.lastSeenDate)}` : relativeDue(item.daysUntilExpected),
          flag,
        };
      });

  const totalMonthly = isSample
    ? SAMPLE_RECURRING_ITEMS.reduce((s, i) => s + i.monthlyEquivalent, 0)
    : insights.items.reduce((s, i) => s + i.monthlyEquivalent, 0);
  const paidMonthly = isSample ? totalMonthly * 0.42 : insights.items.filter(i => i.series.lastSeenDate.slice(0, 7) === currentMonthKey).reduce((s, i) => s + i.monthlyEquivalent, 0);
  const paidPct = totalMonthly > 0 ? paidMonthly / totalMonthly : 0;

  return (
    <View style={{ gap: Spacing.xl }}>
      <Card level="raised" style={{ gap: Spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Text variant="caption" color={Colors.text3}>
                Paid so far this month
              </Text>
              {isSample && <SampleTag />}
            </View>
            <Text variant="display" weight="bold" color={Colors.text1} style={{ marginTop: 8, fontSize: 40, letterSpacing: -0.5, fontVariant: ['tabular-nums'] }}>
              {formatCurrency(paidMonthly)}
            </Text>
            <Text variant="caption" color={Colors.text3} style={{ marginTop: 8 }}>
              {formatCurrency(totalMonthly - paidMonthly, { compact: true })} left of {formatCurrency(totalMonthly, { compact: true })}/mo committed
            </Text>
          </View>
          <ProgressRing pct={paidPct} size={88} strokeWidth={9} color={Colors.green}>
            <Text variant="subtitle" weight="bold" color={Colors.text1} style={{ fontVariant: ['tabular-nums'] }}>
              {Math.round(paidPct * 100)}%
            </Text>
          </ProgressRing>
        </View>

        {!isSample && insights.overdueCount > 0 && (
          <View style={styles.overdueBanner}>
            <Text variant="caption" color={Colors.red}>
              {insights.overdueCount === 1
                ? '1 charge is past its expected date -- it may have lapsed, or the merchant is just running late.'
                : `${insights.overdueCount} charges are past their expected date -- they may have lapsed, or the merchants are just running late.`}
            </Text>
          </View>
        )}
      </Card>

      {isSample && (
        <Text variant="caption" color={Colors.text4}>
          Link an account or add a few months of manual/imported history and your real recurring charges will show up here automatically.
        </Text>
      )}

      <View style={[styles.grid, { opacity: isSample ? 0.6 : 1 }]}>
        {displayItems.map(item => {
          const category = findCategory(categories, item.categoryId);
          const meta = FLAG_META[item.flag];
          return (
            <View key={item.key} style={[styles.cell, { width: `${100 / columns}%` }]}>
              <Card level="flat" style={styles.card}>
                <View style={styles.cardHeader}>
                  <CategoryIcon id={category.id} emoji={category.emoji} color={category.color} size={32} />
                  <Badge label={meta.label} color={meta.color} />
                </View>
                {/* Flaw-avoidance: Copilot's own recurring cards frequently
                    mid-word-truncate ("Car Insur...") at this card width.
                    Wrapping to two lines instead of clipping to one keeps
                    the name legible; the fixed minHeight keeps amounts
                    aligned across a row even when names wrap differently. */}
                <Text variant="body" weight="semibold" numberOfLines={2} style={styles.cardName}>
                  {item.merchantName}
                </Text>
                <Text variant="title" weight="bold" color={Colors.text1} style={{ marginTop: 2, fontVariant: ['tabular-nums'] }}>
                  {formatCurrency(item.amount, { compact: true })}
                </Text>
                <Text variant="micro" color={Colors.text4} style={{ marginTop: 6 }} numberOfLines={1}>
                  {item.cadence} · {item.dueLabel}
                </Text>
              </Card>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  overdueBanner: {
    padding: Spacing.sm,
    borderRadius: 10,
    backgroundColor: Colors.redSoft,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.25)',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -Spacing.sm },
  cell: { padding: Spacing.sm },
  card: { padding: Spacing.lg, gap: 0 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { marginTop: Spacing.md, minHeight: 38 },
});
