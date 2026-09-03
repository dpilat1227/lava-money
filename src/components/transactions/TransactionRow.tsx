import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Amount, Badge, CategoryIcon, Icon, Text } from '@/components/ui';
import { Colors, Motion, Spacing } from '@/constants/theme';
import { findCategory } from '@/lib/mock/categories';
import type { Category, Transaction } from '@/lib/types';
import type { CategorizeResult } from '@/lib/utils/categorizer';

/** Only the fields this row actually reads -- narrow enough that the
 * dimmed, non-interactive `SampleTransaction` preview (see
 * `(tabs)/transactions.tsx`'s empty state) can reuse this component too,
 * instead of hand-rolling its own copy of the same row. */
type RowTransaction = Pick<Transaction, 'merchantName' | 'categoryId' | 'amount'>;

/**
 * Redesign-pass-2: extracted from `(tabs)/transactions.tsx`'s local
 * component so Activity and account detail stop hand-rolling two
 * near-identical row layouts that drift from each other -- account
 * detail's own inline copy never got a category-label treatment beyond
 * plain grey micro text, which is the whole "tiny grey text" complaint on
 * the credit-card view. One component now, used from both.
 *
 * Category identity now reads through two channels instead of one: the
 * solid-tile `CategoryIcon` color, and a color-matched `Badge` label
 * instead of flat `Colors.text4` text -- the actual fix for "tiny grey
 * text," not just a font-size bump.
 */
export function TransactionRow({
  tx,
  categories,
  suggestion,
  onPress,
  onApplySuggestion,
  canDelete = false,
  onDelete,
  statusNote,
  iconSize = 32,
}: {
  tx: RowTransaction;
  categories: Category[];
  /** Only wired from Activity today (account detail doesn't compute
   * suggestions) -- optional so either caller can opt in. */
  suggestion?: CategorizeResult;
  onPress: () => void;
  onApplySuggestion?: (result: CategorizeResult) => void;
  canDelete?: boolean;
  onDelete?: () => void;
  /** Trailing note after the category badge -- "Pending" on Activity,
   * "Imported"/"Manual" on account detail. Screen-specific semantics stay
   * out of this shared component. */
  statusNote?: string;
  iconSize?: number;
}) {
  const category = findCategory(categories, tx.categoryId);
  const swipeRef = useRef<Swipeable>(null);
  const Wrapper = Platform.OS === 'web' ? View : Animated.View;
  const wrapperProps = Platform.OS === 'web' ? {} : { entering: FadeIn.duration(Motion.duration.base) };

  const suggestedCategory = suggestion ? findCategory(categories, suggestion.categoryId) : null;

  const row = (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <CategoryIcon id={category.id} emoji={category.emoji} color={category.color} size={iconSize} />
      <View style={{ flex: 1, marginLeft: Spacing.md }}>
        <Text variant="body" numberOfLines={1}>
          {tx.merchantName}
        </Text>
        <View style={styles.metaRow}>
          <Badge label={category.name} color={category.color} />
          {suggestedCategory && <View style={styles.suggestionDot} />}
          {statusNote && (
            <Text variant="micro" color={Colors.text4}>
              {statusNote}
            </Text>
          )}
        </View>
      </View>
      <Amount amount={tx.amount} />
    </Pressable>
  );

  // Swipe actions are a real gesture surface (react-native-gesture-handler),
  // not worth wiring on web where there's no touch swipe convention -- and
  // skipped entirely for rows with nothing to offer (a linked transaction
  // that's already categorized, or a caller that didn't opt into delete).
  if (Platform.OS === 'web' || (!suggestedCategory && !(canDelete && onDelete))) {
    return <Wrapper {...wrapperProps}>{row}</Wrapper>;
  }

  return (
    <Wrapper {...wrapperProps}>
      <Swipeable
        ref={swipeRef}
        overshootRight={false}
        rightThreshold={40}
        renderRightActions={() => (
          <View style={{ flexDirection: 'row' }}>
            {suggestedCategory && onApplySuggestion && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  swipeRef.current?.close();
                  onApplySuggestion(suggestion!);
                }}
                style={[styles.swipeAction, { backgroundColor: Colors.orangeSoft }]}
              >
                <CategoryIcon id={suggestedCategory.id} emoji={suggestedCategory.emoji} color={suggestedCategory.color} size={22} />
                <Text variant="micro" weight="semibold" color={Colors.orange} numberOfLines={1} style={{ marginTop: 4 }}>
                  {suggestedCategory.name}
                </Text>
              </Pressable>
            )}
            {canDelete && onDelete && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  swipeRef.current?.close();
                  onDelete();
                }}
                style={[styles.swipeAction, { backgroundColor: Colors.redSoft }]}
              >
                <Icon name="trash" size={18} color={Colors.red} />
                <Text variant="micro" weight="semibold" color={Colors.red} style={{ marginTop: 4 }}>
                  Delete
                </Text>
              </Pressable>
            )}
          </View>
        )}
      >
        {row}
      </Swipeable>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    marginHorizontal: -Spacing.sm,
    borderRadius: 10,
  },
  rowPressed: { backgroundColor: Colors.surfaceCard },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  suggestionDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.orange },
  swipeAction: { width: 72, alignItems: 'center', justifyContent: 'center' },
});
