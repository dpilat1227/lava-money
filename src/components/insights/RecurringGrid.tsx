import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, Card, CategoryIcon, Icon, ProgressRing, SampleTag, Text } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
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
  /** Sort key -- ascending puts overdue (negative) first, then due-soon,
   * then further-out upcoming charges, matching "sorted by upcoming
   * payment date" (design-audit-round-3's steer, and Copilot's own actual
   * default -- day-of-month ascending -- once you set aside their grid
   * view, which you said you didn't like). */
  daysUntilExpected: number;
  /** Real series id for real items -- undefined for the sample/demo rows,
   * which have nothing behind them to navigate to. */
  seriesId?: string;
}

/**
 * Recurring's dedicated page. Design-audit-round-3: converted from a
 * card grid back to a single-column list -- "I actually don't like the
 * way Copilot did it: the grid of squares doesn't feel intuitive... I do
 * like the vertical list." Rows are now tappable into a dedicated
 * recurring-item detail screen (recurring-item/[id].tsx), which the grid
 * cards never were at all.
 */
export function RecurringGrid({ insights }: { insights: RecurringInsights }) {
  const router = useRouter();
  const { categories } = useFinance();

  const isSample = insights.items.length === 0;
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const displayItems: DisplayItem[] = isSample
    ? SAMPLE_RECURRING_ITEMS.map((s, i) => ({
        key: s.id,
        merchantName: s.merchantName,
        categoryId: s.categoryId,
        amount: s.monthlyEquivalent,
        cadence: s.cadenceLabel.split(' ')[0],
        dueLabel: s.dueLabel,
        flag: 'upcoming',
        daysUntilExpected: i,
      }))
    : insights.items
        .map(item => {
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
            daysUntilExpected: item.daysUntilExpected,
            seriesId: item.series.id,
          };
        })
        .sort((a, b) => a.daysUntilExpected - b.daysUntilExpected);

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

      <View style={{ opacity: isSample ? 0.6 : 1 }}>
        {displayItems.map((item, i) => {
          const category = findCategory(categories, item.categoryId);
          const meta = FLAG_META[item.flag];
          return (
            <Pressable
              key={item.key}
              disabled={!item.seriesId}
              onPress={() => item.seriesId && router.push(`/recurring-item/${item.seriesId}`)}
              style={({ pressed }) => [styles.row, i > 0 && styles.rowDivider, pressed && item.seriesId && { opacity: 0.7 }]}
            >
              <CategoryIcon id={category.id} emoji={category.emoji} color={category.color} size={34} />
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <Text variant="body" weight="medium" numberOfLines={1}>
                  {item.merchantName}
                </Text>
                <Text variant="micro" color={Colors.text4} style={{ marginTop: 2 }} numberOfLines={1}>
                  {item.cadence} · {item.dueLabel}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="body" weight="semibold" style={{ fontVariant: ['tabular-nums'] }}>
                  {formatCurrency(item.amount, { compact: true })}
                </Text>
                <View style={{ marginTop: 4 }}>
                  <Badge label={meta.label} color={meta.color} />
                </View>
              </View>
              {item.seriesId && (
                <View style={{ marginLeft: Spacing.sm }}>
                  <Icon name="chevronRight" size={13} color={Colors.text4} />
                </View>
              )}
            </Pressable>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border1,
  },
});
