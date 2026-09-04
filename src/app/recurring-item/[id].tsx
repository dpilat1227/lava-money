import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Amount, Atmosphere, CategoryIcon, EmptyState, Icon, Text } from '@/components/ui';
import { WebPageShell } from '@/components/web/DesktopShell';
import { Breakpoints, Colors, Spacing } from '@/constants/theme';
import { findCategory } from '@/lib/mock/categories';
import { useFinance } from '@/lib/store/FinanceContext';
import { formatCurrency } from '@/lib/utils/currency';

function cadenceLabel(cadence: string): string {
  return cadence.charAt(0).toUpperCase() + cadence.slice(1);
}

function relativeDue(daysUntil: number): string {
  if (daysUntil === 0) return 'today';
  if (daysUntil === 1) return 'tomorrow';
  if (daysUntil > 1) return `in ${daysUntil} days`;
  if (daysUntil === -1) return '1 day overdue';
  return `${Math.abs(daysUntil)} days overdue`;
}

function formatFullShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * New in the design-audit-round-3 pass -- recurring cards had no `onPress`
 * at all ("I also expected to be able to click into the recurring
 * subscription components"). Scoped v1 per the plan: name/icon/category,
 * average amount + cadence, next-expected date, and a plain chronological
 * charge history (same "more from this merchant" exact-name matching
 * `transaction/[id].tsx` already uses, not a new normalization scheme).
 * Skips Copilot's editable inline-sentence rule editor and dot-timeline
 * visualization -- both are more naturally a v2 on top of this, not
 * blockers for letting someone tap a card at all.
 */
export default function RecurringItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= Breakpoints.wide;
  const { categories, recurringSeries, transactions } = useFinance();

  const series = recurringSeries.find(s => s.id === id);
  const category = series ? findCategory(categories, series.categoryId) : null;
  // Same exact-merchant-name matching transaction/[id].tsx's own "More
  // from this merchant" section already uses -- one convention for
  // "which transactions belong to this merchant" across the app, not two
  // slightly different ones.
  const history = useMemo(
    () => (series ? transactions.filter(t => t.merchantName === series.merchantName).sort((a, b) => (a.date < b.date ? 1 : -1)) : []),
    [transactions, series]
  );

  const today = new Date();
  const daysUntil = series ? Math.round((new Date(series.nextExpectedDate + 'T00:00:00').getTime() - today.setHours(0, 0, 0, 0)) / 86400000) : 0;

  if (!series || !category) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <Text variant="body" color={Colors.text3}>
            Recurring item not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const body = (
    <>
      <View style={{ alignItems: 'center' }}>
        <CategoryIcon id={category.id} emoji={category.emoji} color={category.color} size={48} />
        <Text variant="display" weight="bold" style={{ marginTop: Spacing.md, fontSize: 26, textAlign: 'center' }} numberOfLines={2}>
          {series.merchantName}
        </Text>
        <Text variant="caption" color={category.color} style={{ marginTop: 4 }}>
          {category.name}
        </Text>
      </View>

      <View style={{ alignItems: 'center', marginTop: Spacing.xl }}>
        <Text variant="caption" color={Colors.text3} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Average amount
        </Text>
        <Text variant="display" weight="bold" style={{ marginTop: 4, fontSize: 36, fontVariant: ['tabular-nums'] }}>
          {formatCurrency(series.averageAmount)}
        </Text>
        <Text variant="caption" color={Colors.text3} style={{ marginTop: 4 }}>
          {cadenceLabel(series.cadence)}
        </Text>
      </View>

      <View style={styles.nextRow}>
        <View style={{ flex: 1 }}>
          <Text variant="micro" color={Colors.text4}>
            Next expected
          </Text>
          <Text variant="body" weight="semibold" style={{ marginTop: 2 }}>
            {formatFullShortDate(series.nextExpectedDate)}
          </Text>
          <Text variant="caption" color={daysUntil < 0 ? Colors.red : Colors.text3} style={{ marginTop: 2 }}>
            {relativeDue(daysUntil)}
          </Text>
        </View>
        <View style={styles.metricsDivider} />
        <View style={{ flex: 1 }}>
          <Text variant="micro" color={Colors.text4}>
            Seen
          </Text>
          <Text variant="body" weight="semibold" style={{ marginTop: 2 }}>
            {series.occurrenceCount} time{series.occurrenceCount === 1 ? '' : 's'}
          </Text>
          <Text variant="caption" color={Colors.text3} style={{ marginTop: 2 }}>
            Last on {formatFullShortDate(series.lastSeenDate)}
          </Text>
        </View>
      </View>

      <Text variant="subtitle" color={Colors.text2} style={{ marginTop: Spacing.xl, marginBottom: Spacing.sm }}>
        History
      </Text>
      {history.length === 0 ? (
        <EmptyState icon={<Icon name="sync" size={22} color={Colors.text3} />} title="No matching charges" subtitle="Nothing on record for this merchant name yet." />
      ) : (
        history.map((tx, i) => (
          <Pressable
            key={tx.id}
            onPress={() => router.push(`/transaction/${tx.id}`)}
            style={({ pressed }) => [styles.txRow, i > 0 && styles.rowDivider, pressed && { opacity: 0.7 }]}
          >
            <Text variant="body" color={Colors.text2}>
              {formatFullShortDate(tx.date)}
            </Text>
            <Amount amount={tx.amount} />
          </Pressable>
        ))
      )}
    </>
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
      </WebPageShell>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <Atmosphere />
      <View style={styles.header}>
        <Text variant="caption" color={Colors.text4} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Recurring
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text variant="body" color={Colors.text3}>
            Close
          </Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl }}>{body}</ScrollView>
    </SafeAreaView>
  );
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
  webScroll: { padding: Spacing.xl, maxWidth: 560, width: '100%', alignSelf: 'center', paddingBottom: Spacing.xxxl },
  webBackRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: Spacing.lg, alignSelf: 'flex-start' },
  nextRow: { flexDirection: 'row', marginTop: Spacing.xl },
  metricsDivider: { width: 1, backgroundColor: Colors.border1, marginHorizontal: Spacing.lg },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border1,
  },
});
