import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Card, Text } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import type { RecurringInsightItem, RecurringInsights } from '@/lib/utils/insights';
import { findCategory } from '@/lib/mock/categories';
import { useFinance } from '@/lib/store/FinanceContext';
import { formatCurrency } from '@/lib/utils/currency';

function relativeDue(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days > 1) return `in ${days}d`;
  if (days === -1) return '1d overdue';
  return `${Math.abs(days)}d overdue`;
}

function StatusBadge({ item }: { item: RecurringInsightItem }) {
  if (item.status === 'overdue') return <Badge label="May have lapsed" color={Colors.red} />;
  if (item.status === 'due_soon') return <Badge label={relativeDue(item.daysUntilExpected)} color={Colors.amber} />;
  return null;
}

/**
 * The Impause/Rowan-adjacent "insights" surface from `docs/STRATEGY.md`:
 * a passive read of `detectRecurringSeries()` output, not a chatbot and not
 * an agent that acts on the user's accounts. "May have lapsed" just means
 * the expected charge date passed by more than its cadence's grace window
 * (`GRACE_DAYS` in `lib/utils/insights.ts`) -- it's a scheduling inference,
 * not a claim about whether the user actually still uses the service.
 */
export function RecurringInsightsCard({ insights }: { insights: RecurringInsights }) {
  const { categories } = useFinance();
  const { items, subscriptionsMonthlyTotal, billsMonthlyTotal, overdueCount } = insights;

  if (items.length === 0) {
    return (
      <Card>
        <Text variant="subtitle" color={Colors.text2} style={{ marginBottom: Spacing.xs }}>
          Recurring & subscriptions
        </Text>
        <Text variant="caption" color={Colors.text4}>
          Nothing detected yet -- link an account or add a few months of manual/imported history and recurring charges will show up here
          automatically.
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text variant="subtitle" color={Colors.text2} style={{ marginBottom: Spacing.md }}>
        Recurring & subscriptions
      </Text>

      <View style={styles.totalsRow}>
        <View style={styles.totalCell}>
          <Text variant="micro" color={Colors.text4}>
            Subscriptions
          </Text>
          <Text variant="title" weight="semibold" color={Colors.text1}>
            {formatCurrency(subscriptionsMonthlyTotal, { compact: true })}
            <Text variant="caption" color={Colors.text4}>
              /mo
            </Text>
          </Text>
        </View>
        <View style={styles.totalDivider} />
        <View style={styles.totalCell}>
          <Text variant="micro" color={Colors.text4}>
            Recurring bills
          </Text>
          <Text variant="title" weight="semibold" color={Colors.text1}>
            {formatCurrency(billsMonthlyTotal, { compact: true })}
            <Text variant="caption" color={Colors.text4}>
              /mo
            </Text>
          </Text>
        </View>
      </View>

      {overdueCount > 0 && (
        <View style={styles.overdueBanner}>
          <Text variant="caption" color={Colors.red}>
            {overdueCount === 1
              ? '1 charge is past its expected date -- it may have lapsed, or the merchant is just running late.'
              : `${overdueCount} charges are past their expected date -- they may have lapsed, or the merchants are just running late.`}
          </Text>
        </View>
      )}

      <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
        {items.map((item, i) => {
          const category = findCategory(categories, item.series.categoryId);
          return (
            <View key={item.series.id} style={[styles.row, i === 0 && styles.rowFirst]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                  <Text variant="body">
                    {category.emoji} {item.series.merchantName}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 2 }}>
                  <Text variant="micro" color={Colors.text4}>
                    {item.series.cadence} · {item.series.occurrenceCount}x seen
                  </Text>
                  <StatusBadge item={item} />
                </View>
              </View>
              <Text variant="body" weight="semibold" color={Colors.text1}>
                {formatCurrency(-item.monthlyEquivalent)}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  totalsRow: { flexDirection: 'row', alignItems: 'center' },
  totalCell: { flex: 1, gap: 2 },
  totalDivider: { width: 1, height: 32, backgroundColor: Colors.border1, marginHorizontal: Spacing.md },
  overdueBanner: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    borderRadius: 10,
    backgroundColor: Colors.redSoft,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.25)',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: Colors.border1 },
  rowFirst: { borderTopWidth: 0, paddingTop: 0 },
});
