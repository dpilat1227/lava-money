import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useRecurringInsights } from '@/hooks/useFinanceSelectors';
import { formatCurrency } from '@/lib/utils/currency';

/**
 * Replaces the full `RecurringInsightsCard` on Trends -- that card (two
 * stat cells, an overdue banner, up to six itemized rows) was "fighting for
 * space" on a page that's supposed to be about spending-over-time, which
 * is an information-architecture problem, not a density one. The full
 * card, and everything it detects, now lives on its own page (see
 * app/recurring.tsx); this is just enough to know it's there and worth a
 * look -- the two headline numbers and an overdue flag, nothing itemized.
 */
export function RecurringTeaserCard() {
  const router = useRouter();
  const { subscriptionsMonthlyTotal, billsMonthlyTotal, overdueCount } = useRecurringInsights();

  return (
    <Pressable onPress={() => router.push('/recurring')}>
      {/* Design-audit-round-3: secondary single-purpose card -- `resting`,
          same reclassification as CashFlowCard. */}
      <Card level="resting">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="subtitle" color={Colors.text2}>
            Recurring & subscriptions
          </Text>
          <Text variant="caption" color={Colors.orange}>
            View all ›
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg }}>
          <View style={{ flex: 1 }}>
            <Text variant="micro" color={Colors.text4}>
              Subscriptions
            </Text>
            <Text variant="title" weight="semibold" color={Colors.text1} style={{ marginTop: 2 }}>
              {formatCurrency(subscriptionsMonthlyTotal, { compact: true })}
              <Text variant="caption" color={Colors.text4}>
                /mo
              </Text>
            </Text>
          </View>
          <View style={{ width: 1, height: 28, backgroundColor: Colors.border1, marginHorizontal: Spacing.lg }} />
          <View style={{ flex: 1 }}>
            <Text variant="micro" color={Colors.text4}>
              Recurring bills
            </Text>
            <Text variant="title" weight="semibold" color={Colors.text1} style={{ marginTop: 2 }}>
              {formatCurrency(billsMonthlyTotal, { compact: true })}
              <Text variant="caption" color={Colors.text4}>
                /mo
              </Text>
            </Text>
          </View>
        </View>

        {overdueCount > 0 && (
          <Text variant="caption" color={Colors.red} style={{ marginTop: Spacing.md }}>
            {overdueCount === 1 ? '1 charge may have lapsed' : `${overdueCount} charges may have lapsed`} — tap to review
          </Text>
        )}
      </Card>
    </Pressable>
  );
}
