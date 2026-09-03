import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Amount, Button, CategoryIcon, EmptyState, Icon, Text } from '@/components/ui';
import { Dialog } from '@/components/web/Dialog';
import { Breakpoints, Colors, Radius, Spacing } from '@/constants/theme';
import { findCategory } from '@/lib/mock/categories';
import { useFinance } from '@/lib/store/FinanceContext';
import { findCategorySuggestions } from '@/lib/utils/categorizer';
import { formatDayLabel } from '@/lib/utils/date';

/**
 * The "review suggestions" pass promised alongside the categorizer: rather
 * than silently re-categorizing anything, every suggestion here requires an
 * explicit Apply -- consistent with the rest of the app's "nothing moves
 * without you" stance on category changes.
 */
export default function ReviewCategoriesModal() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= Breakpoints.wide;
  const { transactions, categories, categorizeTransaction } = useFinance();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const suggestions = useMemo(
    () => findCategorySuggestions(transactions).filter(s => !dismissed.has(s.transaction.id)),
    [transactions, dismissed]
  );

  const applyAll = () => {
    for (const s of suggestions) categorizeTransaction(s.transaction.id, s.result.categoryId);
  };

  const close = () => router.back();

  const body =
    suggestions.length === 0 ? (
      <EmptyState
        icon={<Icon name="checkCircle" size={26} color={Colors.green} />}
        title="Nothing to review"
        subtitle="Every transaction in Other has already been checked, or there's nothing to suggest yet."
      />
    ) : (
      <>
        <Text variant="body" color={Colors.text3} style={styles.intro}>
          {suggestions.length} transaction{suggestions.length === 1 ? '' : 's'} in &quot;Other&quot; matched a category
          rule. Review each one, or apply them all at once.
        </Text>
        <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.sm }}>
          {suggestions.map(s => {
            const suggested = findCategory(categories, s.result.categoryId);
            return (
              <View key={s.transaction.id} style={styles.row}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <CategoryIcon id={suggested.id} emoji={suggested.emoji} color={suggested.color} size={32} />
                  <View style={{ flex: 1, marginLeft: Spacing.md }}>
                    <Text variant="body" numberOfLines={1}>
                      {s.transaction.merchantName}
                    </Text>
                    <Text variant="micro" color={Colors.text4}>
                      {formatDayLabel(s.transaction.date)} · Other → {suggested.name}
                    </Text>
                  </View>
                  <Amount amount={s.transaction.amount} variant="caption" />
                </View>
                <Text variant="micro" color={Colors.text4} style={{ marginTop: 6, marginLeft: 44 }}>
                  {s.result.reason}
                </Text>
                <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, marginLeft: 44 }}>
                  <Pressable
                    onPress={() => categorizeTransaction(s.transaction.id, s.result.categoryId)}
                    style={styles.applyChip}
                  >
                    <Text variant="caption" color={Colors.orange} weight="semibold">
                      Apply
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setDismissed(prev => new Set(prev).add(s.transaction.id))}
                    style={styles.skipChip}
                  >
                    <Text variant="caption" color={Colors.text4}>
                      Skip
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
        <View style={styles.footer}>
          <Button label={`Apply all ${suggestions.length}`} fullWidth onPress={applyAll} />
        </View>
      </>
    );

  // Wide web only: this route is a sibling Stack.Screen outside the
  // `(tabs)` group, so it never got DesktopShell's chrome and used to just
  // stretch full-bleed edge-to-edge in the browser -- missed in the
  // previous pass's popup audit even though transaction/[id].tsx and
  // link-account.tsx already got this exact fix.
  if (isWideWeb) {
    return (
      <Dialog onClose={close} maxWidth={520}>
        <View style={styles.dialogHeader}>
          <Text variant="subtitle" weight="semibold">
            Review categories
          </Text>
          <Pressable onPress={close} hitSlop={12}>
            <Icon name="close" size={15} color={Colors.text3} />
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>{body}</View>
      </Dialog>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text variant="title">Review categories</Text>
        <Pressable onPress={close} hitSlop={12}>
          <Text variant="body" color={Colors.text3}>
            Close
          </Text>
        </Pressable>
      </View>
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border1,
  },
  intro: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  row: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface1,
    borderWidth: 1,
    borderColor: Colors.border1,
    padding: Spacing.md,
  },
  applyChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.orangeSoft,
  },
  skipChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface2,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border1,
  },
});
